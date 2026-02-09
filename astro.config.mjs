import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  output: "server",
  adapter: cloudflare({
    routes: {
      extend: {
        exclude: [
          { pattern: "/robots.txt" },
        ],
      },
    },
  }),
  integrations: [
    tailwind(),
  ],
  site: "https://legacyoftheseas.pages.dev",
});
