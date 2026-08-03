// Throwaway verification script for GSC service account credential.
// Uses Node built-in crypto to sign a JWT and exchange it for an access token
// (no google-auth-library / googleapis npm deps needed).
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const KEY_PATH = process.argv[2];
const SITE_URL = process.argv[3] || 'https://legacyoftheseas.pages.dev/';

if (!KEY_PATH) {
  console.error('Usage: node gsc-verify.mjs <path-to-service-account.json> [siteUrl]');
  process.exit(1);
}

const sa = JSON.parse(readFileSync(KEY_PATH, 'utf8'));

function base64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makeJwt(scope) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope,
    aud: sa.token_uri,
    exp: now + 3600,
    iat: now,
  };
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
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${JSON.stringify(body)}`);
  }
  return body.access_token;
}

async function main() {
  console.log(`client_email domain check: ends with @${sa.client_email.split('@')[1] || '(unknown)'}`);

  let token;
  try {
    token = await getAccessToken('https://www.googleapis.com/auth/webmasters.readonly');
    console.log('AUTH: success (obtained access token)');
  } catch (e) {
    console.log('AUTH: FAILED');
    console.log('Error:', e.message);
    process.exit(1);
  }

  // sites.list
  try {
    const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    if (!res.ok) {
      console.log('SITES.LIST: FAILED', res.status, JSON.stringify(body));
    } else {
      const siteEntries = (body.siteEntry || []).map(s => `${s.siteUrl} (${s.permissionLevel})`);
      console.log('SITES.LIST: success. Sites visible to this service account:');
      siteEntries.forEach(s => console.log('  -', s));
      const hasTarget = (body.siteEntry || []).some(s => s.siteUrl === SITE_URL);
      console.log(`Target property "${SITE_URL}" present: ${hasTarget}`);
    }
  } catch (e) {
    console.log('SITES.LIST: FAILED (exception)', e.message);
  }

  // urlInspection.index.inspect
  try {
    const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inspectionUrl: SITE_URL, siteUrl: SITE_URL }),
    });
    const body = await res.json();
    if (!res.ok) {
      console.log('URL INSPECTION: FAILED', res.status, JSON.stringify(body));
    } else {
      const verdict = body?.inspectionResult?.indexStatusResult?.verdict;
      console.log('URL INSPECTION: success. Coverage verdict:', verdict);
    }
  } catch (e) {
    console.log('URL INSPECTION: FAILED (exception)', e.message);
  }
}

main();
