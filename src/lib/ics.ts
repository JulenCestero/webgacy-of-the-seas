import type { Concert } from "./schema";

export const DOMAIN = "legacyoftheseas.pages.dev";

// RFC 5545 requires CRLF line endings for every line in the file.
export const CRLF = "\r\n";

// TextEncoder/TextDecoder, not Buffer: this runs on Cloudflare Workers, where
// the Node Buffer global does not exist without the nodejs_compat flag (which
// this project does not set). Using Buffer here built fine and worked under
// the Node dev server, then threw a 500 in production — the dev/prod runtime
// gap is invisible to `astro build`, so stick to web-standard APIs in
// anything under src/pages (and anything it imports) that ships to the edge.
const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();

/**
 * Fold a single logical iCalendar line to the 75-octet limit (RFC 5545 §3.1).
 * Continuation lines start with a single space. We fold on UTF-8 byte
 * boundaries (never inside a multi-byte character) since the spec measures
 * octets, not JS string code units.
 */
export function foldLine(line: string): string {
  const bytes = utf8Encoder.encode(line);
  if (bytes.length <= 75) return line;

  const chunks: string[] = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Don't split a multi-byte UTF-8 sequence: back off while the next byte
    // is a continuation byte (10xxxxxx, i.e. 0x80-0xBF).
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) {
      end--;
    }
    chunks.push(utf8Decoder.decode(bytes.subarray(start, end)));
    start = end;
    limit = 74; // continuation lines lose 1 octet to the leading space
  }
  return chunks.join(CRLF + " ");
}

/**
 * Escape TEXT-type values per RFC 5545 §3.3.11: backslash, comma, semicolon
 * and newline must be backslash-escaped. Order matters — backslashes first.
 */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

export function icsLine(name: string, value: string): string {
  return foldLine(`${name}:${value}`);
}

/** Format a Date as UTC basic format for DTSTAMP/DTSTART-with-time: YYYYMMDDTHHMMSSZ */
export function formatUtcStamp(d: Date): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** Format a Date as an all-day VALUE=DATE: YYYYMMDD (uses UTC fields since we parsed the stored date as UTC-midnight). */
export function formatDateOnly(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

/** Concerts with no `timezone` recorded (pre-migration-0001 rows written by
 * a path that skipped the admin form) fall back to this — same precedent as
 * bandsintown-csv.ts's DEFAULT_TIMEZONE. */
export const DEFAULT_TIMEZONE = "Europe/Madrid";

/** Gigs have no recorded end time in the DB. Two hours is a reasonable
 * estimate for a live show and gives calendar apps a sane block instead of
 * a zero-length event. */
export const DEFAULT_EVENT_DURATION_MS = 2 * 60 * 60 * 1000;

/**
 * Offset (in ms) between a UTC instant and the wall-clock time that same
 * instant reads as in `timeZone`, expressed as
 * `Date.UTC(wall-clock fields) - instant.getTime()`. Built on
 * `Intl.DateTimeFormat`, which Cloudflare Workers ship with full ICU data
 * for (unlike `Buffer`/`fs`/`path`, this is a real Web-standard API
 * available on the edge — no nodejs_compat flag needed).
 */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = dtf.formatToParts(instant).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  const wallAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return wallAsUtc - instant.getTime();
}

/**
 * Convert a wall-clock local time ("YYYY-MM-DD" + "HH:MM", e.g. 21:30 in
 * Europe/Madrid) to the UTC instant it represents. Europe/Madrid is
 * UTC+1 (CET) in winter and UTC+2 (CEST) in summer, so a naive
 * `new Date(date + "T" + time + "Z")` would be off by 1-2 hours depending
 * on the season — this does a proper local -> UTC conversion using the
 * timezone's real offset instead of assuming a fixed one.
 *
 * Algorithm: treat the wall-clock string as if it were already UTC to get
 * a first-guess instant, look up what offset `timeZone` has *at that
 * guessed instant*, and correct by it. Re-check the offset at the
 * corrected instant in case the first guess landed on the other side of a
 * DST transition (only matters for a handful of hours twice a year; a
 * second pass makes the result correct even then).
 */
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const naiveUtcMs = new Date(`${dateStr}T${timeStr}:00.000Z`).getTime();

  const offset1 = tzOffsetMs(new Date(naiveUtcMs), timeZone);
  const guess2Ms = naiveUtcMs - offset1;

  const offset2 = tzOffsetMs(new Date(guess2Ms), timeZone);
  const realMs = offset2 === offset1 ? guess2Ms : naiveUtcMs - offset2;

  return new Date(realMs);
}

