import type { APIContext } from "astro";
import { createDb, concerts } from "../lib/db";
import { asc } from "drizzle-orm";
import { buildCalendar } from "../lib/ics";

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

  const body = buildCalendar(allConcerts, {
    calname: "Legacy of the Seas - Conciertos",
    caldesc: "Próximos y pasados conciertos de Legacy of the Seas",
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
