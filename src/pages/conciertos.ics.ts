import type { APIContext } from "astro";
import { createDb, concerts } from "../lib/db";
import { asc } from "drizzle-orm";
import type { Concert } from "../lib/schema";

const SITE = "https://legacyoftheseas.pages.dev";
const DOMAIN = "legacyoftheseas.pages.dev";

// RFC 5545 requires CRLF line endings for every line in the file.
const CRLF = "\r\n";

/**
 * Fold a single logical iCalendar line to the 75-octet limit (RFC 5545 §3.1).
 * Continuation lines start with a single space. We fold on UTF-8 byte
 * boundaries (never inside a multi-byte character) since the spec measures
 * octets, not JS string code units.
 */
function foldLine(line: string): string {
  const bytes = Buffer.from(line, "utf-8");
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
    chunks.push(bytes.subarray(start, end).toString("utf-8"));
    start = end;
    limit = 74; // continuation lines lose 1 octet to the leading space
  }
  return chunks.join(CRLF + " ");
}

/**
 * Escape TEXT-type values per RFC 5545 §3.3.11: backslash, comma, semicolon
 * and newline must be backslash-escaped. Order matters — backslashes first.
 */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

function icsLine(name: string, value: string): string {
  return foldLine(`${name}:${value}`);
}

/** Format a Date as UTC basic format for DTSTAMP/DTSTART-with-time: YYYYMMDDTHHMMSSZ */
function formatUtcStamp(d: Date): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** Format a Date as an all-day VALUE=DATE: YYYYMMDD (uses UTC fields since we parsed the stored date as UTC-midnight). */
function formatDateOnly(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function buildEvent(concert: Concert, dtstamp: string): string {
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

export async function GET(context: APIContext): Promise<Response> {
  const runtimeEnv = (context.locals as any).runtime?.env as Record<string, string> | undefined;
  const db = createDb(runtimeEnv);

  // Include BOTH past and upcoming concerts. A calendar feed is meant to be
  // subscribed to once (webcal://) and left alone — fans who subscribe
  // months from now should still see the band's concert history in their
  // calendar app, and pruning past events would make previously-synced
  // entries vanish on next refresh in most calendar clients. Sort ascending
  // by date so the ICS body reads chronologically (VEVENT order has no
  // semantic meaning to calendar clients, but it makes the raw file
  // readable for debugging).
  const allConcerts = await db.select().from(concerts).orderBy(asc(concerts.date));

  // DTSTAMP must be derived from the DATA, not from the clock. With
  // `new Date()` every request produced a fresh DTSTAMP, so a subscribed
  // client re-synced every event on every poll even when nothing had
  // changed. Fall back to the request time only when a concert carries no
  // timestamp at all (the columns default to '').
  const requestStamp = formatUtcStamp(new Date());
  const stampFor = (c: { updatedAt?: string | null; createdAt?: string | null }): string => {
    const raw = c.updatedAt || c.createdAt || "";
    const parsed = raw ? new Date(raw) : null;
    return parsed && !isNaN(parsed.getTime()) ? formatUtcStamp(parsed) : requestStamp;
  };

  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push(icsLine("PRODID", "-//Legacy of the Seas//Conciertos//ES"));
  lines.push("CALSCALE:GREGORIAN");
  lines.push(icsLine("X-WR-CALNAME", "Legacy of the Seas - Conciertos"));
  lines.push(icsLine("X-WR-CALDESC", "Próximos y pasados conciertos de Legacy of the Seas"));

  for (const concert of allConcerts) {
    lines.push(buildEvent(concert, stampFor(concert)));
  }

  lines.push("END:VCALENDAR");

  const body = lines.join(CRLF) + CRLF;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="conciertos-legacy-of-the-seas.ics"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
