// Read-only GSC data pull for the weekly SEO analyst pass.
// Auth via scripts/lib/gsc-auth.mjs, URL list via scripts/lib/site-urls.mjs (no new deps).
import { loadServiceAccount, getAccessToken, GSC_READONLY_SCOPE } from './lib/gsc-auth.mjs';
import { fetchSiteUrls } from './lib/site-urls.mjs';

const KEY_PATH = process.argv[2];
const SITE_URL = process.argv[3] || 'https://legacyoftheseas.pages.dev/';

const sa = loadServiceAccount(KEY_PATH);

async function inspectUrl(token, url) {
  const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE_URL }),
  });
  const body = await res.json();
  if (!res.ok) return { url, error: `${res.status} ${JSON.stringify(body)}` };
  const r = body?.inspectionResult?.indexStatusResult || {};
  return { url, verdict: r.verdict, coverageState: r.coverageState, lastCrawlTime: r.lastCrawlTime, robotsTxtState: r.robotsTxtState };
}

async function searchAnalytics(token, dimensions, days = 28) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const res = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate: fmt(start), endDate: fmt(end), dimensions, rowLimit: 25 }),
  });
  const body = await res.json();
  if (!res.ok) return { error: `${res.status} ${JSON.stringify(body)}` };
  return body.rows || [];
}

async function main() {
  const token = await getAccessToken(sa, GSC_READONLY_SCOPE);

  const { urls, source } = await fetchSiteUrls(SITE_URL);

  console.log(`=== URL INSPECTION (${urls.length} URLs, source: ${source}) ===`);
  for (const url of urls) {
    const r = await inspectUrl(token, url);
    console.log(JSON.stringify(r));
  }

  console.log('\n=== SEARCH ANALYTICS: by page (28d) ===');
  console.log(JSON.stringify(await searchAnalytics(token, ['page']), null, 2));

  console.log('\n=== SEARCH ANALYTICS: by query (28d) ===');
  console.log(JSON.stringify(await searchAnalytics(token, ['query']), null, 2));
}

main().catch((e) => {
  console.error('FATAL', e.message);
  process.exit(1);
});
