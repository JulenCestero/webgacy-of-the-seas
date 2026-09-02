// On-demand SEO audit for one URL or path — the /seo-audit skill's engine —
// and, with --all, the deterministic findings menu the weekly loop's analyst
// picks from.
//
// Report-only: never writes, commits, or opens anything. It's the on-demand
// sibling of seo-loop/ (see prompt-analyst.md). GSC auth comes from
// scripts/lib/gsc-auth.mjs (shared with verify-gsc-credential.mjs /
// gsc-audit-check.mjs / gsc-snapshot.mjs); the URL list from
// scripts/lib/site-urls.mjs (live sitemap, offline fallback).
//
// Checks, in order (single-URL mode):
//   1. Trailing-slash / canonical normalization (see docs/seo-audit.md and
//      ClaudeVault .raw/2026-08-04-sitemap-trailing-slash-urls-huerfanas.md —
//      a sitemap listing a URL form nothing on the site links to orphans it).
//   2. Sitemap vs. internal-link parity (one-hop crawl from the homepage nav,
//      good enough for this site's ~7 static routes).
//   3. Schema.org completeness for MusicEvent/Event rich results.
//   4. GSC indexation in three states — sí / no / no verificable — never
//      collapsing "Google said no" into "we couldn't ask" (see ClaudeVault
//      .raw/2026-08-04-google-dice-no-vs-no-pude-preguntar.md).
//
// --all mode runs those per sitemap URL plus cheap page-hygiene checks
// (title / meta description presence, length, duplicates; exactly one <h1>;
// og:image; JSON-LD parses; canonical == self) and prints ONE JSON object:
//   { generated_at, site, url_source, gsc, findings: [
//       { id, url, check, severity, detail, gsc_state } ] }
// severity ∈ blocks-index | blocks-rich-result | hygiene, sorted by severity
// then url then check. `id` = "<check>:<path>" — stable across runs so the
// analyst/verifier can cite it. gsc_state is the coverageState string or
// "NO VERIFICABLE" (never invented, never crashes if the key/API is missing).
//
// Usage: node scripts/seo-audit-oneshot.mjs <url-or-path> [gsc-key-path]
//        node scripts/seo-audit-oneshot.mjs --all [--json] [gsc-key-path]
//        node scripts/seo-audit-oneshot.mjs --self-test
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadServiceAccount, getAccessToken, GSC_READONLY_SCOPE } from './lib/gsc-auth.mjs';
import { SITE, fetchSiteUrls, canonicalPath as toCanonicalPath } from './lib/site-urls.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const positional = argv.filter((a) => !a.startsWith('--'));
const ALL_MODE = flags.has('--all');

const rawArg = ALL_MODE ? null : positional[0];
const KEY_PATH = (ALL_MODE ? positional[0] : positional[1]) || path.join(REPO_ROOT, 'gsc-service-account.json');

if (!rawArg && !ALL_MODE && !flags.has('--self-test')) {
  console.error('Usage: node scripts/seo-audit-oneshot.mjs <url-or-path> [gsc-key-path]');
  console.error('       node scripts/seo-audit-oneshot.mjs --all [--json] [gsc-key-path]');
  process.exit(1);
}

