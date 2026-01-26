# Legacy of the Seas - Web Oficial

## Estado Actual

**Última actualización**: 2026-01-26

### Cambios Recientes (2026-01-26)

**Mejoras de diseño visual:**
- **Header**: Logo LS en círculo con borde turquesa y efecto glow
- **Hero**: Logo horizontal "Legacy of the Seas" más grande con halo de luz animado
- **Footer**: Cambiado a logo LS circular (consistencia con header)
- **Tarjetas de conciertos**: Nuevo diseño con fecha prominente a la izquierda y botones más visibles
- **Tienda**: Placeholder de camiseta rediseñado (camiseta estilizada con logo LS)
- **Scroll indicator**: Reposicionado y convertido en link funcional a sección "Escúchanos"

**Distribución de logos:**
- `logo-ls.png` → Header y Footer (icono circular)
- `logo-horizontal.png` → Hero de la página principal (logo completo con texto)

---

### Migración a Contenido Dinámico (En Progreso)

La web está migrando de Decap CMS + Netlify a **Cloudflare Pages + Turso + Admin propio**.

**Rama de trabajo**: `feature/dynamic-content`

#### Fases Completadas
- [x] **Fase 1**: Setup Turso y dependencias
- [x] **Fase 2**: Esquema Drizzle ORM
- [x] **Fase 3**: Migrar Astro a SSR
- [x] **Fase 4**: Actualizar páginas para usar DB
- [x] **Fase 5**: Panel Admin básico (conciertos, miembros, tienda)
- [x] **Fase 6**: Panel Admin posts (archivo/blog)
- [x] **Fase 7**: Migrar datos existentes

#### Fases Pendientes
- [ ] **Fase 8**: Auth con Cloudflare Access
- [ ] **Fase 9**: Deploy a Cloudflare Pages
- [ ] **Fase 10**: Cleanup (eliminar Decap, content/, netlify.toml)

---

## Nueva Arquitectura (Turso + Cloudflare)

```
[Usuario Final] → [Cloudflare Pages] → [Astro SSR] → [Turso DB]
                                            ↑
[Admin editando] → [/admin/*] ──────────────┘
```

### Stack Tecnológico
- **Frontend**: Astro SSR con @astrojs/cloudflare adapter
- **Base de datos**: Turso (SQLite distribuido)
- **ORM**: Drizzle ORM (type-safe queries)
- **Hosting**: Cloudflare Pages (pendiente)
- **Auth**: Cloudflare Access (pendiente)

### Costos: $0/mes
| Servicio | Free Tier |
|----------|-----------|
| Cloudflare Pages | 500 deploys/mes, unlimited bandwidth |
| Turso | 9GB storage, 1B rows read/mes |
| Cloudflare Access | Hasta 50 usuarios |

---

## Estructura del Proyecto

