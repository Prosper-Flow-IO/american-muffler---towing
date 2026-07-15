import { listPosts } from '../lib/store.mjs';
import { page, SITE } from '../lib/blog-render.mjs';
import { mdToHtml, escapeHtml, toPlain } from '../lib/markdown.mjs';

const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

export default async (req, context) => {
  const slug = context.params?.slug;
  const posts = await listPosts();
  const post = posts.find((p) => p.slug === slug && p.status === 'published');

  if (!post) {
    const main = `<section class="page-hero"><div class="container"><div class="breadcrumbs"><a href="/">Home</a><span class="sep">/</span><a href="/blog/">Blog</a></div><h1>Post not found</h1><p class="lede">That article isn't here. Browse the <a href="/blog/" style="color:#fff;text-decoration:underline">blog</a> or <a href="/contact/" style="color:#fff;text-decoration:underline">get in touch</a>.</p></div></section>`;
    const html = page({ title: 'Not found | American Muffler & Towing', description: 'Page not found.', canonical: `${SITE.base}/blog/`, main, headExtra: '<meta name="robots" content="noindex">' });
    return new Response(html, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const desc = post.excerpt || toPlain(post.content, 160);
  const url = `${SITE.base}/blog/${post.slug}/`;
  const cover = post.coverImage
    ? `<div class="image-frame" style="aspect-ratio:16/9;margin:0 auto 30px;max-width:820px;border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-md)"><img src="${escapeHtml(post.coverImage)}" alt="${escapeHtml(post.title)}" style="width:100%;height:100%;object-fit:cover"></div>`
    : '';
  const tags = (post.tags || []).length
    ? `<div style="margin-top:34px;display:flex;gap:8px;flex-wrap:wrap">${post.tags.map((t) => `<span style="background:#f0ece2;color:var(--ink-2);font-size:13px;font-weight:600;padding:5px 12px;border-radius:999px">${escapeHtml(t)}</span>`).join('')}</div>`
    : '';

  const schema = {
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title,
    datePublished: post.publishedAt, dateModified: post.updatedAt,
    author: { '@type': 'Organization', name: SITE.name }, publisher: { '@type': 'Organization', name: SITE.name },
    mainEntityOfPage: url, ...(post.coverImage ? { image: post.coverImage } : {}), description: desc,
  };

  const main = `
<section class="page-hero">
  <div class="container">
    <div class="breadcrumbs"><a href="/">Home</a><span class="sep">/</span><a href="/blog/">Blog</a></div>
    <h1>${escapeHtml(post.title)}</h1>
    <p class="lede" style="margin-bottom:8px">${escapeHtml(desc)}</p>
    <div style="color:#9aa2b1;font-size:14px">${fmt(post.publishedAt)}${post.author ? ' · ' + escapeHtml(post.author) : ''}</div>
  </div>
</section>
<section>
  <div class="container">
    ${cover}
    <article class="prose">${mdToHtml(post.content)}${tags}</article>
    <div style="max-width:780px;margin:36px auto 0"><a class="btn btn-ghost" href="/blog/" style="background:var(--ink);color:#fff">← Back to blog</a></div>
  </div>
</section>`;

  const html = page({
    title: `${post.title} | American Muffler & Towing`,
    description: desc, canonical: url, ogImage: post.coverImage || SITE.icon,
    headExtra: `<meta property="article:published_time" content="${post.publishedAt}" />\n<script type="application/ld+json">${JSON.stringify(schema)}</script>`,
    main,
  });
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate' } });
};

export const config = { path: ['/blog/:slug', '/blog/:slug/'] };
