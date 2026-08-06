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

## Bloqueador abierto (2026-08-03)

- [ ] El sitemap **nunca se ha descargado**: la API devuelve `isPending: true` y ningún campo `lastDownloaded` desde el envío del 2026-02-11 (~6 meses). Mientras 6/7 URLs sigan desconocidas para Google, el loop SEO está optimizando páginas que Google no rastrea.

## Vídeos embebidos — no es un error

GSC muestra "El vídeo no está en una página de visualización" para el YouTube de la home. Es comportamiento esperado: Google solo indexa vídeos como resultado de vídeo si están en una página dedicada donde el vídeo es el contenido principal. El VideoObject schema está correcto (`uploadDate` ISO 8601 con timezone).

**Decisión: dejarlo así.** El vídeo se ve bien en la web y la gente lo encuentra en YouTube.