```
src/
├── components/
│   ├── Header.astro           # Navegación con logo LS circular + glow
│   ├── Footer.astro           # Pie de página con logo LS circular
│   ├── Hero.astro             # Portada con logo horizontal + halo animado
│   ├── ConcertCard.astro      # Tarjeta de concierto individual
│   ├── ConcertPreview.astro   # Preview conciertos (fecha lateral + botón destacado)
│   ├── MemberCard.astro       # Tarjeta de miembro de la banda
│   ├── MemberModal.astro      # Modal con biografía expandida
│   ├── MerchCard.astro        # Tarjeta producto (con lógica stock)
│   ├── SpotifyEmbed.astro     # Embed de Spotify responsive
│   ├── SocialLinks.astro      # Links redes sociales (3 tamaños)
│   ├── NewsletterSignup.astro # Formulario Mailchimp
│   ├── WaveDivider.astro      # Separador de olas SVG animado
│   ├── KrakenTentacles.astro  # Tentáculos decorativos (abismo)
│   ├── Bubbles.astro          # Burbujas para secciones
│   ├── SideBubbles.astro      # Burbujas laterales globales
│   └── Lightbox.astro         # Galería de imágenes modal
├── layouts/
│   ├── BaseLayout.astro       # Layout con SEO, Schema.org, favicons
│   └── AdminLayout.astro      # Layout para panel de administración
├── lib/
│   ├── db.ts                  # Cliente Turso + exportaciones Drizzle
│   └── schema.ts              # Esquema de tablas Drizzle ORM
├── pages/
│   ├── index.astro            # Home con efecto inmersión
│   ├── conciertos.astro       # Listado próximos/pasados
│   ├── nosotros.astro         # Equipo con modales
│   ├── tienda.astro           # Merchandising
│   ├── contacto.astro         # Formulario Netlify Forms
│   ├── archivo/
│   │   ├── index.astro        # Blog/noticias
│   │   └── [slug].astro       # Entrada individual (SSR)
│   └── admin/
│       ├── index.astro        # Dashboard admin
│       ├── settings.astro     # Configuración general
│       ├── conciertos/        # CRUD conciertos
│       ├── miembros/          # CRUD miembros
│       ├── tienda/            # CRUD productos
│       ├── archivo/           # CRUD posts
│       └── api/               # Endpoints API (upload, delete)
├── styles/
│   └── global.css             # Estilos, animaciones, utilidades
scripts/
└── migrate.ts                 # Script migración markdown → Turso

public/
├── uploads/                   # Imágenes subidas desde admin
│   ├── band/                  # Fotos de miembros
│   ├── merch/                 # Imágenes productos
│   └── archivo/               # Imágenes de posts
├── images/
│   ├── logo/                  # logo-ls.png, logo-horizontal.png
│   └── band/                  # Fotos de la banda
├── favicon.png                # 32x32 (cyan LS)
├── favicon-192.png            # 192x192
└── apple-touch-icon.png       # 180x180
```

---

## Base de Datos (Turso)

### Tablas

```typescript
// src/lib/schema.ts
members: id, name, role, image, order, bio, createdAt, updatedAt
concerts: id, title, date, venue, city, ticketUrl, isSoldOut, description, createdAt, updatedAt
merch: id, name, description, image, price, buyUrl, order, createdAt, updatedAt
posts: id, slug, title, date, image, excerpt, tags (JSON), gallery (JSON), body, createdAt, updatedAt
settings: key, value, updatedAt
```

### Datos Actuales
| Tabla | Registros |
|-------|-----------|
| members | 4 |
| concerts | 4 |
| merch | 2 |
| posts | 1 |
| settings | 6 |

### Conexión
```typescript
// src/lib/db.ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

const client = createClient({
  url: import.meta.env.TURSO_DATABASE_URL,
  authToken: import.meta.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client);
```

---

## Panel de Administración

**Acceso**: `http://localhost:4321/admin/` (desarrollo)

### Rutas Admin
| Ruta | Descripción |
|------|-------------|
| `/admin` | Dashboard con estadísticas |
| `/admin/conciertos` | Lista de conciertos |
| `/admin/conciertos/nuevo` | Crear concierto |
| `/admin/conciertos/[id]` | Editar concierto |
| `/admin/miembros` | Lista de miembros |
| `/admin/miembros/nuevo` | Crear miembro |
| `/admin/miembros/[id]` | Editar miembro |
| `/admin/tienda` | Lista de productos |
| `/admin/tienda/nuevo` | Crear producto |
| `/admin/tienda/[id]` | Editar producto |
| `/admin/archivo` | Lista de posts |
| `/admin/archivo/nuevo` | Crear post |
| `/admin/archivo/[id]` | Editar post |
| `/admin/settings` | Configuración general |