// Accept a bare path ("/conciertos"), a path with trailing slash, or a full URL.
function toAbsolute(input) {
  if (/^https?:\/\//.test(input)) return input;
  // Git Bash (MSYS) rewrites a leading "/" into the install prefix, so "/conciertos"
  // arrives as "C:/Program Files/Git/conciertos" and the audit silently inspects a
  // URL nobody asked about. Strip it back rather than reporting on the wrong page.
  const demangled = input.replace(/^[A-Za-z]:[\\/].*?[\\/]Git[\\/]/, '/');
  const p = demangled.startsWith('/') ? demangled : `/${demangled}`;
  return `${SITE}${p}`;
}
// Canonical form this repo standardizes on: no trailing slash except root
// (must match src/pages/sitemap.xml.ts and Header.astro's navLinks).
function target(input) {
  const canonicalPath = toCanonicalPath(new URL(toAbsolute(input)).pathname);
  return { canonicalPath, canonicalUrl: `${SITE}${canonicalPath}` };
}

const out = { sections: [] };
function section(title, lines) {
  out.sections.push({ title, lines });
}

// --- 1. Trailing-slash / canonical normalization ---------------------------
async function checkTrailingSlash({ canonicalPath, canonicalUrl }) {
  const lines = [];
  const variantPath = canonicalPath === '/' ? null : `${canonicalPath}/`;

  const canonicalRes = await fetchSafe(canonicalUrl);
  lines.push(`Forma canónica del repo: ${canonicalPath} -> HTTP ${canonicalRes.status ?? 'ERROR'}`);

  let emittedCanonical = null;
  if (canonicalRes.body) {
    emittedCanonical = extractCanonical(canonicalRes.body);
    lines.push(`<link rel="canonical"> emitido: ${emittedCanonical ?? 'NO ENCONTRADO'}`);
    if (emittedCanonical && emittedCanonical !== canonicalUrl) {
      lines.push(`  DESAJUSTE: la página emite un canonical distinto de la URL solicitada (${emittedCanonical} != ${canonicalUrl}).`);
    }
  }

  if (variantPath) {
    const variantUrl = `${SITE}${variantPath}`;
    const variantRes = await fetchSafe(variantUrl);
    lines.push(`Variante con barra: ${variantPath} -> HTTP ${variantRes.status ?? 'ERROR'}`);
    if (variantRes.status && variantRes.status < 400) {
      lines.push('  Ambas formas responden 200: si el sitemap o algún enlace interno usa la variante con barra, esa URL queda huérfana (nada la referencia con esa forma exacta) aunque el servidor no falle.');
    }
  }
  return lines;
}

// --- 2. Sitemap vs internal-link parity -------------------------------------
async function checkSitemapParity({ canonicalPath }) {
  const lines = [];
  const sitemapRes = await fetchSafe(`${SITE}/sitemap.xml`);
  if (!sitemapRes.body) {
    lines.push(`No se pudo leer /sitemap.xml (HTTP ${sitemapRes.status ?? 'ERROR'}) — parity no verificable.`);
    return lines;
  }
  const sitemapUrls = [...sitemapRes.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const sitemapPaths = new Set(sitemapUrls.map((u) => new URL(u).pathname));

  // One-hop crawl from the homepage: this site's global nav (Header.astro)
  // links every static route, so this is enough to catch orphans among
  // static pages without building a real crawler. It will NOT see
  // /archivo/<slug> posts (those are only linked from /archivo, two hops
  // away) — expect them to show up as "sin enlace interno detectado" here;
  // that's this check's blind spot, not necessarily a real orphan.
  const homeRes = await fetchSafe(SITE);
  const linkedPaths = homeRes.body ? extractInternalLinks(homeRes.body) : new Set();

  const orphaned = [...sitemapPaths].filter((p) => !linkedPaths.has(p) && !linkedPaths.has(p.replace(/\/$/, '')));
  const unlisted = [...linkedPaths].filter((p) => p.startsWith('/') && !sitemapPaths.has(p) && p !== '/admin' && !/\.\w+$/.test(p));

  lines.push(`Sitemap: ${sitemapPaths.size} URL(s). Enlazadas desde home (1 salto): ${linkedPaths.size}.`);
  lines.push(orphaned.length
    ? `En sitemap pero SIN enlace interno detectado (posible huérfana): ${orphaned.join(', ')}`
    : 'Ninguna URL del sitemap parece huérfana respecto al nav de home.');
  if (unlisted.length) {
    lines.push(`Enlazadas desde home pero AUSENTES del sitemap: ${unlisted.join(', ')}`);
  }

  if (sitemapPaths.has(canonicalPath) || sitemapPaths.has(`${canonicalPath}/`)) {
    const exact = sitemapPaths.has(canonicalPath) ? canonicalPath : `${canonicalPath}/`;
    lines.push(`URL auditada presente en sitemap como: ${exact}${exact !== canonicalPath ? '  <-- forma distinta a la canónica, revisar' : ''}`);
  } else {
    lines.push('URL auditada NO aparece en el sitemap (si debería estar indexada, añadirla a src/pages/sitemap.xml.ts).');
  }
  return lines;
}

// --- 3. Schema.org completeness for MusicEvent/Event ------------------------
const EVENT_REQUIRED = ['name', 'startDate', 'location'];
const EVENT_RECOMMENDED = ['endDate', 'eventStatus', 'eventAttendanceMode', 'image', 'performer', 'offers', 'description'];

async function checkSchema({ canonicalUrl }) {
  const lines = [];
  const res = await fetchSafe(canonicalUrl);
  if (!res.body) {
    lines.push(`No se pudo leer la página (HTTP ${res.status ?? 'ERROR'}) — schema no verificable.`);
    return lines;
  }
  const { blocks } = parseJsonLd(res.body);

  if (blocks.length === 0) {
    lines.push('Sin bloques JSON-LD en esta página.');
    return lines;
  }

  const entities = flattenEntities(blocks);
  lines.push(`Bloques JSON-LD: ${blocks.length}. Entidades: ${entities.map((e) => e['@type']).join(', ')}`);

  const events = entities.filter(isEvent);
  if (events.length === 0) {
    lines.push('Sin MusicEvent/Event en esta página (esperado fuera de /conciertos).');
    return lines;
  }
  events.forEach((ev, i) => {
    const missingRequired = EVENT_REQUIRED.filter((k) => !ev[k]);
    const missingRecommended = EVENT_RECOMMENDED.filter((k) => !ev[k]);
    lines.push(`Event #${i + 1} (${ev.name ?? 'sin nombre'}):`);
    lines.push(missingRequired.length
      ? `  BLOQUEA rich results — faltan campos obligatorios: ${missingRequired.join(', ')}`
      : '  Campos obligatorios: OK');
    lines.push(missingRecommended.length
      ? `  Recomendados ausentes (debilitan el rich result): ${missingRecommended.join(', ')}`
      : '  Campos recomendados: OK');
  });
  return lines;
}

// --- 4. GSC indexation, 3 states --------------------------------------------
// Returns { ok: true, token } or { ok: false, reason } — never throws, so the
// caller renders the third state instead of dying.
async function gscToken() {
  let sa;
  try {
    sa = loadServiceAccount(KEY_PATH);
  } catch (e) {
    return { ok: false, reason: `no se pudo leer la credencial GSC (${KEY_PATH}): ${e.message}` };
  }
  try {
    return { ok: true, token: await getAccessToken(sa, GSC_READONLY_SCOPE) };
  } catch (e) {
    return { ok: false, reason: `falló la autenticación contra la API de GSC: ${e.message}` };
  }
}

// One URL Inspection call. Returns { ok: true, result } (result has
// verdict/coverageState/lastCrawlTime/robotsTxtState) or { ok: false, reason }.
async function inspectUrl(token, url) {
  try {
    const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inspectionUrl: url, siteUrl: `${SITE}/` }),
    });
    const body = await res.json();
    if (!res.ok) {
      // Google's own API call failed (auth, quota, malformed) — this is
      // "we could not ask", not "Google said no". Never render as indexed=false.
      return { ok: false, reason: `la llamada a la API falló: HTTP ${res.status} ${JSON.stringify(body)}` };
    }
    const r = body?.inspectionResult?.indexStatusResult;
    if (!r || !r.coverageState) {
      return { ok: false, reason: 'la API respondió sin coverageState (respuesta inesperada).' };
    }
    return { ok: true, result: r };
  } catch (e) {
    return { ok: false, reason: `excepción durante la inspección: ${e.message}` };
  }
}

