/**
 * Helpers for the Bandsintown Track/RSVP widget embed (WEB-03, D-07).
 *
 * The `/e/<id>` URL shape below is the one documented by Bandsintown's own
 * API, but it has never been checked against a real `bandsintown_url`
 * captured by the bot (Assumption A2, 03-RESEARCH.md) — that verification
 * lands in 03-06 with the first real capture.
 */

export const BIT_ARTIST_NAME = "id_15556909";

export const BIT_WIDGET_SCRIPT_URL = "https://widgetv3.bandsintown.com/main.min.js";

/**
 * Extract the numeric Bandsintown event ID from a captured event URL
 * (e.g. "https://www.bandsintown.com/e/106723499?came_from=267" -> "106723499").
 *
 * Fail-closed by design (T-03-08): returns null on any URL that doesn't
 * contain a `/e/<digits>` path segment, and returns ONLY the matched digits
 * on success — no other fragment of the stored URL ever reaches the
 * returned value, so nothing from the DB can inject extra HTML attributes
 * downstream.
 *
 * extractBitEventId("https://www.bandsintown.com/e/106723499?came_from=267") === "106723499"
 * extractBitEventId("https://www.bandsintown.com/a/123") === null
 */
export function extractBitEventId(url: string): string | null {
  const match = url.match(/\/e\/(\d+)(?:[/?#]|$)/);
  return match ? match[1] : null;
}
