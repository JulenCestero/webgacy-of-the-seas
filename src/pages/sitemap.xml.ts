import type { APIContext } from "astro";
import { createDb, posts } from "../lib/db";

export async function GET(context: APIContext): Promise<Response> {
  const site = "https://legacyoftheseas.pages.dev";
  const runtimeEnv = (context.locals as any).runtime?.env as Record<string, string> | undefined;
  const db = createDb(runtimeEnv);

  const allPosts = await db.select({
    slug: posts.slug,
    date: posts.date,
    updatedAt: posts.updatedAt,
  }).from(posts);

  const staticPages: Array<{ loc: string; changefreq: string; priority: string; lastmod?: string }> = [
    // No trailing slash (except root): must match the internal links in
    // Header.astro/Footer.astro and the canonical BaseLayout emits, which
    // echoes Astro.url.pathname. With trailing slashes the sitemap named URL
    // strings nothing on the site ever linked to, leaving them orphaned —
    // GSC reported all 6 as "URL is unknown to Google" (verified 2026-08-03).
    { loc: "/", changefreq: "weekly", priority: "1.0" },
    { loc: "/conciertos", changefreq: "weekly", priority: "0.8" },
    { loc: "/nosotros", changefreq: "monthly", priority: "0.7" },
    { loc: "/tienda", changefreq: "monthly", priority: "0.7" },
    { loc: "/archivo", changefreq: "weekly", priority: "0.8" },
    { loc: "/contacto", changefreq: "monthly", priority: "0.5" },
  ];

  const postEntries = allPosts.map((post) => {
    const rawDate = post.updatedAt || post.date;
    const parsed = new Date(rawDate);
    return {
      loc: `/archivo/${post.slug}`,
      changefreq: "monthly" as const,
      priority: "0.6",
      lastmod: isNaN(parsed.getTime()) ? undefined : parsed.toISOString(),
    };
  });

  const allUrls = [...staticPages, ...postEntries];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map((u) => `  <url>
    <loc>${site}${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
