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
  const raw = concert.date;
  // `concerts.date` is stored as an ISO date string (see schema.ts comment).
  // In practice (see migrate.ts / admin forms) it is written as a bare
  // "YYYY-MM-DD" day with no time component — conciertos.astro treats it the
  // same way (`new Date(concert.date)` is only used for display formatting,
  // never compared with time-of-day precision). We detect a time component
  // defensively: if present, emit a real timed event; Turso stores no
  // timezone info for it, and this band's shows are all in Europe/Madrid, so
  // a bare "T..." with no "Z"/offset is treated as Europe/Madrid local time
  // and converted to UTC explicitly rather than left as an ambiguous
  // floating time.
  const hasTime = /T\d{2}:\d{2}/.test(raw);

  const lines: string[] = [];
  lines.push("BEGIN:VEVENT");
  lines.push(icsLine("UID", `${concert.id}@${DOMAIN}`));
  lines.push(icsLine("DTSTAMP", dtstamp));

  if (hasTime) {
    // Has an explicit time. If it already carries an offset/Z, Date parses
    // it correctly to an absolute instant; if it's a bare local datetime,
    // JS `Date` parses it as local-to-the-server time which is wrong on a
    // UTC build server — so we only trust it when it's unambiguous (has Z
    // or +hh:mm). Otherwise fall back to treating the date part as a
    // Europe/Madrid all-day event to avoid emitting a wrong absolute time.
    const hasOffset = /Z$|[+-]\d{2}:?\d{2}$/.test(raw);
    if (hasOffset) {
      const d = new Date(raw);
      lines.push(icsLine("DTSTART", formatUtcStamp(d)));
    } else {
      // Bare local datetime with no offset info: treat the wall-clock time
      // as Europe/Madrid. Europe/Madrid is UTC+1 (CET) or UTC+2 (CEST); we
      // don't have a timezone DB here, so approximate using the JS engine's
      // own local-time parsing is unreliable on a UTC server. Since our own
      // admin UI never actually writes a time component today, treat this
      // conservatively as an all-day event on the date portion instead of
      // guessing an offset.
      const datePart = raw.slice(0, 10);
      const d = new Date(`${datePart}T00:00:00Z`);
      lines.push(icsLine("DTSTART;VALUE=DATE", formatDateOnly(d)));
    }
  } else {
    // No time component in the stored value: all-day event.
    // Parse as UTC midnight so the calendar date doesn't shift a day
    // depending on the reader's/server's local timezone.
    const d = new Date(`${raw}T00:00:00Z`);
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
