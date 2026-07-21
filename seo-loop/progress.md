# SEO Loop — Progress Log

This file tracks the weekly automated SEO improvement pass for the Legacy of
the Seas website. Each run appends a dated entry: what was checked, what was
changed, what was deliberately left for later, and any blockers. Read the
latest entry before starting a new run so work doesn't repeat or regress
prior fixes (see also `docs/seo-audit.md` for the last full manual audit and
`CLAUDE.md` for perf-optimization history).

---

## 2026-07-21

**Checked:** `docs/seo-audit.md` (2026-01-29 manual audit) against current
repo state, plus a fresh pass using the `seo-audit` skill checklist
(crawlability, sitemap, meta tags, headings, alt text, internal linking,
Schema.org).

**Already fixed since the last manual audit (no action needed):**
- Contact form now uses Web3Forms (`src/pages/contacto.astro`) — the old
  Netlify Forms issue flagged as critical is resolved.
- hreflang tags (`es`, `es-ES`, `x-default`) present in `BaseLayout.astro`.
- Sitemap already includes individual `/archivo/[slug]` posts (dynamic
  `src/pages/sitemap.xml.ts`, not the static integration the old audit
  assumed).

**Changed this run:**
1. **Sitemap `<lastmod>`** (`src/pages/sitemap.xml.ts`) — added `<lastmod>`
   to post entries only, sourced from real DB timestamps
   (`updatedAt || date`). This was flagged as a HIGH-priority gap in the
   2026-01-29 audit and was never actioned. Deliberately did NOT add
   `lastmod` to the 6 static pages — there's no real per-page modification
   timestamp for them, and a code-review pass caught that computing it as
   `new Date()` at request time would make it change every render, which
   Google's own guidance says is worse than omitting the field (crawlers
   distrust a lastmod that always reads "now"). Omitting it there is more
   honest than faking one.
2. **Internal link: archivo post → conciertos**
   (`src/pages/archivo/[slug].astro`) — added a footer CTA linking to
   `/conciertos`. Closes the "internal linking between /archivo posts and
   /conciertos" gap called out in the audit's content recommendations.
3. **Internal link: past conciertos → archivo**
   (`src/pages/conciertos.astro`) — added a reciprocal link from the past
   concerts section to `/archivo`, so both directions of that internal link
   opportunity exist now.

**Left for later (not done this run, keeping the change small):**
- Sitemap URL in `docs/seo-audit.md` still references the old
  `sitemap-index.xml` path from before the site moved to a dynamic
  `sitemap.xml` route — the doc itself is stale, `robots.txt` already
  correctly points at `/sitemap.xml`. Worth a docs cleanup pass, not
  urgent.
- Content gaps flagged in the audit (more archive posts, discography page,
  song lyrics) are content work, not technical SEO — left for the band/dev
  as before.
- No Google Search Console access is configured for this project (no
  GSC API/MCP). Could not validate indexation status, keyword impact, or
  whether the lastmod change gets picked up by Google — numbers below are
  not fabricated, this is a plain gap.

**Blockers:** none for the changes made. GSC access remains the only
missing piece for validating real-world impact of any SEO work in this
loop, past or future.

**Build:** `npm run build` passed clean after all three changes.

**Note on repo state:** at the start of this run, local `master` was 13
commits ahead of `origin/master` (unpushed perf work from a prior session,
not part of this loop). This branch was cut from that local `master`, so
its diff against `origin/master` will include those prior commits too —
that's pre-existing work, not something this run authored or is
responsible for pushing to master directly.
