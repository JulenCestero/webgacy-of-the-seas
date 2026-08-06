import type { APIContext } from "astro";
import { createDb, concerts } from "../../../../lib/db";
import { asc } from "drizzle-orm";
import type { Concert } from "../../../../lib/schema";

// Bandsintown's bulk-upload template headers, verbatim and in this exact
// order (28 columns) — copied from the real template the user downloaded
// (Bandsintown_Bulk_Upload_Artists_Template.csv). Do not reorder/rename;
// Bandsintown's importer matches on header text.
const HEADERS = [
  "Artist Name",
  "Venue*",
  "Country*",
  "Address",
  "City*",
  "Region*",
  "Postal Code",
  "Timezone*",
  "Start Date* (yyyy-mm-dd)",
  "Start Time* (HH:MM)",
  "End Date",
  "End Time",
  "Streaming Link",
  "Ticket Link",
  "Ticket Type",
  "Ticket Link 2",
  "Ticket Type 2",
  "On-Sale Date",
  "On-Sale Time",
  "Lineup",
  "Event Name",
  "Event Display Format",
  "Description",
  "Schedule Date",
  "Schedule Time",
  "Do Not Announce",
  "Setlist",
  "Event Image",
] as const;

const ARTIST_NAME = "Legacy of the Seas";

// Belt-and-braces fallbacks: migration 0001 gave every existing row a real
// default, so nothing currently relies on these. They cover a row written
// by a path that skips the admin form (a manual SQL insert, a future script).
const DEFAULT_COUNTRY = "Spain";
const DEFAULT_TIMEZONE = "Europe/Madrid";
const DEFAULT_START_TIME = "20:00";

/**
 * Quote a CSV field per RFC 4180: wrap in double quotes if it contains a
 * comma, double quote, or newline, and double up any embedded quotes.
 */
function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toRow(values: string[]): string {
  return values.map(csvField).join(",");
}

/**
 * `concerts.date` is stored as a bare "YYYY-MM-DD" (see conciertos.ics.ts
 * for the same detection logic) written by the admin's `<input type="date">`
 * forms. Take the first 10 chars defensively in case a datetime ever slips
 * in, so the output always matches Bandsintown's required yyyy-mm-dd shape.
 */
function toStartDate(raw: string): string {
  return raw.slice(0, 10);
}

function concertToRow(concert: Concert): string {
  const hasTicket = Boolean(concert.ticketUrl);

  const row: Record<(typeof HEADERS)[number], string> = {
    "Artist Name": ARTIST_NAME,
    "Venue*": concert.venue,
    "Country*": concert.country || DEFAULT_COUNTRY,
    "Address": "",
    "City*": concert.city,
    // Empty is fine: Bandsintown's own template ships Region* empty for its
    // Germany example row despite the asterisk.
    "Region*": concert.region || "",
    "Postal Code": "",
    "Timezone*": concert.timezone || DEFAULT_TIMEZONE,
    "Start Date* (yyyy-mm-dd)": toStartDate(concert.date),
    // slice(0,5) for the same reason toStartDate exists: `<input type="time">`
    // yields HH:MM today, but a `step` attribute or a hand-edited DB row could
    // produce HH:MM:SS, which is not the format Bandsintown asks for.
    "Start Time* (HH:MM)": concert.startTime?.slice(0, 5) || DEFAULT_START_TIME,
    "End Date": "",
    "End Time": "",
    "Streaming Link": "",
    "Ticket Link": concert.ticketUrl || "",
    "Ticket Type": hasTicket ? "Tickets" : "",
    "Ticket Link 2": "",
    "Ticket Type 2": "",
    "On-Sale Date": "",
    "On-Sale Time": "",
    "Lineup": "",
    "Event Name": concert.title,
    "Event Display Format": "",
    "Description": concert.description || "",
    "Schedule Date": "",
    "Schedule Time": "",
    "Do Not Announce": "",
    "Setlist": "",
    "Event Image": "",
  };

  return toRow(HEADERS.map((h) => row[h]));
}

export async function GET(context: APIContext): Promise<Response> {
  const runtimeEnv = (context.locals as any).runtime?.env as Record<string, string> | undefined;
  const db = createDb(runtimeEnv);

  const allConcerts = await db.select().from(concerts).orderBy(asc(concerts.date));

  // Upcoming only. This file is for ANNOUNCING gigs on Bandsintown, so past
  // dates must not ride along — uploading them would publish stale shows as
  // if they were new. (The /conciertos.ics feed also filters to upcoming only,
  // for a different reason: so new subscribers don't get months of past gigs
  // dumped into their agenda.) Compared as YYYY-MM-DD strings, which is how
  // `date` is stored, so today's gig still counts as upcoming.
  const today = new Date().toISOString().slice(0, 10);
  // Embargo por announce_at (D3, WEB-01, RESEARCH Pitfall 4): aunque BIT-01 es
  // Fase 3, este camino de lectura ya existe hoy y sin este filtro exportaría
  // conciertos embargados a Bandsintown en cuanto la columna tenga valores
  // reales. '' (filas legacy) compara <= cualquier ISO real y sigue exportable.
  const nowIso = new Date().toISOString();
  const upcoming = allConcerts.filter(
    (c) => (c.date ?? "") >= today && (c.announceAt ?? "") <= nowIso,
  );

  // CSV line endings: Bandsintown's own template ships with CRLF, so we
  // match that rather than assuming plain LF is fine for their importer.
  const lines = [toRow([...HEADERS]), ...upcoming.map(concertToRow)];
  const csv = lines.join("\r\n") + "\r\n";

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="bandsintown-conciertos-legacy-of-the-seas.csv"',
      "Cache-Control": "no-store",
    },
  });
}
