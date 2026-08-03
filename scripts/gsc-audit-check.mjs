// Read-only GSC data pull for the weekly SEO analyst pass.
// Reuses the JWT auth flow from verify-gsc-credential.mjs (no new deps).
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const KEY_PATH = process.argv[2];
const SITE_URL = process.argv[3] || 'https://legacyoftheseas.pages.dev/';

const sa = JSON.parse(readFileSync(KEY_PATH, 'utf8'));

function base64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makeJwt(scope) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = { iss: sa.client_email, scope, aud: sa.token_uri, exp: now + 3600, iat: now };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(sa.private_key).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${unsigned}.${signature}`;
}

async function getAccessToken(scope) {
  const jwt = makeJwt(scope);
  const res = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${JSON.stringify(body)}`);
  return body.access_token;
}

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
  const token = await getAccessToken('https://www.googleapis.com/auth/webmasters.readonly');

  const urls = [
    'https://legacyoftheseas.pages.dev/',
    'https://legacyoftheseas.pages.dev/conciertos/',
    'https://legacyoftheseas.pages.dev/nosotros/',
    'https://legacyoftheseas.pages.dev/tienda/',
    'https://legacyoftheseas.pages.dev/archivo/',
    'https://legacyoftheseas.pages.dev/contacto/',
    'https://legacyoftheseas.pages.dev/archivo/2024-10-04-lanzamiento-leyendas/',
  ];

  console.log('=== URL INSPECTION ===');
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
