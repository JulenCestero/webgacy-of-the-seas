// Appends one JSONL snapshot of GSC leading indicators (indexation, sitemap
// fetch state, crawl dates) to seo-loop/metrics.jsonl, anchored to the current
// commit. Traffic (impressions/clicks/position) is recorded but is NOT a
// leading indicator at current volume (8 impressions/28d = noise) — see
// gsc-report-delta.mjs for how it's presented.
//
// Auth via scripts/lib/gsc-auth.mjs, URL list via scripts/lib/site-urls.mjs
// (no new deps, node builtins only).
import { appendFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadServiceAccount, getAccessToken, GSC_READONLY_SCOPE } from './lib/gsc-auth.mjs';
import { fetchSiteUrls } from './lib/site-urls.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const METRICS_PATH = path.join(REPO_ROOT, 'seo-loop', 'metrics.jsonl');

// --- arg parsing: argv[2] is the credential path (matches existing scripts).
// Optional trailing positional siteUrl, optional --note "text" anywhere.
const rawArgs = process.argv.slice(2);
let note = null;
const positional = [];
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--note') {
    note = rawArgs[i + 1] ?? '';
    i++;
  } else {
    positional.push(rawArgs[i]);
  }
}
const KEY_PATH = positional[0];
const SITE_URL = positional[1] || 'https://legacyoftheseas.pages.dev/';

if (!KEY_PATH) {
  console.error('Usage: node gsc-snapshot.mjs <path-to-service-account.json> [siteUrl] [--note "text"]');
  process.exit(1);
}

async function inspectUrl(token, url) {
  try {
    const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE_URL }),
    });
    const body = await res.json();
    if (!res.ok) return { error: `${res.status} ${JSON.stringify(body)}` };
    const r = body?.inspectionResult?.indexStatusResult || {};
    return { state: r.coverageState ?? null, last_crawl: r.lastCrawlTime ?? null };
  } catch (e) {
    return { error: e.message };
  }
}

async function getSitemaps(token) {
  try {
    const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/sitemaps`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    if (!res.ok) return { error: `${res.status} ${JSON.stringify(body)}` };
    return body.sitemap || [];
  } catch (e) {
    return { error: e.message };
  }
}

async function searchAnalyticsTotals(token, days = 28) {
  try {
    const end = new Date();
    const start = new Date(end.getTime() - days * 86400000);
    const fmt = (d) => d.toISOString().slice(0, 10);
    const res = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: fmt(start), endDate: fmt(end), rowLimit: 1 }),
    });
    const body = await res.json();
    if (!res.ok) return { error: `${res.status} ${JSON.stringify(body)}` };
    const row = (body.rows || [])[0] || {};
    return { impressions: row.impressions ?? 0, clicks: row.clicks ?? 0, position: row.position ?? null };
  } catch (e) {
    return { error: e.message };
  }
}

function getCommitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: REPO_ROOT }).toString().trim();
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function urlToKey(url) {
  const base = SITE_URL.replace(/\/$/, '');
  const key = url.startsWith(base) ? url.slice(base.length) : url;
  return key || '/';
}

async function main() {
  const sa = loadServiceAccount(KEY_PATH);
  const token = await getAccessToken(sa, GSC_READONLY_SCOPE);

  // URL list comes from the live sitemap (canonical no-trailing-slash form),
  // falling back to the frozen list in lib/site-urls.mjs only if the fetch
  // fails. `url_source` in the record says which one was measured.
  const { urls, source: url_source } = await fetchSiteUrls(SITE_URL);

  // Sequential, gentle — the urlInspection API is rate-limited (2000/day).
  const urlResults = {};
  for (const url of urls) {
    urlResults[urlToKey(url)] = await inspectUrl(token, url);
    await sleep(300);
  }
  // Count errors separately. A failed inspection has no `state`, so folding it
  // into "not indexed" would let a rate-limit or network blip record 0/7 in the
  // ledger and read as catastrophic de-indexing — same "Google says no" vs
  // "we could not ask" conflation avoided for the sitemap booleans below.
  const results = Object.values(urlResults);
  const indexed = results.filter((r) => r.state === 'Submitted and indexed').length;
  const errored = results.filter((r) => r.error !== undefined).length;

  const sitemaps = await getSitemaps(token);
  // null (not false) when the API call failed: "Google says not downloaded" and
  // "we could not ask Google" are different facts, and collapsing them onto
  // false makes a transient fetch failure look like a real state change in the
  // delta report. Only assign booleans when we actually got an answer.
  let sitemap_downloaded = null;
  let sitemap_pending = null;
  let sitemap_last_submitted = null;
  let sitemap_error = null;
  if (Array.isArray(sitemaps)) {
    sitemap_downloaded = false;
    sitemap_pending = false;
    for (const sm of sitemaps) {
      if (Object.prototype.hasOwnProperty.call(sm, 'lastDownloaded')) sitemap_downloaded = true;
      if (sm.isPending) sitemap_pending = true;
      if (sm.lastSubmitted && (!sitemap_last_submitted || sm.lastSubmitted > sitemap_last_submitted)) {
        sitemap_last_submitted = sm.lastSubmitted;
      }
    }
  } else if (sitemaps?.error) {
    sitemap_error = sitemaps.error;
  }

  const analytics = await searchAnalyticsTotals(token, 28);

  const record = {
    date: new Date().toISOString().slice(0, 10),
    commit: getCommitSha(),
    indexed,
    errored,
    total_urls: urls.length,
    url_source,
    sitemap_downloaded,
    sitemap_pending,
    sitemap_last_submitted,
    impressions_28d: analytics.impressions ?? null,
    clicks_28d: analytics.clicks ?? null,
    position_28d: analytics.position ?? null,
    urls: urlResults,
  };
  if (sitemap_error) record.sitemap_error = sitemap_error;
  if (note) record.note = note;

  appendFileSync(METRICS_PATH, `${JSON.stringify(record)}\n`);
  console.log('Snapshot written to', METRICS_PATH);
  console.log(JSON.stringify(record));
}

main().catch((e) => {
  console.error('FATAL', e.message);
  process.exit(1);
});
