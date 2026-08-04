// Notifies IndexNow (https://www.indexnow.org) that one or more site URLs are
// new or changed, so participating search engines can prioritize a recrawl.
//
// IMPORTANT — scope, be honest about this in any output/report:
//   Participates: Bing, Yandex, Seznam.cz, Naver, Yep.
//   Does NOT participate: Google. Google has its own indexing pipeline and
//   ignores IndexNow entirely — this script has zero effect on Google.
//   Indirect coverage: DuckDuckGo and Brave Search derive their index from
//   Bing, so they pick up IndexNow-driven recrawls secondhand.
// A 200/202 response here means "the notification was accepted", NOT
// "the page is now indexed everywhere" — never report it as the latter.
//
// Style matches scripts/gsc-snapshot.mjs: node builtins only, no new deps,
// argv-based, clear console output, exit 0 on success / 1 on hard failure.
const HOST = 'legacyoftheseas.pages.dev';
const SITE = `https://${HOST}`;

// IndexNow key. Fixed and committed on purpose — this is NOT a secret. The
// protocol requires it to be publicly readable forever at KEY_LOCATION below
// (that's how a search engine proves the submitter actually controls the
// site), so do not move it to .env/.gitignore "for safety" — hiding it would
// break verification, not improve it. 32 lowercase-hex chars, generated once
// on 2026-08-04; must never change or every prior submission's key binding
// breaks.
const KEY = '6d954ac97b77f914506dfe50b1af2c54';
const KEY_LOCATION = `${SITE}/${KEY}.txt`;

const ENDPOINT = 'https://api.indexnow.org/indexnow';

// Same 7 URLs the sitemap publishes (src/pages/sitemap.xml.ts): the 6 static
// pages plus the one archive post known at the time this script was written.
// Non-trailing-slash (except root) — must match sitemap.xml.ts and
// scripts/gsc-snapshot.mjs; a trailing slash would name a URL string the site
// never actually serves. Keep these three files in sync.
const DEFAULT_URLS = [
  `${SITE}/`,
  `${SITE}/conciertos`,
  `${SITE}/nosotros`,
  `${SITE}/tienda`,
  `${SITE}/archivo`,
  `${SITE}/contacto`,
  `${SITE}/archivo/2024-10-04-lanzamiento-leyendas`,
];

const args = process.argv.slice(2);
const urlList = args.length > 0 ? args : DEFAULT_URLS;

for (const u of urlList) {
  if (!u.startsWith(SITE)) {
    console.error(`ERROR: URL fuera de dominio (esperado ${SITE}/...): ${u}`);
    process.exit(1);
  }
}

async function submitSingle(url) {
  const qs = new URLSearchParams({ url, key: KEY, keyLocation: KEY_LOCATION });
  const res = await fetch(`${ENDPOINT}?${qs.toString()}`, { method: 'GET' });
  const body = await res.text();
  return { status: res.status, body };
}

async function submitBatch(urls) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: urls }),
  });
  const body = await res.text();
  return { status: res.status, body };
}

function isSuccess(status) {
  // 200 = OK, 202 = accepted but key validation still pending (normal on the
  // very first submission, before KEY_LOCATION has ever been deployed/crawled).
  return status === 200 || status === 202;
}

async function main() {
  console.log(`IndexNow: enviando ${urlList.length} URL(s) a ${ENDPOINT}`);
  console.log('Cubre: Bing, Yandex, Seznam, Naver, Yep (indirectamente DuckDuckGo/Brave via Bing).');
  console.log('NO cubre Google — Google no participa en IndexNow.');
  urlList.forEach((u) => console.log(`  - ${u}`));

  let result;
  try {
    result = urlList.length === 1 ? await submitSingle(urlList[0]) : await submitBatch(urlList);
  } catch (e) {
    console.error(`FATAL: fallo de red hablando con ${ENDPOINT}: ${e.message}`);
    process.exit(1);
  }

  console.log(`HTTP ${result.status}`);
  if (result.body) console.log(result.body);

  if (isSuccess(result.status)) {
    if (result.status === 202) {
      console.log('202 Accepted: notificacion aceptada, verificacion de la key aun pendiente (normal en el primer envio).');
    } else {
      console.log('200 OK: notificacion aceptada.');
    }
    console.log('Esto NO significa que Google haya indexado nada — Google no participa en IndexNow.');
    process.exit(0);
  }

  const reasons = {
    400: 'Bad request — payload/parametros malformados.',
    403: 'Forbidden — la key no es valida o no se pudo verificar en ' + KEY_LOCATION + '.',
    422: 'Unprocessable Entity — alguna URL no pertenece al host, o la key no coincide.',
    429: 'Too Many Requests — rate limit de IndexNow, reintentar mas tarde.',
  };
  console.error(`ERROR: envio a IndexNow fallo (HTTP ${result.status}). ${reasons[result.status] || 'Codigo inesperado.'}`);
  process.exit(1);
}

main();
