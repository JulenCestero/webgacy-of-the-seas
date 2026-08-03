# SEO Weekly Loop — Progress Log

This file is the persistent memory for the automated weekly SEO improvement
pipeline (analyst → implementer → verifier, run via Cronicle). Each entry
below is one weekly run: what was checked, what GSC showed, what was
proposed/changed, and what's explicitly left for a future run. New runs
should read this file first so they don't repeat or regress prior checks.

This file IS committed to git (unlike `seo-loop/.proposal-*.md`, which is a
gitignored per-run working artifact).

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
