# SEO Weekly Loop — Progress Log

This file is the persistent memory for the automated weekly SEO improvement
pipeline (analyst → implementer → verifier, run via Cronicle). Each entry
below is one weekly run: what was checked, what GSC showed, what was
proposed/changed, and what's explicitly left for a future run. New runs
should read this file first so they don't repeat or regress prior checks.
See also `docs/seo-audit.md` for the last full manual audit and `CLAUDE.md`
for perf-optimization history.

This file IS committed to git (unlike `seo-loop/.proposal-*.md`, which is a
gitignored per-run working artifact).

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

---

## 2026-07-22

**Checked:** `origin/master` (already has last week's sitemap `lastmod` and
archivo<->conciertos internal link work merged), `docs/seo-audit.md` claims
against current file content, `public/robots.txt`,
`src/pages/sitemap.xml.ts`, `src/layouts/BaseLayout.astro` (meta tags, OG
tags, WebSite/MusicGroup schema), `src/pages/conciertos.astro` (MusicEvent
schema), `src/pages/archivo/[slug].astro` (BlogPosting schema, BreadcrumbList,
OG image), `src/pages/tienda.astro`, `src/pages/nosotros.astro`,
`src/pages/archivo/index.astro`, and alt-text across
`MemberCard.astro`/`MerchCard.astro`/`Hero.astro`/`Lightbox.astro`.

**Already fine / no action needed:**
- `robots.txt` correctly points at `/sitemap.xml` (the audit doc's
  `sitemap-index.xml` reference is just stale prose, not a real bug).
- `MusicGroup.sameAs` in `BaseLayout.astro` already covers all 7 current
  social links from this repo's `CLAUDE.md` (Instagram, Facebook, YouTube,
  Spotify, Bandcamp, TikTok, X/Twitter) — nothing missing there.
- `WebSite` schema has no `SearchAction` — deliberately left out, the site
  has no actual on-site search page/endpoint, so adding one would be a
  fabricated schema claim, not a real capability.
- Alt text is already descriptive everywhere except archivo gallery images
  (`Foto 1`, `Foto 2`...) — decorative images (`Hero.astro` background,
  empty `Lightbox`/`MemberModal` placeholders) correctly use `alt=""`.
- Heading hierarchy on `tienda.astro` and `nosotros.astro` is already
  correct (single `h1`, `h2` sections, no skipped levels).

**Changed this run:**
1. **Per-post OG image for archive articles**
   (`src/pages/archivo/[slug].astro`) — passed `image={post.image ||
   undefined}` to `BaseLayout` instead of relying on the sitewide default
   `og-image.jpg`. Every archive post was sharing the same generic OG
   image for social shares/link previews even though `BlogPosting.image`
   in the same file's schema already used the real per-post image. Used
   `|| undefined` specifically (not a bare pass-through) because
   `BaseLayout`'s `image` prop default only applies to `undefined`, not
   `null` — `post.image` is nullable, and passing a bare `null` through
   would have rendered `og:image` as literal `.../null` for posts without
   an image. Verified the fallback logic with a small Node repro before
   committing (null → `/og-image.jpg`, real path → per-post image).
2. **MusicEvent schema completeness** (`src/pages/conciertos.astro`) —
   added `eventStatus: "https://schema.org/EventScheduled"` and
   `eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode"`
   to the per-concert schema. Both are Google-recommended (not just
   required-minimum) Event structured-data properties; sold-out status is
   already expressed separately via `offers.availability` and wasn't
   coupled to `eventStatus` (sold out is not the same as cancelled).
3. **Internal link: tienda → archivo** (`src/pages/tienda.astro`) — added
   a line under the contact CTA linking to `/archivo`, closing the
   tienda<->archivo internal-linking gap called out as a candidate
   category for this run. (Reciprocal archivo->conciertos and
   conciertos->archivo links were already added in the 2026-07-21 run;
   this extends the internal link graph to the tienda page, which
   previously had no outbound link besides `/contacto`.)

**Left for later (not done this run, keeping the change small):**
- No page-specific OG image for the six static pages
  (conciertos/nosotros/tienda/archivo index/contacto/home) — they all
  still share `og-image.jpg`. Doing this well would need a per-page hero
  image asset for each, which is a content/design task, not a quick code
  fix.
- Archive gallery image alt text (`Foto 1`, `Foto 2`...) could be made
  more descriptive (e.g. include the post title), but it's a minor
  accessibility/SEO polish, not a functional gap — deferred to keep this
  run to 3 changes.
- `docs/seo-audit.md`'s stale `sitemap-index.xml` reference still hasn't
  been cleaned up (noted again, still low priority, still not urgent).
- No Google Search Console access is configured for this project — same
  gap as last week, cannot validate real-world indexation/impact of any
  change in this loop.

**Blockers:** none. `npm run build` passed clean after all three changes.

**Build:** `npm run build` passed clean (server/SSR build via
`@astrojs/cloudflare` adapter, no errors or new warnings beyond the
pre-existing Cloudflare `sharp`/browserslist notices).

---

## 2026-08-03 — Analyst run

**GSC access**: Working (service account `gsc-service-account.json`, JWT
auth via `scripts/verify-gsc-credential.mjs` flow). Note: outbound network
calls to googleapis.com require `dangerouslyDisableSandbox: true` in the
Bash tool in this environment — plain sandboxed calls fail with a generic
`fetch failed`/connect-timeout, not an auth error.

