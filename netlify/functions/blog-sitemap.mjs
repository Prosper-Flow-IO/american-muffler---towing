import { listPosts } from '../lib/store.mjs';
import { SITE } from '../lib/blog-render.mjs';

export default async () => {
  const posts = (await listPosts()).filter((p) => p.status === 'published');
  const urls = [
    `  <url><loc>${SITE.base}/blog/</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
    ...posts.map((p) => {
      const lastmod = (p.updatedAt || p.publishedAt || '').slice(0, 10);
      return `  <url><loc>${SITE.base}/blog/${p.slug}/</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<changefreq>monthly</changefreq><priority>0.6</priority></url>`;
    }),
  ].join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
  return new Response(xml, { status: 200, headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate' } });
};

export const config = { path: '/blog-sitemap.xml' };
