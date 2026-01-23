# Legacy of the Seas - Web Oficial

## Estado Actual

**Última actualización**: 2026-01-24

### Proyecto Completado ✅
La web está completamente funcional con todas las características implementadas.

---

## Estructura del Proyecto

```
src/
├── components/
│   ├── Header.astro           # Navegación principal con menú móvil
│   ├── Footer.astro           # Pie de página con links y redes
│   ├── Hero.astro             # Portada con logo animado
│   ├── ConcertCard.astro      # Tarjeta de concierto individual
│   ├── ConcertPreview.astro   # Preview conciertos en home
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
├── content/
│   ├── members/               # 4 miembros de la banda
│   ├── concerts/              # 4 conciertos de ejemplo
│   ├── merch/                 # 2 productos (CD + camiseta)
│   ├── archivo/               # 1 entrada de blog
│   └── settings/              # general.json, social.json
├── layouts/
│   └── BaseLayout.astro       # Layout con SEO, Schema.org, favicons
├── pages/
│   ├── index.astro            # Home con efecto inmersión
│   ├── conciertos.astro       # Listado próximos/pasados
│   ├── nosotros.astro         # Equipo con modales
│   ├── tienda.astro           # Merchandising con CMS
│   ├── contacto.astro         # Formulario Netlify Forms
│   └── archivo/               # Blog con [slug].astro
├── styles/
│   └── global.css             # Estilos, animaciones, utilidades
└── content.config.ts          # Definición colecciones Astro

public/
├── admin/
│   ├── index.html             # Decap CMS entry point
│   └── config.yml             # Colecciones y campos CMS
├── uploads/
│   └── merch/                 # Imágenes productos
├── images/
│   ├── logo/                  # logo-ls.png, logo-horizontal.png
│   └── band/                  # Fotos de la banda
├── favicon.png                # 32x32 (cyan LS)
├── favicon-192.png            # 192x192
└── apple-touch-icon.png       # 180x180

netlify.toml                   # Config deploy, headers, redirects
```

---

## Páginas

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/` | index.astro | Home con Hero, Spotify, Conciertos, Newsletter |
| `/conciertos` | conciertos.astro | Próximos y pasados conciertos |
| `/nosotros` | nosotros.astro | Miembros con biografías en modal |
| `/tienda` | tienda.astro | Merchandising con lógica stock |
| `/archivo` | archivo/index.astro | Blog/noticias |
| `/archivo/[slug]` | archivo/[slug].astro | Entrada individual |
| `/contacto` | contacto.astro | Formulario de contacto |
| `/admin` | admin/index.html | CMS (Decap) |

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

### Netlify Forms
```
Archivo: src/pages/contacto.astro
Atributo: data-netlify="true"
Honeypot: netlify-honeypot="bot-field"
```
Configurar notificaciones en: Netlify → Site → Forms → Notifications

### Spotify
```
Archivo: src/components/SpotifyEmbed.astro
Album: spotify:album:2f2fEmQkP6dBwOTNs47so9
```

---

## CMS (Decap)

**Acceso**: `https://legacyoftheseas.com/admin/`

### Colecciones
| Colección | Carpeta | Campos principales |
|-----------|---------|-------------------|
| Miembros | content/members/ | name, role, image, order, bio |
| Conciertos | content/concerts/ | title, date, venue, city, ticketUrl, isSoldOut |
| Tienda | content/merch/ | name, description, image, price, buyUrl, order |
| Archivo | content/archivo/ | title, date, image, excerpt, tags, gallery, body |
| Config | content/settings/ | general.json, social.json |

### Tienda - Lógica de stock
- **buyUrl con valor** → Imagen normal + "Comprar" → URL externa
- **buyUrl vacío** → Imagen gris + "Sin Stock" + "Contáctanos" → /contacto

---

## Comandos

```bash
npm run dev        # Desarrollo (localhost:4321)
npm run build      # Build producción
npm run preview    # Preview del build
```

---

## Deploy (Netlify)

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: 18+
- **Identity**: Habilitado (para CMS)

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

### Opción futura: Bandsintown
Investigado pero no implementado. Widget oficial disponible en artists.bandsintown.com con sincronización automática. No se implementó para evitar duplicar gestión de conciertos (ya existe en CMS).

---

## Redes Sociales (configuradas)

- Instagram: @legacy.of.the.seas
- Facebook: /legacy.of.the.seas
- YouTube: @legacyoftheseas
- Spotify: artist/0VfU5iDeWVTKfvhyos3Sih
- Bandcamp: legacy-of-the-seas.bandcamp.com
- TikTok: @legacy.of.the.seas
- X/Twitter: @legacyoftheseas