### APIs Internas
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/admin/api/upload` | POST | Subir imagen (FormData) |
| `/admin/api/concerts/delete` | POST | Eliminar concierto |
| `/admin/api/members/delete` | POST | Eliminar miembro |
| `/admin/api/merch/delete` | POST | Eliminar producto |
| `/admin/api/posts/delete` | POST | Eliminar post |

### Características del Admin
- Tema oscuro profesional
- Formularios con secciones organizadas
- Subida de imágenes con preview
- Validación client-side y server-side
- Mensajes de éxito/error
- Zona peligrosa para eliminar (con confirmación)

---

## Páginas Públicas

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/` | index.astro | Home con Hero, Spotify, Conciertos, Newsletter |
| `/conciertos` | conciertos.astro | Próximos y pasados conciertos |
| `/nosotros` | nosotros.astro | Miembros con biografías en modal |
| `/tienda` | tienda.astro | Merchandising con lógica stock |
| `/archivo` | archivo/index.astro | Blog/noticias |
| `/archivo/[slug]` | archivo/[slug].astro | Entrada individual |
| `/contacto` | contacto.astro | Formulario de contacto |

---

## Diseño Visual

### Paleta de colores
```css
band-dark: #0a0a0a      /* Fondo principal */
band-sea: #00CED1       /* Turquesa - acento principal */
band-red: #8b0000       /* Rojo oscuro */
band-gold: #d4af37      /* Dorado - detalles */
```

### Efecto de inmersión (scroll)
```css
depth-surface: #0a1215  /* Arriba - más claro */
depth-shallow: #091418
depth-mid: #071216
depth-deep: #050f14
depth-abyss: #030a10    /* Abajo - más oscuro */
```

### Elementos decorativos
- **WaveDivider**: Olas SVG entre secciones
- **SideBubbles**: Burbujas animadas en laterales (fixed)
- **KrakenTentacles**: Tentáculos sutiles en la zona del newsletter

### Fuentes
- **Cinzel** (serif): Títulos, estilo épico/metal
- **Inter** (sans-serif): Cuerpo de texto

---

## Integraciones

### Mailchimp Newsletter
```
Archivo: src/components/NewsletterSignup.astro
URL: gmail.us2.list-manage.com
u: e65f0969bdae89ce6a523cdc2
id: dcd925529c
```

### Spotify
```
Archivo: src/components/SpotifyEmbed.astro
Album: spotify:album:2f2fEmQkP6dBwOTNs47so9
```

---

## Comandos

```bash
npm run dev        # Desarrollo (localhost:4321)
npm run build      # Build producción
npm run preview    # Preview del build

# Migraciones Drizzle
npx drizzle-kit generate    # Generar migración
npx drizzle-kit push        # Aplicar a Turso

# Migrar datos desde markdown
npx tsx scripts/migrate.ts
```

---

## Variables de Entorno

```env
# .env (no commitear)
TURSO_DATABASE_URL=libsql://legacyoftheseas-xxx.turso.io
TURSO_AUTH_TOKEN=eyJ...
```

---

## Próximos Pasos

### Fase 8: Auth con Cloudflare Access
1. Configurar aplicación en CF Zero Trust
2. Política: solo emails autorizados
3. Login con Google/GitHub
4. Probar acceso a `/admin/*`

### Fase 9: Deploy a Cloudflare Pages
1. Crear proyecto en CF Pages
2. Conectar repo GitHub
3. Variables: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
4. Build: `npm run build`
5. Output: `dist`

### Fase 10: Cleanup
1. Eliminar `public/admin/` (Decap CMS)
2. Eliminar `src/content/` (archivos markdown)
3. Eliminar `src/content.config.ts`
4. Eliminar `netlify.toml`

---

## Notas Técnicas

### Commits
```
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Optimización imágenes
- Usar `npx sharp` para comprimir
- Productos: 600x600px, JPG, ~80KB
- Comando: `npx sharp input.png -o output.jpg -- resize 600 600`

### Tienda - Lógica de stock
- **buyUrl con valor** → Imagen normal + "Comprar" → URL externa
- **buyUrl vacío** → Imagen gris + "Sin Stock" + "Contáctanos" → /contacto

---

## Redes Sociales (configuradas)

- Instagram: @legacy.of.the.seas
- Facebook: /legacy.of.the.seas
- YouTube: @legacyoftheseas
- Spotify: artist/0VfU5iDeWVTKfvhyos3Sih
- Bandcamp: legacy-of-the-seas.bandcamp.com
- TikTok: @legacy.of.the.seas
- X/Twitter: @legacyoftheseas