/**
 * DTSTAMP must be derived from the DATA, not from the clock. With
 * `new Date()` every request produced a fresh DTSTAMP, so a subscribed
 * client re-synced every event on every poll even when nothing had
 * changed. Fall back to the request time only when a concert carries no
 * timestamp at all (the columns default to '').
 */
export function stampFor(
  c: { updatedAt?: string | null; createdAt?: string | null },
  requestStamp: string,
): string {
  const raw = c.updatedAt || c.createdAt || "";
  const parsed = raw ? new Date(raw) : null;
  return parsed && !isNaN(parsed.getTime()) ? formatUtcStamp(parsed) : requestStamp;
}

export function buildEvent(concert: Concert, dtstamp: string): string {
  // `concerts.date` is stored as a bare "YYYY-MM-DD" (see schema.ts comment
  // and migrate.ts/admin forms); `startTime` ("HH:MM") and `timezone` (IANA)
  // are the columns added in migration 0001 for the Bandsintown CSV export
  // (see bandsintown-csv.ts). Rows never re-saved through a path that skips
  // the admin form could still have a null/empty startTime despite the
  // migration's '20:00' default, so fall back to an all-day event rather
  // than inventing a time.
  const datePart = concert.date.slice(0, 10);
  const startTime = concert.startTime?.slice(0, 5) ?? "";
  const hasTime = /^\d{2}:\d{2}$/.test(startTime);

  const lines: string[] = [];
  lines.push("BEGIN:VEVENT");
  lines.push(icsLine("UID", `${concert.id}@${DOMAIN}`));
  lines.push(icsLine("DTSTAMP", dtstamp));

  if (hasTime) {
    const timeZone = concert.timezone || DEFAULT_TIMEZONE;
    const start = zonedTimeToUtc(datePart, startTime, timeZone);
    const end = new Date(start.getTime() + DEFAULT_EVENT_DURATION_MS);
    lines.push(icsLine("DTSTART", formatUtcStamp(start)));
    lines.push(icsLine("DTEND", formatUtcStamp(end)));
  } else {
    // No usable start time: all-day event. Parse as UTC midnight so the
    // calendar date doesn't shift a day depending on the reader's/server's
    // local timezone.
    const d = new Date(`${datePart}T00:00:00Z`);
    lines.push(icsLine("DTSTART;VALUE=DATE", formatDateOnly(d)));
  }

  lines.push(icsLine("SUMMARY", escapeText(concert.title)));

  const location = [concert.venue, concert.city].filter(Boolean).join(", ");
  if (location) lines.push(icsLine("LOCATION", escapeText(location)));

  if (concert.description) {
    lines.push(icsLine("DESCRIPTION", escapeText(concert.description)));
  }

  if (concert.ticketUrl) {
    lines.push(icsLine("URL", escapeText(concert.ticketUrl)));
  }

  lines.push("END:VEVENT");
  return lines.join(CRLF);
}

/**
 * Build a full VCALENDAR document (CRLF-joined, trailing CRLF) wrapping the
 * given concerts as VEVENTs. Shared by the full subscription feed
 * (conciertos.ics.ts) and the per-concert download (conciertos/[id].ics.ts)
 * so folding/escaping/date logic can never drift between the two.
 */
export function buildCalendar(
  concertList: Concert[],
  opts: { calname: string; caldesc: string },
): string {
  const requestStamp = formatUtcStamp(new Date());

  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push(icsLine("PRODID", "-//Legacy of the Seas//Conciertos//ES"));
  lines.push("CALSCALE:GREGORIAN");
  lines.push(icsLine("X-WR-CALNAME", opts.calname));
  lines.push(icsLine("X-WR-CALDESC", opts.caldesc));

  for (const concert of concertList) {
    lines.push(buildEvent(concert, stampFor(concert, requestStamp)));
  }

  lines.push("END:VCALENDAR");

  return lines.join(CRLF) + CRLF;
}

/**
 * Derive a safe ASCII filename fragment (no spaces, no non-ASCII) from
 * arbitrary text, for use in a Content-Disposition filename. Strips
 * diacritics instead of dropping accented letters outright so "Kutxa
 * Kritika" survives recognizably instead of collapsing to a shorter blob.
 */
const COMBINING_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

export function slugifyAscii(input: string): string {
  return input
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "") // strip combining diacritical marks
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
