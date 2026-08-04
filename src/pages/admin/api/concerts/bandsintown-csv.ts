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

// ASSUMPTIONS — these are not in our database at all. Bandsintown marks
// Country*/Region*/Timezone*/Start Time* as required, but our `concerts`
// table only has venue/city/date (see schema.ts). Legacy of the Seas is
// based in Donostia, so we default every row to Spain/Europe-Madrid/20:00.
// If the band ever plays outside Spain, these defaults will be WRONG for
// that row and must be hand-corrected before upload — the admin UI link
// carries a visible warning about this (see admin/conciertos/index.astro).
const DEFAULT_COUNTRY = "Spain";
const DEFAULT_TIMEZONE = "Europe/Madrid";
const DEFAULT_START_TIME = "20:00";
// Region* (province/state): the real Bandsintown template's own Berlin
// example row (Germany) ships with Region* EMPTY despite the asterisk, so
// the field is evidently optional in practice for at least some countries.
// We don't store a province per concert, and Donostia-based shows are
// overwhelmingly in a single region (Gipuzkoa) that adds no disambiguating
// value here — so we leave Region* empty for every row rather than guess,
// consistent with what the template itself demonstrates is tolerated.
const DEFAULT_REGION = "";

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
    "Country*": DEFAULT_COUNTRY,
    "Address": "",
    "City*": concert.city,
    "Region*": DEFAULT_REGION,
    "Postal Code": "",
    "Timezone*": DEFAULT_TIMEZONE,
    "Start Date* (yyyy-mm-dd)": toStartDate(concert.date),
    "Start Time* (HH:MM)": DEFAULT_START_TIME,
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
  // if they were new. (The /conciertos.ics feed does the opposite on purpose:
  // a subscribed calendar keeps its history.) Compared as YYYY-MM-DD strings,
  // which is how `date` is stored, so today's gig still counts as upcoming.
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = allConcerts.filter((c) => (c.date ?? "") >= today);

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
