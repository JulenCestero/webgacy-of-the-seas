import type { APIContext } from "astro";
import { createDb, concerts } from "../lib/db";
import { and, asc, gte, lte } from "drizzle-orm";
import { buildCalendar } from "../lib/ics";

export async function GET(context: APIContext): Promise<Response> {
  const runtimeEnv = (context.locals as any).runtime?.env as Record<string, string> | undefined;
  const db = createDb(runtimeEnv);

  // Upcoming concerts ONLY — explicit product decision. A brand-new
  // subscriber who adds this feed shouldn't have months (or years) of past
  // gigs dumped into their agenda; that's noise nobody asked for. Compared
  // as YYYY-MM-DD strings, same as bandsintown-csv.ts, since `date` is
  // stored as a bare "YYYY-MM-DD" with no time component — today's gig
  // still counts as upcoming.
  //
  // Known trade-off, accepted on purpose: most calendar clients (Google
  // Calendar, Outlook, Apple Calendar) resync a subscribed feed by
  // recomputing the full event list on every poll. That means once a
  // concert's date passes and this query drops it, it disappears from
  // subscribers' calendars on their next refresh too — it doesn't stay
  // behind as history. If we ever want a permanent record for fans, that
  // belongs in /archivo, not in the live subscription feed.
  const today = new Date().toISOString().slice(0, 10);
  // Embargo por announce_at (D3, WEB-01): mismo shape que conciertos.astro,
  // se añade al filtro de fecha existente, no lo sustituye (RESEARCH
  // Pitfall 4). '' (filas legacy) compara <= cualquier ISO real.
  const nowIso = new Date().toISOString();
  const upcomingConcerts = await db
    .select()
    .from(concerts)
    .where(and(gte(concerts.date, today), lte(concerts.announceAt, nowIso)))
    .orderBy(asc(concerts.date));

  const body = buildCalendar(upcomingConcerts, {
    calname: "Legacy of the Seas - Conciertos",
    caldesc: "Próximos conciertos de Legacy of the Seas",
  });

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="conciertos-legacy-of-the-seas.ics"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
