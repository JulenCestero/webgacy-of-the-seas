# Legacy of the Seas — Web Oficial

Web de la banda. Astro SSR sobre Cloudflare Pages con Turso como DB. Migrada desde Decap CMS + Netlify (completada); el admin es propio, en `/admin/*`.

```
[Usuario] → [Cloudflare Pages] → [Astro SSR] → [Turso DB]
[Admin]   → [/admin/*] ─────────────────────────┘
```

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Astro SSR + `@astrojs/cloudflare` |
| DB | Turso (SQLite distribuido) |
| ORM | Drizzle (type-safe) |
| Hosting | Cloudflare Pages |
| Auth admin | Cloudflare Access |

Coste: **$0/mes** — todo dentro de free tier (Pages 500 deploys/mes, Turso 9GB / 1B rows read, Access hasta 50 usuarios).

## Dónde está cada cosa

| Necesitas | Ve a |
|---|---|
| Estado SEO, indexación, gotcha de barra final | `docs/seo-state.md` |
| Informe completo de auditoría SEO | `docs/seo-audit.md` |
| Auditoría on-demand de una URL | skill `/seo-audit <url\|path>` |
| Deploy | `docs/deploy-guide.md` |
| Identidad visual completa | `docs/identidad-visual.md` |
| Uso del admin | `docs/cms-guide.md` |
| Esquema de tablas | `src/lib/schema.ts` |
| Cliente DB | `src/lib/db.ts` |
| Docs de librerías | **context7** (MCP) antes que web |

Rutas admin (`/admin/{conciertos,miembros,tienda,archivo}` con `nuevo` / `[id]`, más `/admin/settings`) y APIs internas (`/admin/api/{upload,concerts/delete,members/delete,merch/delete,posts/delete}`) siguen el mismo patrón CRUD — mirar `src/pages/admin/` en vez de listarlas aquí.

## Base de datos (Turso)

```typescript
// src/lib/schema.ts
members:  id, name, role, image, order, bio, createdAt, updatedAt
concerts: id, title, date, venue, city, ticketUrl, isSoldOut, description, createdAt, updatedAt
merch:    id, name, description, image, price, buyUrl, order, createdAt, updatedAt
posts:    id, slug, title, date, image, excerpt, tags (JSON), gallery (JSON), body, createdAt, updatedAt
settings: key, value, updatedAt
```

`settings` alimenta también las redes sociales, editables desde `/admin/settings` y leídas por `SocialLinks.astro`.

## Comandos

```bash
npm run dev        # localhost:4321
npm run build      # build producción
npm run preview

npx drizzle-kit generate   # generar migración
npx drizzle-kit push       # aplicar a Turso
npx tsx scripts/migrate.ts # migrar datos desde markdown (histórico)
```

## Variables de entorno (`.env`, no commitear)

```env
TURSO_DATABASE_URL=libsql://legacyoftheseas-xxx.turso.io
TURSO_AUTH_TOKEN=eyJ...
```

## Diseño

```css
band-dark: #0a0a0a   band-sea: #00CED1   band-red: #8b0000   band-gold: #d4af37
/* gradiente de inmersión por scroll, de arriba a abajo */
depth-surface: #0a1215  depth-shallow: #091418  depth-mid: #071216
depth-deep: #050f14     depth-abyss: #030a10
```

Fuentes: **Cinzel** (serif) para títulos, **Inter** para cuerpo. Decorativos: `WaveDivider` (olas SVG entre secciones), `SideBubbles` (fixed, laterales), `KrakenTentacles` (zona newsletter).

Logos: `logo-ls.png` → header y footer (icono circular con borde turquesa + glow); `logo-horizontal.png` → hero (con halo animado).

## Gotchas

**Push** — el repo usa HTTPS con token de `.envrc`, no la cuenta `gh`:
```bash
source .envrc && git push https://${GH_TOKEN}@github.com/JulenCestero/webgacy-of-the-seas.git master
```

**Lógica de stock en tienda** — `buyUrl` con valor → imagen normal + "Comprar" a URL externa. `buyUrl` vacío → imagen gris + "Sin Stock" + "Contáctanos" a `/contacto`.

**Imágenes de producto** — 600x600px, JPG, ~80KB: `npx sharp input.png -o output.jpg -- resize 600 600`.

**Integraciones hardcodeadas** — Mailchimp en `NewsletterSignup.astro` (`gmail.us2.list-manage.com`, u=`e65f0969bdae89ce6a523cdc2`, id=`dcd925529c`); Spotify en `SpotifyEmbed.astro` (album `2f2fEmQkP6dBwOTNs47so9`).

**Commits** — `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`
