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
