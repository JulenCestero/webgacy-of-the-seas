# Auditoría SEO - Legacy of the Seas

**Fecha de auditoría**: 2026-01-29
**Sitio**: https://legacyoftheseas.pages.dev
**Auditoría anterior**: 2026-01-26

---

## Resumen Ejecutivo

| Aspecto | Estado | Puntuación |
|---------|--------|------------|
| Crawlability | ✅ Bien | 8/10 |
| Indexación | 🔴 Problema | 4/10 |
| Technical SEO | ✅ Bien | 8/10 |
| On-Page SEO | ✅ Bien | 8/10 |
| Schema.org | ✅ Excelente | 9/10 |
| Contenido | ⚠️ Mejorable | 6/10 |

### Top 5 Problemas Prioritarios

1. **CRÍTICO**: El sitio NO está indexado en Google
2. **ALTO**: Sitemap sin fechas `<lastmod>`
3. **ALTO**: Posts del blog no incluidos en sitemap
4. **ALTO**: Formulario de contacto usa Netlify Forms (no funciona en Cloudflare)
5. **MEDIO**: Falta hreflang para contenido en español

---

## 1. Crawlability e Indexación

### ✅ Robots.txt - Correcto

```txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /r2/

Sitemap: https://legacyoftheseas.pages.dev/sitemap-index.xml
```

- Bloquea correctamente `/admin/` y `/r2/`
- Referencia al sitemap correcta

### ⚠️ Sitemap - Problemas Detectados

**URLs actuales en sitemap (6):**
- `/` ✅
- `/archivo/` ✅
- `/conciertos/` ✅
- `/contacto/` ✅
- `/nosotros/` ✅
- `/tienda/` ✅

**Problemas identificados:**

| Problema | Impacto | Recomendación |
|----------|---------|---------------|
| Sin `<lastmod>` en URLs | ALTO | Añadir fechas de última modificación |
| Posts individuales no incluidos | ALTO | `/archivo/[slug]` debe estar en sitemap |
| Sin `<changefreq>` | BAJO | Opcional pero recomendado |

### 🔴 Indexación - CRÍTICO

**Estado actual**: El sitio NO aparece indexado en Google

Búsqueda `site:legacyoftheseas.pages.dev` = **0 resultados**

**Posibles causas:**
1. Sitio relativamente nuevo (migrado recientemente a Cloudflare Pages)
2. No hay backlinks externos apuntando al dominio pages.dev
3. Google Search Console pendiente de procesar sitemap

**Acciones inmediatas requeridas:**
1. Verificar en Google Search Console que el sitemap fue procesado
2. Solicitar indexación manual de las páginas principales
3. Actualizar URLs en perfiles externos (Metal Archives, redes sociales)

