# Web Legacy of the Seas - Documentación

> Documentación técnica del desarrollo de la web oficial de Legacy of the Seas.
> Proyecto desarrollado con Claude Code (Opus 4.5) en enero 2026.

---

## Resumen del Proyecto

| Campo | Valor |
|-------|-------|
| **Stack** | Astro + Tailwind CSS |
| **CMS** | Decap CMS (git-gateway) |
| **Hosting** | Netlify |
| **Repo** | github.com/JulenCestero/webgacy-of-the-seas |
| **URL producción** | legacyoftheseas.com |

---

## Características Implementadas

### Páginas
- **Home** (`/`) - Hero con logo, Spotify embed, preview conciertos, newsletter
- **Conciertos** (`/conciertos`) - Listado separado próximos/pasados
- **Nosotros** (`/nosotros`) - Grid de miembros con modales de biografía
- **Tienda** (`/tienda`) - Merchandising con lógica de stock
- **Archivo** (`/archivo`) - Blog/noticias con páginas dinámicas
- **Contacto** (`/contacto`) - Formulario con Netlify Forms

### Diseño
- **Tema marino oscuro** con efecto de inmersión al hacer scroll
- **Colores**: turquesa (#00CED1), dorado (#d4af37), rojo oscuro (#8b0000)
- **Animaciones**: Burbujas laterales, olas SVG entre secciones, tentáculos de kraken
- **Fuentes**: Cinzel (títulos metal), Inter (cuerpo)
- **Responsive**: Mobile-first con menú hamburguesa

### Integraciones
| Servicio | Uso | Configuración |
|----------|-----|---------------|
| **Mailchimp** | Newsletter | `NewsletterSignup.astro` - ID configurado |
| **Netlify Forms** | Contacto | `data-netlify="true"` + honeypot |
| **Spotify** | Embed álbum | URI del disco "Leyendas de una Eternidad" |
| **Decap CMS** | Gestión contenido | `/admin/` con Netlify Identity |

---

## Gestión de Contenido (CMS)

### Acceso
```
URL: https://legacyoftheseas.com/admin/
Auth: Netlify Identity (login con email)
```

### Colecciones disponibles

#### Miembros (`content/members/`)
```yaml
name: "Nombre del miembro"
role: "Instrumento/Rol"
image: "/uploads/foto.jpg"
order: 1  # Orden de aparición
body: |   # Biografía en markdown
  Texto de la biografía...
```

#### Conciertos (`content/concerts/`)
```yaml
title: "Nombre del evento"
date: 2026-03-15
venue: "Nombre de la sala"
city: "Ciudad"
ticketUrl: "https://..."  # Opcional
isSoldOut: false
```

#### Tienda (`content/merch/`)
```yaml
name: "Nombre del producto"
description: "Descripción corta"
image: "/uploads/merch/producto.jpg"
price: "20€"
buyUrl: "https://..."  # Si vacío = Sin Stock
order: 1
```

#### Archivo/Blog (`content/archivo/`)
```yaml
title: "Título de la entrada"
date: 2026-01-15
image: "/uploads/portada.jpg"
excerpt: "Resumen corto"
tags: ["Noticias", "Lanzamiento"]
gallery: ["/uploads/foto1.jpg", "/uploads/foto2.jpg"]
body: |
  Contenido en markdown...
```

---

## Tienda - Comportamiento de Stock

El componente `MerchCard.astro` tiene lógica condicional:

```
SI buyUrl tiene valor:
  → Imagen normal a color
  → Botón "Comprar" → abre URL externa en nueva pestaña

SI buyUrl está vacío:
  → Imagen en escala de grises
  → Overlay "Sin Stock"
  → Botón "Contáctanos" → redirige a /contacto
```

Esto permite gestionar disponibilidad desde el CMS sin código.

---

## Estructura de Archivos

```
web-legacy/
├── src/
│   ├── components/        # Componentes Astro reutilizables
│   ├── content/           # Contenido gestionado por CMS
│   ├── layouts/           # BaseLayout con SEO
│   ├── pages/             # Rutas de la web
│   └── styles/            # CSS global
├── public/
│   ├── admin/             # Decap CMS
│   ├── uploads/           # Imágenes del CMS
│   └── images/            # Imágenes estáticas
├── netlify.toml           # Config de deploy
└── CLAUDE.md              # Documentación técnica
```

---

## Comandos Útiles

```bash
# Desarrollo local
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview

# Comprimir imagen
npx sharp input.png -o output.jpg -- resize 600 600
```

---

## Deploy

El proyecto está en Netlify con deploy automático:

1. Push a `master` → Deploy producción
2. Push a `dev` → Preview deploy

### Configuración Netlify
- Build: `npm run build`
- Publish: `dist`
- Identity: Habilitado (para CMS)
- Forms: Habilitado (para contacto)

---

## Decisiones Técnicas

### ¿Por qué Astro?
- Genera HTML estático (rápido, SEO-friendly)
- Soporta componentes sin JavaScript innecesario
- Content Collections para tipado del CMS
- Integración nativa con Tailwind

### ¿Por qué Decap CMS?
- Open source, sin backend propio
- Usa Git como base de datos
- Funciona con Netlify Identity
- Interfaz amigable para no-técnicos

### ¿Por qué no Bandsintown?
Investigado pero descartado porque:
- Duplicaría gestión de eventos (CMS ya lo hace)
- El widget tiene estilos difíciles de personalizar
- Añade dependencia externa innecesaria

Opción viable si en el futuro se usa Bandsintown activamente para promoción.

---

## Créditos

- **Desarrollo**: Claude Code (Opus 4.5) + Julen
- **Diseño**: Tema marino original
- **Artwork**: Portada "Leyendas de una Eternidad"

---

## Historial de Cambios

### 2026-01-24
- Sección de tienda con CMS
- Integración Mailchimp real
- Configuración contacto Netlify
- Documentación completa

### 2026-01-23
- Diseño visual con efecto inmersión
- Burbujas, olas, tentáculos decorativos
- Favicon con logo LS cyan
- Deploy inicial a Netlify

### 2026-01-22
- Setup inicial Astro + Tailwind
- Páginas core: Home, Conciertos, Nosotros, Contacto
- Integración Decap CMS
- SEO y Schema.org
