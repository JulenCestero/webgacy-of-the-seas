// Single source for "which URLs does this site publish": the live sitemap
// (src/pages/sitemap.xml.ts, DB-driven for /archivo/<slug> posts), fetched at
// runtime. The hardcoded list below is ONLY the offline fallback — when the
// sitemap gains a URL, every consumer (gsc-snapshot, gsc-audit-check,
// indexnow-submit, seo-audit-oneshot --all) picks it up without editing code.
//
// Canonical form: no trailing slash except root. Must match sitemap.xml.ts,
// Header.astro navLinks and the canonical BaseLayout emits (see
// docs/seo-state.md for why the trailing-slash variant orphaned every page).
export const SITE = 'https://legacyoftheseas.pages.dev';

// Offline fallback only. The 6 static pages plus the one archive post known
// when this list was frozen (2026-08). Do not "keep in sync" by hand: fix the
// sitemap and let the fetch win.
export const FALLBACK_PATHS = [
  '/',
  '/conciertos',
  '/nosotros',
  '/tienda',
  '/archivo',
  '/contacto',
  '/archivo/2024-10-04-lanzamiento-leyendas',
];

export function canonicalPath(pathname) {
  return pathname === '/' ? '/' : pathname.replace(/\/$/, '');
}

// `site` may come with or without trailing slash (gsc-* scripts pass
// "https://.../" as siteUrl, the others pass the bare origin).
function normalizeSite(site) {
  return (site || SITE).replace(/\/$/, '');
}

export function fallbackUrls(site = SITE) {
  const base = normalizeSite(site);
  return FALLBACK_PATHS.map((p) => `${base}${p}`);
}

// Returns { urls, source: 'sitemap' | 'fallback', error }. Never throws:
// a network failure degrades to the fallback list and says so in `source`,
// so callers can tell "measured the real sitemap" from "guessed".
export async function fetchSiteUrls(site = SITE) {
  const base = normalizeSite(site);
  try {
    const res = await fetch(`${base}/sitemap.xml`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
      const u = new URL(m[1].trim());
      return `${u.origin}${canonicalPath(u.pathname)}`;
    });
    if (urls.length === 0) throw new Error('sitemap has no <loc> entries');
    return { urls: [...new Set(urls)], source: 'sitemap' };
  } catch (e) {
    return { urls: fallbackUrls(base), source: 'fallback' };
  }
}