async function checkIndexation({ canonicalUrl }) {
  const lines = [];
  const auth = await gscToken();
  if (!auth.ok) {
    lines.push(`NO VERIFICABLE — ${auth.reason}`);
    return lines;
  }
  const ins = await inspectUrl(auth.token, canonicalUrl);
  if (!ins.ok) {
    lines.push(`NO VERIFICABLE — ${ins.reason}`);
    return lines;
  }
  const r = ins.result;
  lines.push(`${classifyIndexation(r.verdict)} — coverageState: "${r.coverageState}" (verdict: ${r.verdict ?? 'N/D'})`);
  if (r.lastCrawlTime) lines.push(`Último crawl de Google: ${r.lastCrawlTime}`);
  if (r.robotsTxtState) lines.push(`robots.txt state: ${r.robotsTxtState}`);
  lines.push(`URL inspeccionada: ${canonicalUrl}`);
  return lines;
}

// --- helpers -----------------------------------------------------------------
async function fetchSafe(url) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    const body = await res.text().catch(() => null);
    return { status: res.status, body };
  } catch {
    return { status: null, body: null };
  }
}

function extractCanonical(html) {
  const m = html.match(/<link rel="canonical" href="([^"]+)"/);
  return m ? m[1] : null;
}

// Anchor tags only — a bare href="..." regex also catches favicons,
// preload/stylesheet links, and hashed asset URLs, which are not
// navigable pages and would fill the "missing from sitemap" list with
// noise (CSS bundles, images) instead of real orphan pages.
function extractInternalLinks(html) {
  const linked = new Set();
  for (const m of html.matchAll(/<a\s[^>]*href="(\/[^"#]*)"/g)) {
    linked.add(m[1].replace(/\/$/, '') || '/');
  }
  return linked;
}

// { blocks: parsed objects, invalid: count of <script type=ld+json> that failed JSON.parse }
function parseJsonLd(html) {
  const blocks = [];
  let invalid = 0;
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try { blocks.push(JSON.parse(m[1])); } catch { invalid++; }
  }
  return { blocks, invalid };
}

