import type { APIContext } from "astro";
import { createDb, concerts } from "../../lib/db";
import { eq } from "drizzle-orm";
import { buildCalendar, slugifyAscii } from "../../lib/ics";

/**
 * Per-concert calendar download: a fan looking at one concert wants "add
 * this one to my calendar", distinct from the full /conciertos.ics
 * subscription feed (webcal://, upcoming concerts, meant to be subscribed
 * to once and stay in sync). This endpoint returns a single-VEVENT .ics
 * file as an attachment.
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

  // Embargo por announce_at (D3, WEB-01): un id es adivinable (YYYYMMDD-slug,
  // contrato publicado D5) y responde con EXACTAMENTE el mismo cuerpo/cabecera
  // que el branch de id inexistente — un tercero no puede distinguir "no
  // existe" de "embargado", misma política que el guard de pasados de abajo.
  const nowIso = new Date().toISOString();
  if ((concert.announceAt ?? "") > nowIso) {
    return new Response("Concierto no encontrado.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // Past concerts get no calendar file. ConcertCard only renders the button
  // for upcoming ones, but the URL is guessable and links get shared, so the
  // rule is enforced here too rather than only hidden in the UI — same policy
  // as the subscription feed and the Bandsintown CSV: calendars are for gigs
  // you can still attend. Compared as YYYY-MM-DD strings (how `date` is
  // stored), so a gig happening today still counts as upcoming.
  const today = new Date().toISOString().slice(0, 10);
  if ((concert.date ?? "") < today) {
    return new Response("Este concierto ya ha pasado.", {
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
