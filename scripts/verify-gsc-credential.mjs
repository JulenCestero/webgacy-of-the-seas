// Throwaway verification script for GSC service account credential.
// Auth via scripts/lib/gsc-auth.mjs: Node built-in crypto signs a JWT and
// exchanges it for an access token (no google-auth-library / googleapis deps).
import { loadServiceAccount, getAccessToken, GSC_READONLY_SCOPE } from './lib/gsc-auth.mjs';

const KEY_PATH = process.argv[2];
const SITE_URL = process.argv[3] || 'https://legacyoftheseas.pages.dev/';

if (!KEY_PATH) {
  console.error('Usage: node gsc-verify.mjs <path-to-service-account.json> [siteUrl]');
  process.exit(1);
}

const sa = loadServiceAccount(KEY_PATH);

async function main() {
  console.log(`client_email domain check: ends with @${sa.client_email.split('@')[1] || '(unknown)'}`);

  let token;
  try {
    token = await getAccessToken(sa, GSC_READONLY_SCOPE);
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
