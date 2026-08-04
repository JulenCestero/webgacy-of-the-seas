import type { APIContext } from "astro";
import { createDb, concerts } from "../../lib/db";
import { eq } from "drizzle-orm";
import { buildCalendar, slugifyAscii } from "../../lib/ics";

/**
 * Per-concert calendar download: a fan looking at one concert wants "add
 * this one to my calendar", distinct from the full /conciertos.ics
 * subscription feed (webcal://, all concerts, meant to be subscribed to
 * once). This endpoint returns a single-VEVENT .ics file as an attachment.
 */
export async function GET(context: APIContext): Promise<Response> {
  const { id } = context.params;

  if (!id) {
    return new Response("Concierto no encontrado.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const runtimeEnv = (context.locals as any).runtime?.env as Record<string, string> | undefined;
  const db = createDb(runtimeEnv);

  const result = await db.select().from(concerts).where(eq(concerts.id, id)).limit(1);
  const concert = result[0];

  if (!concert) {
    return new Response("Concierto no encontrado.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const body = buildCalendar([concert], {
    calname: concert.title,
    caldesc: [concert.venue, concert.city].filter(Boolean).join(", "),
  });

  // Safe ASCII filename: date + slugified title, no raw UTF-8/spaces so it
  // survives the Content-Disposition header unquoted-safe across browsers.
  const datePart = concert.date.slice(0, 10);
  const slug = slugifyAscii(concert.title) || slugifyAscii(`${concert.venue}-${concert.city}`) || "concierto";
  const filename = `${datePart}-${slug}.ics`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
