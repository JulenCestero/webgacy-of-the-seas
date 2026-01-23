# Guía de Despliegue - Legacy of the Seas

Esta guía explica cómo desplegar el sitio web en diferentes plataformas.

---

## Opción 1: Netlify (Recomendado)

Netlify es la opción recomendada porque:
- Integración nativa con el CMS (Decap CMS)
- Formularios de contacto funcionan automáticamente
- SSL gratuito
- CDN global
- Plan gratuito generoso

### Paso 1: Subir el repositorio a GitHub

```bash
# Si aún no tienes el repo en GitHub
git remote add origin https://github.com/TU-USUARIO/legacy-of-the-seas.git
git branch -M master
git push -u origin master
```

### Paso 2: Conectar con Netlify

1. Ve a [netlify.com](https://netlify.com) y crea una cuenta (puedes usar GitHub)
2. Click en **"Add new site"** → **"Import an existing project"**
3. Selecciona **GitHub** y autoriza el acceso
4. Busca y selecciona el repositorio `legacy-of-the-seas`
5. Configura el build:
   - **Branch to deploy**: `master`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Click en **"Deploy site"**

### Paso 3: Configurar dominio personalizado (opcional)

1. En el dashboard de Netlify → **"Domain settings"**
2. Click en **"Add custom domain"**
3. Introduce tu dominio (ej: `legacyoftheseas.com`)
4. Sigue las instrucciones para configurar DNS:
   - Opción A: Usar Netlify DNS (recomendado)
   - Opción B: Añadir registro CNAME apuntando a `tu-sitio.netlify.app`

### Paso 4: Habilitar Netlify Identity (para el CMS)

1. En el dashboard → **"Site configuration"** → **"Identity"**
2. Click en **"Enable Identity"**
3. En **"Registration preferences"** → selecciona **"Invite only"**
4. En **"External providers"** (opcional) → habilita Google/GitHub para login fácil
5. Click en **"Invite users"** → introduce tu email

### Paso 5: Habilitar Git Gateway (para el CMS)

1. En **"Identity"** → **"Services"**
2. En **"Git Gateway"** → click **"Enable Git Gateway"**

### Paso 6: Acceder al CMS

1. Ve a `https://tu-sitio.netlify.app/admin/`
2. Click en **"Login with Netlify Identity"**
3. La primera vez recibirás un email de confirmación
4. Una vez dentro, podrás gestionar contenido

### Verificar formulario de contacto

Los formularios con `data-netlify="true"` funcionan automáticamente.
- Ve a **"Forms"** en el dashboard para ver los envíos
- Configura notificaciones en **"Form notifications"**

---

## Opción 2: Vercel

Vercel es otra excelente opción para sitios estáticos.

### Paso 1: Conectar repositorio

1. Ve a [vercel.com](https://vercel.com) y crea una cuenta
2. Click en **"Add New Project"**
3. Importa el repositorio de GitHub
4. Vercel detectará automáticamente que es Astro
5. Click en **"Deploy"**

### Configuración adicional

```json
// vercel.json (crear en la raíz del proyecto)
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "astro"
}
```

### Limitaciones en Vercel

- El CMS (Decap) necesita configuración adicional con otro backend
- Los formularios de Netlify NO funcionan (usar alternativa como Formspree)

### Alternativa para formularios en Vercel

1. Crea cuenta en [formspree.io](https://formspree.io)
2. Crea un nuevo formulario y copia el endpoint
3. Modifica `contacto.astro`:

```html
<form action="https://formspree.io/f/TU-ID" method="POST">
```

---

## Opción 3: Self-Hosting (VPS/Servidor propio)

Para hosting en tu propio servidor (VPS, Raspberry Pi, etc).

### Requisitos

- Servidor con Linux (Ubuntu/Debian recomendado)
- Node.js 18+ instalado
- Nginx o Apache como servidor web
- Certificado SSL (Let's Encrypt gratuito)

### Paso 1: Clonar y construir

```bash
# En tu servidor
cd /var/www
git clone https://github.com/TU-USUARIO/legacy-of-the-seas.git
cd legacy-of-the-seas

# Instalar dependencias y construir
npm install
npm run build
```

### Paso 2: Configurar Nginx

```nginx
# /etc/nginx/sites-available/legacyoftheseas
server {
    listen 80;
    server_name legacyoftheseas.com www.legacyoftheseas.com;

    # Redirigir a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name legacyoftheseas.com www.legacyoftheseas.com;

    # Certificados SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/legacyoftheseas.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/legacyoftheseas.com/privkey.pem;

    # Directorio del sitio
    root /var/www/legacy-of-the-seas/dist;
    index index.html;

    # Caché para assets estáticos
    location /_astro/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Manejo de rutas
    location / {
        try_files $uri $uri/ $uri.html =404;
    }

    # Headers de seguridad
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

### Paso 3: Habilitar sitio y SSL

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/legacyoftheseas /etc/nginx/sites-enabled/

# Obtener certificado SSL con Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d legacyoftheseas.com -d www.legacyoftheseas.com

# Reiniciar Nginx
sudo nginx -t
sudo systemctl restart nginx
```

### Paso 4: Actualizar el sitio (deploy manual)

```bash
# Script de deploy: /var/www/legacy-of-the-seas/deploy.sh
#!/bin/bash
cd /var/www/legacy-of-the-seas
git pull origin master
npm install
npm run build
echo "Deploy completado: $(date)"
```

```bash
# Hacer ejecutable
chmod +x deploy.sh

# Ejecutar cuando quieras actualizar
./deploy.sh
```

### Paso 5: Deploy automático con Webhook (opcional)

Para deploy automático cuando hagas push a GitHub:

1. Instala webhook listener:
```bash
npm install -g github-webhook-handler
```

2. Crea servicio systemd o usa un script con PM2

### CMS en Self-Hosting

Para usar Decap CMS en self-hosting necesitas:

**Opción A: GitHub Backend** (sin Netlify Identity)
```yaml
# public/admin/config.yml
backend:
  name: github
  repo: TU-USUARIO/legacy-of-the-seas
  branch: master
```
Requiere crear una OAuth App en GitHub.

**Opción B: Git Gateway propio**
Más complejo, requiere configurar tu propio servidor de autenticación.

**Opción C: Editar archivos directamente**
Editar los archivos `.md` y `.json` en `src/content/` manualmente.

### Alternativa para formularios en Self-Hosting

1. Usar servicio externo (Formspree, Formspark)
2. Crear tu propio endpoint con Node.js/PHP
3. Usar Cloudflare Workers para procesar formularios

---

## Opción 4: GitHub Pages

Opción gratuita usando GitHub Pages.

### Paso 1: Configurar Astro para GitHub Pages

```javascript
// astro.config.mjs
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  integrations: [tailwind(), sitemap()],
  site: "https://TU-USUARIO.github.io",
  base: "/legacy-of-the-seas",
});
```

### Paso 2: Crear GitHub Action

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

### Paso 3: Habilitar GitHub Pages

1. Ve a **Settings** → **Pages**
2. En **Source** selecciona **GitHub Actions**

### Limitaciones

- CMS requiere configuración adicional
- Formularios no funcionan (usar Formspree)
- URL será `tu-usuario.github.io/legacy-of-the-seas` (salvo dominio custom)

---

## Opción 5: Cloudflare Pages

Alternativa rápida y gratuita con CDN global.

### Pasos

1. Ve a [pages.cloudflare.com](https://pages.cloudflare.com)
2. Conecta tu repositorio de GitHub
3. Configura:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Deploy

### Ventajas

- CDN extremadamente rápido
- Protección DDoS incluida
- Analytics gratuitos
- Workers para funciones serverless

---

## Comparativa rápida

| Plataforma | CMS Admin | Formularios | SSL | Precio |
|------------|-----------|-------------|-----|--------|
| **Netlify** | ✅ Nativo | ✅ Nativo | ✅ | Gratis* |
| Vercel | ⚠️ Config extra | ❌ Externo | ✅ | Gratis* |
| Self-Host | ⚠️ Config extra | ⚠️ Config extra | ✅ | ~5€/mes VPS |
| GitHub Pages | ⚠️ Config extra | ❌ Externo | ✅ | Gratis |
| Cloudflare | ⚠️ Config extra | ⚠️ Workers | ✅ | Gratis* |

*Planes gratuitos tienen límites de uso

---

## Recomendación

**Para este proyecto recomiendo Netlify** porque:

1. El CMS (Decap) está configurado para funcionar con Netlify Identity
2. Los formularios de contacto funcionan sin configuración adicional
3. El archivo `netlify.toml` ya está preparado
4. Es la opción más sencilla de configurar

Si prefieres self-hosting, prepárate para configurar manualmente el CMS y los formularios.
