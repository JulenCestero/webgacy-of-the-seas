# Estado SEO — Legacy of the Seas

Extraído de `CLAUDE.md` el 2026-08-06 para no pagar su coste de contexto en cada turno.
Informe completo de la auditoría: `docs/seo-audit.md`. Histórico de indicadores: `seo-loop/metrics.jsonl`.

## Implementado

- `robots.txt` — bloquea `/admin/` y `/r2/`
- `_headers` — security headers + cache para Cloudflare
- `og-image.jpg` — logo horizontal 1200x630px
- Schema.org: WebSite, MusicGroup, MusicEvent, Product, BlogPosting, BreadcrumbList, VideoObject
- Preconnect Google Fonts, `og:locale` es_ES
- Favicons: logo LS original (transparente, no cyan)

## Google Search Console

- **Propiedad verificada**: `https://legacyoftheseas.pages.dev/` (fichero `public/google5e9217c10aa451ce.html`)
- **Sitemap real**: `/sitemap.xml`, generado por `src/pages/sitemap.xml.ts`, HTTP 200, referenciado en `robots.txt`. `sitemap-index.xml` y `sitemap-0.xml` **no existen** (404) — quedaron documentados por error, nunca hubo integración `@astrojs/sitemap`.
- **Indexación (verificado 2026-08-03 vía API)**: **2/7** — `/` y `/contacto` (sin barra final). Las otras 5 (`/conciertos`, `/nosotros`, `/tienda`, `/archivo`, `/archivo/2024-10-04-...`) están **"URL is unknown to Google"**: nunca vistas, no rastreadas-y-descartadas.
- **Search Analytics (28d)**: 8 impresiones, 0 clics, posición media 3.4 — solo la home tiene datos. Muestra insuficiente para atribuir efecto a ningún cambio.

## Gotcha: la barra final importa

Comprobado consultando ambas variantes en la API:

| URL | Estado |
|---|---|
| `/contacto` | `Submitted and indexed` (crawl 2026-07-23) |
| `/contacto/` | `URL is unknown to Google` |

El sitemap listaba las variantes **con** barra mientras los enlaces internos y el canonical usan la forma **sin** barra → las URLs del sitemap estaban huérfanas, nada las enlazaba. Corregido en `src/pages/sitemap.xml.ts`.

**Mantener sincronizadas las 3 fuentes**: `src/pages/sitemap.xml.ts`, `Header.astro`, y la lista de URLs en `scripts/gsc-snapshot.mjs`.

## Bloqueador abierto (2026-08-03, reconfirmado 2026-09-16)

- [ ] El sitemap **nunca se ha descargado**: la API devuelve `isPending: true` y ningún campo `lastDownloaded` desde el envío del 2026-02-11 (7+ meses). Mientras 5/7 URLs sigan desconocidas para Google (`/` y `/contacto` sí indexadas), el loop SEO está optimizando páginas que Google no rastrea.
- **Comparación con Bing**: mismo sitemap, mismo dominio, mismo hosting — Bing (vía IndexNow, `scripts/indexnow-submit.mjs`) indexó las 8 URLs al instante el 2026-09-16. Solo Google falla, de forma persistente. Hipótesis más probable (no verificable desde aquí): Google aplica señales de confianza más bajas a subdominios compartidos de Cloudflare Pages (`*.pages.dev`), muy abusados para phishing/spam — el fetch del sitemap queda despriorizado indefinidamente. La solución de raíz es mover el sitio a dominio propio; hasta entonces, mitigación parcial vía Request Indexing manual por URL (ver gotcha de cuota abajo).

## Gotcha: cuota de "Solicitar indexación" se agota sin tocar el botón manual

`scripts/gsc-snapshot.mjs` llama a `urlInspection/index:inspect` (API de Search Console, vía cuenta de servicio) para las 7-8 URLs del sitio cada vez que corre el audit (`seo-audit-oneshot.mjs --all` u otro consumidor). Esa llamada automática parece compartir la misma cuota diaria por propiedad que el botón manual "Solicitar indexación" de la UI de GSC — no está documentado oficialmente por Google, pero el 2026-09-16 el audit corrió por la mañana inspeccionando las 8 URLs, y esa misma tarde un intento manual de Request Indexing para 5 URLs dio "cuota diaria superada" pese a no haberse usado el botón manual en meses.

**Cómo evitarlo**: si hay que solicitar indexación manual de un lote de URLs, hacerlo **antes** de correr `gsc-snapshot.mjs` / `seo-audit-oneshot.mjs --all` ese mismo día, no después. La cuota resetea ~24h (medianoche hora del Pacífico).

## Vídeos embebidos — no es un error

GSC muestra "El vídeo no está en una página de visualización" para el YouTube de la home. Es comportamiento esperado: Google solo indexa vídeos como resultado de vídeo si están en una página dedicada donde el vídeo es el contenido principal. El VideoObject schema está correcto (`uploadDate` ISO 8601 con timezone).

**Decisión: dejarlo así.** El vídeo se ve bien en la web y la gente lo encuentra en YouTube.
