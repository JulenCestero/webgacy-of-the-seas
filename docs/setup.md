# Setup del Proyecto - Legacy of the Seas

## Descripción

Sitio web para la banda de metal "Legacy of the Seas" construido con Astro y Tailwind CSS.

## Stack Tecnológico

- **Framework**: Astro 5.1.1
- **CSS**: Tailwind CSS 3.4.17 con dark mode
- **Despliegue**: Netlify (planeado)
- **CMS**: Decap CMS (planeado)

## Estructura del Proyecto

```
src/
├── components/     # Componentes reutilizables (Header, Footer, etc.)
├── content/        # Colecciones de contenido
│   ├── members/    # Miembros de la banda (Markdown)
│   └── concerts/   # Conciertos (Markdown)
├── layouts/        # Layouts base
├── pages/          # Páginas del sitio
└── styles/         # Estilos globales
```

## Colecciones de Contenido

### Members (Miembros)
```yaml
name: string        # Nombre del miembro
role: string        # Rol/instrumento
image: string?      # Imagen (opcional)
order: number       # Orden de aparición (default: 0)
```

### Concerts (Conciertos)
```yaml
title: string       # Título del evento
date: date          # Fecha del concierto
venue: string       # Lugar/sala
city: string        # Ciudad
ticketUrl: string?  # URL de compra de entradas (opcional)
isSoldOut: boolean  # Agotado (default: false)
```

## Comandos

```bash
npm install         # Instalar dependencias
npm run dev         # Servidor de desarrollo
npm run build       # Build de producción
npm run preview     # Preview del build
```

## Configuración

### Tailwind CSS
- Archivo: `tailwind.config.mjs`
- Dark mode habilitado via clase `class="dark"`
- Content paths configurados para archivos Astro

### Astro
- Archivo: `astro.config.mjs`
- Site URL: https://legacyoftheseas.netlify.app
- Integración Tailwind activa

## Historial de Cambios

### 2026-01-22
- Inicialización del proyecto Astro
- Configuración de Tailwind CSS con dark mode
- Definición de colecciones de contenido (members, concerts)
- Página index básica
