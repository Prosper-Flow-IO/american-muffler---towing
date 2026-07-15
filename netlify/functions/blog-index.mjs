import { listPosts } from '../lib/store.mjs';
import { page, SITE } from '../lib/blog-render.mjs';
import { escapeHtml, toPlain } from '../lib/markdown.mjs';

const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

export default async () => {
  const posts = (await listPosts()).filter((p) => p.status === 'published');

  const cards = posts.map((p) => {
    const img = p.coverImage
      ? `<div class="img"><img src="${escapeHtml(p.coverImage)}" alt="${escapeHtml(p.title)}" loading="lazy"></div>`
      : `<div class="img" style="background:linear-gradient(135deg,#151A22,#2a2f38);display:grid;place-items:center"><span style="font-family:Archivo,sans-serif;font-weight:900;color:rgba(255,255,255,.18);font-size:40px">A</span></div>`;
    return `<a class="card card-img" href="/blog/${escapeHtml(p.slug)}/">
      ${img}
      <div class="body">
        <div style="color:var(--muted);font-size:13px;font-weight:600;margin-bottom:8px">${fmt(p.publishedAt)}</div>
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.excerpt || toPlain(p.content, 140))}</p>
        <span class="more">Read more</span>
      </div>
    </a>`;
  }).join('\n');

  const main = `
<section class="page-hero">
  <div class="container">
    <div class="breadcrumbs"><a href="/">Home</a><span class="sep">/</span>Blog</div>
    <p class="eyebrow" style="color:#FF5063;">From the shop</p>
    <h1>Tips, guides &amp; news from the garage</h1>
    <p class="lede">Straight talk on towing, repairs, tires, and staying road-ready across Gallup and the I-40 corridor.</p>
  </div>
</section>
<section>
  <div class="container">
    ${posts.length
      ? `<div class="grid grid-3">${cards}</div>`
      : `<div style="text-align:center;padding:40px 20px;color:var(--muted)"><h2 style="color:var(--ink)">Posts coming soon</h2><p>We're putting together helpful guides for Gallup drivers. Check back shortly — or <a href="/contact/" style="color:var(--accent);font-weight:700">get in touch</a>.</p></div>`}
  </div>
</section>`;

  const html = page({
    title: 'Blog — Towing, Repair & Tire Tips in Gallup, NM | American Muffler & Towing',
    description: 'Guides and tips on towing, auto repair, tires, and mufflers from American Muffler & Towing in Gallup, NM.',
    canonical: `${SITE.base}/blog/`,
    main,
  });
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate' } });
};

export const config = { path: ['/blog', '/blog/'] };