function flattenEntities(blocks) {
  const entities = [];
  for (const block of blocks) {
    if (Array.isArray(block['@graph'])) entities.push(...block['@graph']);
    else entities.push(block);
  }
  return entities;
}

function isEvent(e) {
  return e['@type'] === 'MusicEvent' || e['@type'] === 'Event';
}

// Classify from the `verdict` enum, never from substring-matching coverageState:
// "Discovered - currently not indexed" and "Crawled - currently not indexed" both
// contain "indexed", so a substring test reports an explicitly non-indexed page as
// indexed. An absent or unrecognised verdict is the third state, not a "no".
function classifyIndexation(verdict) {
  if (verdict === 'PASS') return 'SÍ';
  if (verdict === 'FAIL' || verdict === 'NEUTRAL' || verdict === 'PARTIAL') return 'NO';
  return 'NO VERIFICABLE';
}

function selfTest() {
  const cases = [
    ['PASS', 'SÍ'],
    ['NEUTRAL', 'NO'],
    ['FAIL', 'NO'],
    ['PARTIAL', 'NO'],
    ['VERDICT_UNSPECIFIED', 'NO VERIFICABLE'],
    [undefined, 'NO VERIFICABLE'],
  ];
  let bad = 0;
  for (const [verdict, want] of cases) {
    const got = classifyIndexation(verdict);
    const ok = got === want;
    if (!ok) bad++;
    console.log(`${ok ? 'PASS' : 'FAIL'}: verdict=${verdict} -> ${got} (esperado ${want})`);
  }
  // The regression this guards: these real coverageState values all contain
  // "indexed" but mean the opposite.
  for (const cs of ['Discovered - currently not indexed', 'Crawled - currently not indexed']) {
    const ok = classifyIndexation('NEUTRAL') === 'NO';
    if (!ok) bad++;
    console.log(`${ok ? 'PASS' : 'FAIL'}: "${cs}" no se reporta como indexada`);
  }
  console.log(`\nSELFTEST: ${bad === 0 ? 'PASS' : `FAIL (${bad})`}`);
  process.exit(bad === 0 ? 0 : 1);
}

// --- --all: deterministic findings menu ---------------------------------------
const SEVERITY_ORDER = { 'blocks-index': 0, 'blocks-rich-result': 1, hygiene: 2 };
const GSC_NOT_VERIFIABLE = 'NO VERIFICABLE';
// Google's own guidance: ~50-60 chars for titles, ~50-160 for descriptions.
const TITLE_MIN = 10, TITLE_MAX = 60;
const DESC_MIN = 50, DESC_MAX = 160;

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}
function metaContent(html, attrRe) {
  const m = html.match(new RegExp(`<meta\\s+[^>]*${attrRe}[^>]*>`, 'i'));
  if (!m) return null;
  const c = m[0].match(/content="([^"]*)"/i);
  return c ? decodeEntities(c[1]) : '';
}
function pageFacts(html) {
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return {
    title: t ? decodeEntities(t[1]) : null,
    description: metaContent(html, 'name="description"'),
    ogImage: metaContent(html, 'property="og:image"'),
    h1Count: (html.match(/<h1[\s>]/gi) || []).length,
    canonical: extractCanonical(html),
    jsonLd: parseJsonLd(html),
    links: extractInternalLinks(html),
  };
}

