// Shared Google service-account auth for the GSC scripts: sign a JWT with the
// service account's private key and exchange it for an OAuth2 access token.
// Node built-ins only (no google-auth-library / googleapis).
//
// Consumers: seo-audit-oneshot.mjs, gsc-snapshot.mjs, gsc-audit-check.mjs,
// verify-gsc-credential.mjs. All of them read with `webmasters.readonly`;
// a write-scope caller would pass its own scope string explicitly.
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

export const GSC_READONLY_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

function base64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Parse the service-account JSON at `keyPath`. Throws on missing/invalid file
// so callers decide whether that is fatal or a "not verifiable" state.
export function loadServiceAccount(keyPath) {
  return JSON.parse(readFileSync(keyPath, 'utf8'));
}

export function makeJwt(sa, scope) {
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

export async function getAccessToken(sa, scope = GSC_READONLY_SCOPE) {
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