**Presencia externa actual de la banda:**
- [Metal Archives](https://www.metal-archives.com/bands/Legacy_of_the_Seas/3540520810) - Sin link a web oficial
- [Instagram](https://www.instagram.com/legacy.of.the.seas/)
- [Bandcamp](https://legacy-of-the-seas.bandcamp.com/)
- [Apple Music](https://music.apple.com/us/artist/legacy-of-the-seas/1672386882)

---

## 2. Technical SEO

### ✅ HTTPS
- SSL activo via Cloudflare
- Servidor respondiendo correctamente (HTTP 200)

### ✅ Headers de Seguridad

Configurados en `public/_headers`:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

### ✅ Caching

| Recurso | Cache-Control |
|---------|---------------|
| JS/CSS | `max-age=31536000, immutable` |
| Imágenes | `max-age=31536000, immutable` |
| Sitemap | `max-age=3600` |

### ✅ Canonical URLs

Implementado correctamente en `BaseLayout.astro`:

```javascript
const canonicalURL = new URL(Astro.url.pathname, Astro.site);
```

```html
<link rel="canonical" href={canonicalURL} />
```

### ⚠️ Hreflang - No implementado

- El sitio declara `lang="es"` ✅
- Falta `<link rel="alternate" hreflang="es-ES">` para indicar región específica

**Recomendación**: Añadir en BaseLayout.astro:

```html
<link rel="alternate" hreflang="es-ES" href={canonicalURL} />
<link rel="alternate" hreflang="x-default" href={canonicalURL} />
```

---

## 3. On-Page SEO

### Title Tags

| Página | Title | Longitud | Estado |
|--------|-------|----------|--------|
| Home | Metal Sinfónico desde las Profundidades \| Legacy of the Seas | 58 | ✅ |
| Conciertos | Conciertos \| Legacy of the Seas | 33 | ✅ |
| Nosotros | Nosotros \| Legacy of the Seas | 31 | ✅ |
| Tienda | Tienda \| Legacy of the Seas | 28 | ✅ |
| Contacto | Contacto \| Legacy of the Seas | 30 | ✅ |
| Archivo | Archivo \| Legacy of the Seas | 29 | ✅ |

**Veredicto**: Todos los títulos son únicos y dentro del límite óptimo (50-60 chars) ✅

### Meta Descriptions

| Página | Description | Estado |
|--------|-------------|--------|
| Home | Banda de Metal Sinfónico con influencias Folk y Power desde 2010. Música épica desde las profundidades del océano. | ✅ |
| Conciertos | Próximos conciertos y fechas de la gira de Legacy of the Seas. Compra tus entradas y no te pierdas el directo. | ✅ |
| Nosotros | Conoce a la tripulación de Legacy of the Seas. Historia, miembros e influencias de la banda de metal más épica del panorama. | ✅ |
| Tienda | Consigue el merchandising oficial de Legacy of the Seas. CDs, camisetas y más. | ✅ |
| Contacto | Contacta con Legacy of the Seas para booking, prensa o cualquier consulta. Estamos aquí para ayudarte. | ✅ |
| Archivo | Historia, relatos y memorias de Legacy of the Seas. Fotos de conciertos, anécdotas y todo lo que hemos vivido. | ✅ |

**Veredicto**: Todas las páginas tienen meta description única y descriptiva ✅

### Heading Structure

| Página | H1 | Jerarquía | Estado |
|--------|-----|-----------|--------|
| Home | Legacy of the Seas - Banda de Metal Sinfónico (sr-only) | H1 → H2 | ✅ |
| Conciertos | Conciertos | H1 → H2 | ✅ |
| Nosotros | La Tripulación | H1 → H2 | ✅ |
| Tienda | Tienda | H1 → H2 | ✅ |
| Contacto | Contacto | H1 → H2 | ✅ |
| Archivo | Archivo | H1 → H2 | ✅ |
| Post individual | [Título del post] | H1 → H2 | ✅ |

**Veredicto**: Estructura de headings correcta en todas las páginas ✅

---

## 4. Schema.org (Structured Data)

### Implementación Excelente ✅

| Página | Schemas Implementados |
|--------|----------------------|
| Todas las páginas | MusicGroup (en BaseLayout) |
| Home | + VideoObject (YouTube embed) |
| Conciertos | + MusicEvent[] (cada concierto) |
| Tienda | + Product[] (cada producto) |
| Archivo/[slug] | + BlogPosting + BreadcrumbList |

### MusicGroup Schema (Global)

```json
{
  "@type": "MusicGroup",
  "name": "Legacy of the Seas",
  "description": "Banda de Metal Sinfónico de Donostia con influencias folk, symphonic y power",
  "url": "https://legacyoftheseas.pages.dev",
  "genre": ["Metal Sinfónico", "Folk Metal", "Symphonic Metal", "Power Metal"],
  "foundingDate": "2010",
  "foundingLocation": {
    "@type": "Place",
    "name": "Donostia, Euskadi, España"
  },
  "sameAs": [
    "https://instagram.com/legacy.of.the.seas",
    "https://www.facebook.com/legacy.of.the.seas/",
    "https://www.youtube.com/@legacyoftheseas",
    "https://open.spotify.com/artist/0VfU5iDeWVTKfvhyos3Sih",
    "https://legacy-of-the-seas.bandcamp.com/",
    "https://tiktok.com/@legacy.of.the.seas",
    "https://x.com/legacyoftheseas"
  ]
}
```

### MusicEvent Schema (Conciertos)

Cada concierto próximo genera:
- name, startDate, location ✅
- performer (MusicGroup) ✅
- offers con availability (InStock/SoldOut) ✅

### Product Schema (Tienda)

Cada producto incluye:
- name, description, image ✅
- brand (Legacy of the Seas) ✅
- offers con price, priceCurrency, availability ✅

### BlogPosting + BreadcrumbList (Posts)

Cada post del archivo incluye:
- headline, datePublished, dateModified ✅
- author, publisher ✅
- mainEntityOfPage ✅
- BreadcrumbList (Inicio → Archivo → Post) ✅

---

## 5. Open Graph & Social

### Implementación Correcta ✅

```html
<meta property="og:type" content="website" />
<meta property="og:url" content="{canonicalURL}" />
<meta property="og:title" content="{title} | Legacy of the Seas" />
<meta property="og:description" content="{description}" />
<meta property="og:image" content="/og-image.jpg" />
<meta property="og:locale" content="es_ES" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{title} | Legacy of the Seas" />
<meta name="twitter:description" content="{description}" />
<meta name="twitter:image" content="/og-image.jpg" />
```

- og:image existe: `public/og-image.jpg` ✅
- og:locale configurado: `es_ES` ✅
- Twitter Cards: `summary_large_image` ✅

---

## 6. Contenido

### Estado Actual

| Sección | Items | Evaluación |
|---------|-------|------------|
| Posts (Archivo) | 1 | ⚠️ Muy poco contenido |
| Productos | 2 | ⚠️ Poco contenido |
| Conciertos | 4 (1 futuro, 3 pasados) | ✅ OK |
| Miembros | 4 | ✅ OK |

### Recomendaciones de Contenido

1. **Blog/Archivo**: Crear posts regulares
   - Crónicas de cada concierto
   - Proceso de grabación del álbum
   - Historias detrás de las canciones
   - Entrevistas y apariciones en prensa

2. **Discografía**: Crear página dedicada
   - Letras de canciones (muy bueno para SEO)
   - Credits de cada disco
   - Enlaces a plataformas de streaming

3. **Páginas de miembros individuales**: Expandir biografías
   - Equipamiento
   - Influencias personales
   - Proyectos paralelos

---

## 7. Problemas Críticos a Resolver

### 🔴 Formulario de Contacto No Funcional

**Archivo**: `src/pages/contacto.astro`

```html
<form
  name="contact"
  method="POST"
  data-netlify="true"        <!-- ❌ No funciona en Cloudflare -->
  netlify-honeypot="bot-field"
>
```

**Problema**: El formulario usa atributos de Netlify Forms pero el sitio está en Cloudflare Pages.

**Soluciones posibles**:
1. Implementar Cloudflare Pages Function para procesar el formulario
2. Usar servicio externo (Formspree, EmailJS, Web3Forms)
3. Implementar envío directo por email con API

### 🔴 Sitio No Indexado

**Acciones inmediatas**:
1. Acceder a Google Search Console
2. Verificar estado del sitemap enviado
3. Solicitar indexación manual de páginas principales
4. Esperar 24-48h y volver a verificar

---

## Plan de Acción Priorizado

### 🔴 Crítico (Esta semana)

| Acción | Responsable | Estado |
|--------|-------------|--------|
| Verificar Google Search Console | - | ⬜ Pendiente |
| Arreglar formulario de contacto | Dev | ⬜ Pendiente |
| Solicitar indexación manual | - | ⬜ Pendiente |

### 🟠 Alto (Próximas 2 semanas)

| Acción | Responsable | Estado |
|--------|-------------|--------|
| Añadir `<lastmod>` al sitemap | Dev | ⬜ Pendiente |
| Incluir posts en sitemap | Dev | ⬜ Pendiente |
| Actualizar Metal Archives con URL web | Banda | ⬜ Pendiente |
| Añadir hreflang tags | Dev | ⬜ Pendiente |

### 🟡 Medio (Próximo mes)

| Acción | Responsable | Estado |
|--------|-------------|--------|
| Crear más contenido en Archivo | Banda | ⬜ Pendiente |
| Crear página de discografía | Dev | ⬜ Pendiente |
| Añadir letras de canciones | Banda | ⬜ Pendiente |

---

## Mejoras Técnicas Sugeridas

### Sitemap con lastmod

Modificar `astro.config.mjs`:

```javascript
sitemap({
  filter: (page) => !page.includes('/admin/'),
  serialize(item) {
    return {
      ...item,
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: item.url === '/' ? 1.0 : 0.8
    };
  }
})
```

### Hreflang Tags

Añadir en `BaseLayout.astro`:

```html
<link rel="alternate" hreflang="es-ES" href={canonicalURL} />
<link rel="alternate" hreflang="x-default" href={canonicalURL} />
```

### Formulario con Formspree (ejemplo)

```html
<form action="https://formspree.io/f/{form-id}" method="POST">
  <input type="text" name="name" required />
  <input type="email" name="email" required />
  <textarea name="message" required></textarea>
  <button type="submit">Enviar</button>
</form>
```

---

## Keywords Objetivo

| Keyword | Vol. Est. | Dificultad | Página Target |
|---------|-----------|------------|---------------|
| legacy of the seas | Bajo | Baja | Home |
| legacy of the seas band | Bajo | Baja | Nosotros |
| legacy of the seas metal | Bajo | Baja | Home |
| metal sinfonico donostia | Muy bajo | Muy baja | Home |
| metal sinfonico euskadi | Muy bajo | Muy baja | Home |
| leyendas de una eternidad album | Muy bajo | Muy baja | Tienda |
| leyendas de una eternidad legacy | Muy bajo | Muy baja | Archivo |

---

## Herramientas de Monitoreo

### Obligatorias
- [Google Search Console](https://search.google.com/search-console) - Indexación y errores
- [Google Rich Results Test](https://search.google.com/test/rich-results) - Validar schemas

### Recomendadas
- [PageSpeed Insights](https://pagespeed.web.dev/) - Core Web Vitals
- [Schema Markup Validator](https://validator.schema.org/) - Validar JSON-LD
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) - Verificar OG tags

---

## Historial de Auditorías

| Fecha | Cambios Principales |
|-------|---------------------|
| 2026-01-26 | Auditoría inicial, implementación de schemas, robots.txt, headers |
| 2026-01-29 | Auditoría de seguimiento, detectado problema de indexación y formulario |

---

*Auditoría realizada por Claude Code*
*Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>*