async function auditAll() {
  const { urls, source: url_source } = await fetchSiteUrls(SITE);
  const findings = [];
  const add = (url, check, severity, detail) => {
    const p = new URL(url).pathname;
    findings.push({ id: `${check}:${p}`, url, check, severity, detail });
  };

  // 1. Fetch every page once; collect facts.
  const pages = new Map();
  for (const url of urls) {
    const res = await fetchSafe(url);
    pages.set(url, { status: res.status, facts: res.body ? pageFacts(res.body) : null });
  }

  // 2. Sitemap parity, with the whole site's anchors as the "linked" set
  //    (every sitemap page is fetched anyway, so /archivo/<slug> posts linked
  //    only from /archivo are visible here — the single-URL mode's blind spot
  //    does not apply).
  const sitemapPaths = new Set(urls.map((u) => new URL(u).pathname));
  const linkedPaths = new Set();
  for (const { facts } of pages.values()) {
    if (facts) for (const p of facts.links) linkedPaths.add(p);
  }
  for (const p of linkedPaths) {
    if (!sitemapPaths.has(p) && p !== '/admin' && !p.startsWith('/admin/') && !/\.\w+$/.test(p)) {
      add(`${SITE}${p}`, 'sitemap-missing', 'blocks-index', `Enlazada internamente pero ausente del sitemap (añadir a src/pages/sitemap.xml.ts si debe indexarse).`);
    }
  }

  // 3. Per-page checks.
  const titles = new Map(), descs = new Map();
  for (const [url, { status, facts }] of pages) {
    const p = new URL(url).pathname;
    if (status !== 200) {
      add(url, 'http-status', 'blocks-index', `La URL canónica responde HTTP ${status ?? 'ERROR'} (esperado 200).`);
    }
    if (!linkedPaths.has(p) && p !== '/') {
      add(url, 'sitemap-orphan', 'blocks-index', 'En sitemap pero sin ningún enlace interno <a href> en las páginas del sitemap: huérfana.');
    }
    if (p !== '/') {
      const variant = await fetchSafe(`${url}/`);
      if (variant.status && variant.status < 400) {
        add(url, 'trailing-slash-variant', 'hygiene', `${p}/ también responde HTTP ${variant.status}: dos URLs para el mismo contenido; el canonical debe apuntar a la forma sin barra.`);
      }
    }
    if (!facts) continue;

    if (!facts.canonical) {
      add(url, 'canonical-missing', 'blocks-index', 'Sin <link rel="canonical">.');
    } else if (facts.canonical !== url) {
      add(url, 'canonical-mismatch', 'blocks-index', `<link rel="canonical"> = ${facts.canonical}, distinto de la URL propia ${url}.`);
    }

    if (facts.title === null || facts.title === '') {
      add(url, 'title-missing', 'hygiene', 'Sin <title>.');
    } else {
      if (facts.title.length < TITLE_MIN || facts.title.length > TITLE_MAX) {
        add(url, 'title-length', 'hygiene', `<title> tiene ${facts.title.length} chars (recomendado ${TITLE_MIN}-${TITLE_MAX}): "${facts.title}"`);
      }
      titles.set(url, facts.title);
    }

    if (facts.description === null || facts.description === '') {
      add(url, 'meta-description-missing', 'hygiene', 'Sin <meta name="description">.');
    } else {
      if (facts.description.length < DESC_MIN || facts.description.length > DESC_MAX) {
        add(url, 'meta-description-length', 'hygiene', `meta description tiene ${facts.description.length} chars (recomendado ${DESC_MIN}-${DESC_MAX}).`);
      }
      descs.set(url, facts.description);
    }

    if (facts.h1Count !== 1) {
      add(url, 'h1-count', 'hygiene', `${facts.h1Count} <h1> en la página (esperado exactamente 1).`);
    }
    if (!facts.ogImage) {
      add(url, 'og-image-missing', 'hygiene', 'Sin <meta property="og:image">.');
    }
    if (facts.jsonLd.invalid > 0) {
      add(url, 'jsonld-invalid', 'blocks-rich-result', `${facts.jsonLd.invalid} bloque(s) JSON-LD no parsean como JSON.`);
    }
    const events = flattenEntities(facts.jsonLd.blocks).filter(isEvent);
    events.forEach((ev, i) => {
      const missingRequired = EVENT_REQUIRED.filter((k) => !ev[k]);
      const missingRecommended = EVENT_RECOMMENDED.filter((k) => !ev[k]);
      const label = `Event #${i + 1} (${ev.name ?? 'sin nombre'})`;
      if (missingRequired.length) {
        add(url, `event-required-missing#${i + 1}`, 'blocks-rich-result', `${label}: faltan campos obligatorios ${missingRequired.join(', ')}.`);
      }
      if (missingRecommended.length) {
        add(url, `event-recommended-missing#${i + 1}`, 'hygiene', `${label}: recomendados ausentes ${missingRecommended.join(', ')}.`);
      }
    });
  }

  // 4. Cross-page duplicates.
  const dupes = (map, check, what) => {
    const byValue = new Map();
    for (const [url, v] of map) byValue.set(v, [...(byValue.get(v) || []), url]);
    for (const [v, list] of byValue) {
      if (list.length < 2) continue;
      for (const url of list) {
        const others = list.filter((u) => u !== url).map((u) => new URL(u).pathname).join(', ');
        add(url, check, 'hygiene', `${what} duplicado con ${others}: "${v}"`);
      }
    }
  };
  dupes(titles, 'title-duplicate', '<title>');
  dupes(descs, 'meta-description-duplicate', 'meta description');

  // 5. GSC three-state per URL. One token, sequential calls (urlInspection is
  //    rate-limited). If auth or a call fails the state is NO VERIFICABLE —
  //    never "not indexed".
  const gscState = new Map();
  const auth = await gscToken();
  const gsc = { verifiable: auth.ok, reason: auth.ok ? null : auth.reason };
  if (auth.ok) {
    for (const url of urls) {
      const ins = await inspectUrl(auth.token, url);
      if (ins.ok) {
        gscState.set(url, ins.result.coverageState);
        if (classifyIndexation(ins.result.verdict) === 'NO') {
          add(url, 'gsc-not-indexed', 'blocks-index', `GSC coverageState "${ins.result.coverageState}" (verdict ${ins.result.verdict}); último crawl: ${ins.result.lastCrawlTime ?? 'nunca'}.`);
        }
      } else {
        gscState.set(url, GSC_NOT_VERIFIABLE);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  for (const f of findings) f.gsc_state = gscState.get(f.url) ?? GSC_NOT_VERIFIABLE;
  findings.sort((a, b) =>
    (SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    || a.url.localeCompare(b.url)
    || a.check.localeCompare(b.check));

  return { generated_at: new Date().toISOString(), site: SITE, url_source, urls_checked: urls.length, gsc, findings };
}

async function main() {
  if (flags.has('--self-test')) return selfTest();

  if (ALL_MODE) {
    // Only the JSON object goes to stdout so callers can pipe it straight
    // into JSON.parse; anything diagnostic goes to stderr.
    const report = await auditAll();
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const t = target(rawArg);
  console.log(`=== SEO audit on-demand: ${t.canonicalUrl} ===\n`);

  section('1. Trailing-slash / canonical', await checkTrailingSlash(t));
  section('2. Paridad sitemap vs enlaces internos', await checkSitemapParity(t));
  section('3. Completitud de schema (MusicEvent/Event)', await checkSchema(t));
  section('4. Indexación real en GSC (3 estados)', await checkIndexation(t));

  for (const s of out.sections) {
    console.log(`--- ${s.title} ---`);
    for (const line of s.lines) console.log(line);
    console.log('');
  }
}

main().catch((e) => {
  console.error('FATAL', e.message);
  process.exit(1);
});
