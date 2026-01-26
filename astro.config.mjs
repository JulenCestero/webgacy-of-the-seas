import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  integrations: [
    tailwind(),
    sitemap({
      filter: (page) => !page.includes('/admin/')
    })
  ],
  site: "https://legacyoftheseas.com", // Actualizar cuando tengas dominio en Cloudflare
});
