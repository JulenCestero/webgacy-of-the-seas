import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  output: "server",
  adapter: cloudflare({
    routes: {
      extend: {
        exclude: [
          { pattern: "/sitemap-index.xml" },
          { pattern: "/sitemap-0.xml" },
          { pattern: "/robots.txt" },
        ],
      },
    },
  }),
  integrations: [
    tailwind(),
    sitemap({
      filter: (page) => !page.includes('/admin/') && !page.includes('sync-conflict'),
      customPages: [
        'https://legacyoftheseas.pages.dev/archivo/lanzamiento-leyendas'
      ],
      serialize(item) {
        const isHome = item.url === 'https://legacyoftheseas.pages.dev/';
        return {
          ...item,
          lastmod: new Date().toISOString(),
          changefreq: isHome ? 'weekly' : 'monthly',
          priority: isHome ? 1.0 : 0.7
        };
      }
    })
  ],
  site: "https://legacyoftheseas.pages.dev",
});
