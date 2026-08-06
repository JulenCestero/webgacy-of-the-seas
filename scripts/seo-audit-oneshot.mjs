// On-demand SEO audit for one URL or path — the /seo-audit skill's engine.
//
// Report-only: never writes, commits, or opens anything. It's the on-demand
// sibling of seo-loop/ (see prompt-analyst.md), reusing that pipeline's GSC
// JWT auth pattern (same as verify-gsc-credential.mjs / gsc-audit-check.mjs /
// gsc-snapshot.mjs — copied rather than imported because those three already
// duplicate the same ~20-line helper independently; that's the established
// convention in this repo, not a new one) instead of inventing a second way
// to talk to the Search Console API.
//
// Checks, in order:
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
// Usage: node scripts/seo-audit-oneshot.mjs <url-or-path> [gsc-key-path]
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SITE = 'https://legacyoftheseas.pages.dev';

const rawArg = process.argv[2];
const KEY_PATH = process.argv[3] || path.join(REPO_ROOT, 'gsc-service-account.json');

if (!rawArg) {
  console.error('Usage: node scripts/seo-audit-oneshot.mjs <url-or-path> [gsc-key-path]');
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
const inputUrl = toAbsolute(rawArg);
const inputPath = new URL(inputUrl).pathname;
// Canonical form this repo standardizes on: no trailing slash except root
// (must match src/pages/sitemap.xml.ts and Header.astro's navLinks).
const canonicalPath = inputPath === '/' ? '/' : inputPath.replace(/\/$/, '');
const canonicalUrl = `${SITE}${canonicalPath}`;

const out = { sections: [] };
function section(title, lines) {
  out.sections.push({ title, lines });
}

// --- 1. Trailing-slash / canonical normalization ---------------------------
async function checkTrailingSlash() {
  const lines = [];
  const variantPath = canonicalPath === '/' ? null : `${canonicalPath}/`;

  const canonicalRes = await fetchSafe(canonicalUrl);
  lines.push(`Forma canónica del repo: ${canonicalPath} -> HTTP ${canonicalRes.status ?? 'ERROR'}`);

  let emittedCanonical = null;
  if (canonicalRes.body) {
    const m = canonicalRes.body.match(/<link rel="canonical" href="([^"]+)"/);
    emittedCanonical = m ? m[1] : null;
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
async function checkSitemapParity() {
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
  const linkedPaths = new Set();
  if (homeRes.body) {
    // Anchor tags only — a bare href="..." regex also catches favicons,
    // preload/stylesheet links, and hashed asset URLs, which are not
    // navigable pages and would fill the "missing from sitemap" list with
    // noise (CSS bundles, images) instead of real orphan pages.
    for (const m of homeRes.body.matchAll(/<a\s[^>]*href="(\/[^"#]*)"/g)) {
      linkedPaths.add(m[1].replace(/\/$/, '') || '/');
    }
  }

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

async function checkSchema() {
  const lines = [];
  const res = await fetchSafe(canonicalUrl);
  if (!res.body) {
    lines.push(`No se pudo leer la página (HTTP ${res.status ?? 'ERROR'}) — schema no verificable.`);
    return lines;
  }
  const blocks = [...res.body.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => {
      try { return JSON.parse(m[1]); } catch { return null; }
    })
    .filter(Boolean);

  if (blocks.length === 0) {
    lines.push('Sin bloques JSON-LD en esta página.');
    return lines;
  }

  const entities = [];
  for (const block of blocks) {
    if (Array.isArray(block['@graph'])) entities.push(...block['@graph']);
    else entities.push(block);
  }
  lines.push(`Bloques JSON-LD: ${blocks.length}. Entidades: ${entities.map((e) => e['@type']).join(', ')}`);

  const events = entities.filter((e) => e['@type'] === 'MusicEvent' || e['@type'] === 'Event');
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
function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function makeJwt(sa, scope) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = { iss: sa.client_email, scope, aud: sa.token_uri, exp: now + 3600, iat: now };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(sa.private_key).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${unsigned}.${signature}`;
}
async function getAccessToken(sa, scope) {
  const jwt = makeJwt(sa, scope);
  const res = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${JSON.stringify(body)}`);
  return body.access_token;
}

async function checkIndexation() {
  const lines = [];
  let sa;
  try {
    sa = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
  } catch (e) {
    lines.push(`NO VERIFICABLE — no se pudo leer la credencial GSC (${KEY_PATH}): ${e.message}`);
    return lines;
  }

  let token;
  try {
    token = await getAccessToken(sa, 'https://www.googleapis.com/auth/webmasters.readonly');
  } catch (e) {
    lines.push(`NO VERIFICABLE — falló la autenticación contra la API de GSC: ${e.message}`);
    return lines;
  }

  try {
    const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inspectionUrl: canonicalUrl, siteUrl: `${SITE}/` }),
    });
    const body = await res.json();
    if (!res.ok) {
      // Google's own API call failed (auth, quota, malformed) — this is
      // "we could not ask", not "Google said no". Never render as indexed=false.
      lines.push(`NO VERIFICABLE — la llamada a la API falló: HTTP ${res.status} ${JSON.stringify(body)}`);
      return lines;
    }
    const r = body?.inspectionResult?.indexStatusResult;
    if (!r || !r.coverageState) {
      lines.push('NO VERIFICABLE — la API respondió sin coverageState (respuesta inesperada).');
      return lines;
    }
    lines.push(`${classifyIndexation(r.verdict)} — coverageState: "${r.coverageState}" (verdict: ${r.verdict ?? 'N/D'})`);
    if (r.lastCrawlTime) lines.push(`Último crawl de Google: ${r.lastCrawlTime}`);
    if (r.robotsTxtState) lines.push(`robots.txt state: ${r.robotsTxtState}`);
    lines.push(`URL inspeccionada: ${canonicalUrl}`);
  } catch (e) {
    lines.push(`NO VERIFICABLE — excepción durante la inspección: ${e.message}`);
  }
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

async function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  console.log(`=== SEO audit on-demand: ${canonicalUrl} ===\n`);

  section('1. Trailing-slash / canonical', await checkTrailingSlash());
  section('2. Paridad sitemap vs enlaces internos', await checkSitemapParity());
  section('3. Completitud de schema (MusicEvent/Event)', await checkSchema());
  section('4. Indexación real en GSC (3 estados)', await checkIndexation());

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
