import { listPosts } from '../lib/store.mjs';
import { SITE } from '../lib/blog-render.mjs';
import { escapeHtml, toPlain } from '../lib/markdown.mjs';

export default async () => {
  const posts = (await listPosts()).filter((p) => p.status === 'published').slice(0, 50);
  const build = posts[0]?.publishedAt ? new Date(posts[0].publishedAt).toUTCString() : new Date().toUTCString();

  const items = posts.map((p) => {
    const url = `${SITE.base}/blog/${p.slug}/`;
    const desc = p.excerpt || toPlain(p.content, 300);
    return `    <item>
      <title>${escapeHtml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
      <description>${escapeHtml(desc)}</description>
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>American Muffler &amp; Towing — Blog</title>
    <link>${SITE.base}/blog/</link>
    <atom:link href="${SITE.base}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Towing, auto repair, tire, and muffler tips from American Muffler &amp; Towing in Gallup, NM.</description>
    <language>en-us</language>
    <lastBuildDate>${build}</lastBuildDate>
${items}
  </channel>
</rss>`;
  return new Response(xml, { status: 200, headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate' } });
};

export const config = { path: '/rss.xml' };