**GSC findings (28-day window)**:
- Homepage (`/`) is indexed (`Submitted and indexed`, last crawl
  2026-07-25). 8 impressions, 0 clicks, avg position 3.375, sole matched
  query "legacy of the seas" (3 impressions, position 3.33).
- All 6 other tracked URLs (`/conciertos/`, `/nosotros/`, `/tienda/`,
  `/archivo/`, `/contacto/`, `/archivo/2024-10-04-lanzamiento-leyendas/`)
  return `verdict: NEUTRAL`, `coverageState: URL is unknown to Google` —
  Google has not crawled/indexed them at all, 6+ months after the site
  went live on pages.dev.
- Sitemap (`https://legacyoftheseas.pages.dev/sitemap.xml`) is correctly
  submitted, 0 errors, 0 warnings, and correctly lists all 7 URLs above
  (including the one blog post, with `<lastmod>`). robots.txt correctly
  points to it. So this isn't a sitemap-syntax or robots-block problem —
  it reads as a crawl-budget/authority problem (new domain, ~0 backlinks),
  which is not something a code change fixes.
- **Stale doc note**: `docs/seo-audit.md` (last full manual audit,
  2026-01-29) references sitemap paths `sitemap-index.xml` / `sitemap-0.xml`
  which now 404 — the real path is `/sitemap.xml` (single flat sitemap, not
  an index). The doc is out of date on this point; not fixing the doc here
  since this run is analysis-only, flagging for whoever next touches that
  file.

**On-page/technical pass**: Checked against `docs/seo-audit.md` priorities
and did not re-propose anything already marked done in CLAUDE.md (H1 fix,
404 page, BreadcrumbList, Product/MusicEvent schema @id, footer /tienda
link — all already shipped per CLAUDE.md's 2026-02-03 changelog).
Confirmed all 6 main sections are linked from every page via
`Header.astro`'s nav (not orphan pages) — the "unknown to Google" pages
above are one click from the indexed homepage, so this isn't an internal-
linking/crawlability defect.

**Proposed this run** (see `.proposal-2026-08-03.md`, gitignored working
artifact — not duplicated here in full):
1. Homepage `<title>` duplicates the brand name (`...Metal Sinfónico |
   Legacy of the Seas` — brand appears twice) since the 2026-02-03 title
   change in `src/pages/index.astro`. Every other page is fine.
2. `src/pages/archivo/index.astro` (the listing page) has zero JSON-LD,
   unlike every sibling listing/detail page in the site.
3. No internal cross-linking exists between `/archivo` and `/conciertos`
   in either direction.

**Left for future runs**:
- Re-check URL Inspection verdicts in a few weeks — if pages are still
  "unknown to Google" after another month+, that's worth escalating as a
  manual GSC "request indexing" action per page (not a code fix, so out of
  scope for this pipeline's file-editing stages) or investigating backlink
  acquisition.
- `docs/seo-audit.md` itself has stale sitemap filenames — could be updated
  by a future run if that file is ever otherwise touched.
- ~~Hreflang tags recommendation from the 2026-01-29 audit~~ — confirmed
  already implemented (`hreflang="es"`, `es-ES`, `x-default` all present,
  seen live on the site's 404 page markup during this run). No action
  needed, don't re-propose.

---

## 2026-08-03

**Implemented** (`seo-loop/.proposal-2026-08-03.md`, all 3 proposals, no
deviations — proposal matched the live files exactly):

1. **Homepage title duplication fixed** — `src/pages/index.astro`:
   `BaseLayout` `title` prop changed from `"Legacy of the Seas - Metal
   Sinfónico"` to `"Metal Sinfónico desde Donostia"`. `BaseLayout.astro`
   still appends ` | Legacy of the Seas`, so the rendered `<title>` is now
   `Metal Sinfónico desde Donostia | Legacy of the Seas` (brand appears
   once, not twice). `description` prop and `BaseLayout.astro`'s
   title-template logic untouched, per guardrails.
2. **Archivo listing schema added** — `src/pages/archivo/index.astro`: added
   `CollectionPage` + `ItemList` (one entry per post: url + name) +
   `BreadcrumbList` JSON-LD in an `@graph`, following the exact pattern
   already used in `archivo/[slug].astro`. `archivo/[slug].astro` itself was
   not touched.
3. **Cross-links added** — `src/pages/archivo/index.astro` gained a small
   CTA section after the posts grid linking to `/conciertos`
   ("¿Quieres vernos en directo?" → "Ver próximos conciertos", using the
   existing `btn-secondary` class). `src/pages/conciertos.astro` gained a
   matching one-line link back to `/archivo` before the Newsletter CTA
   section. No new components, no restyling, no post-specific link implied
   — both links are generic per the proposal's guardrails.

**Left for later**: same open items as the analyst entry above (GSC
"unknown to Google" re-check, stale `docs/seo-audit.md` sitemap filenames)
— nothing new deferred by this implementation pass.

**Blockers**: none.

**Build result**: `npm run build` — passed (`astro build` completed,
server + client build succeeded, no errors; only pre-existing warnings:
Cloudflare/sharp runtime note, two `node:fs`/`node:path` externalization
warnings from an unrelated admin upload endpoint, and a stale
`browserslist` data notice).

---
