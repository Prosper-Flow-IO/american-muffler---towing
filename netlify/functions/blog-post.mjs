import { listPosts } from '../lib/store.mjs';
import { page, SITE, businessNode, breadcrumbNode } from '../lib/blog-render.mjs';
import { mdToHtml, escapeHtml, toPlain } from '../lib/markdown.mjs';

const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

// Which towns each corridor post actually covers. Used for contentLocation.
// Add a slug here when a new town post is published; an absent slug is fine
// and simply produces no contentLocation.
const POST_PLACES = {
  'thoreau-nm-exit-53-towing-roadside': [['Thoreau', 'NM']],
  'grants-milan-towing-roadside-i40-exit-85': [['Grants', 'NM'], ['Milan', 'NM']],
  'towing-church-rock-red-rock-east-of-gallup': [['Church Rock', 'NM'], ['Red Rock', 'NM']],
  'yah-ta-hey-us-491-towing-roadside-north-gallup': [['Yah-Ta-Hey', 'NM']],
  'towing-auto-repair-window-rock-az': [['Window Rock', 'AZ']],
  'roadside-assistance-towing-fort-defiance-az': [['Fort Defiance', 'AZ']],
  'lupton-arizona-state-line-towing-i40-exit-359': [['Lupton', 'AZ']],
  'towing-across-navajo-nation-crownpoint-window-rock': [['Crownpoint', 'NM'], ['Window Rock', 'AZ']],
  'towing-roadside-nm-602-zuni-pueblo': [['Zuni', 'NM']],
  'continental-divide-i40-winter-breakdown-help': [['Thoreau', 'NM'], ['Gallup', 'NM']],
  'tires-junk-car-removal-gallup-mckinley-county': [['Gallup', 'NM']],
  'muffler-exhaust-catalytic-converter-gallup': [['Gallup', 'NM']],
  '24-7-towing-gallup-nm': [['Gallup', 'NM']],
  'what-to-do-when-your-car-breaks-down-on-i-40-near-gallup': [['Gallup', 'NM']],
  'i-40-roadside-assistance-grants-to-arizona': [['Grants', 'NM'], ['Gallup', 'NM'], ['Lupton', 'AZ']],
  'heavy-duty-semi-truck-towing-i-40': [['Gallup', 'NM']],
};

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
  const faqs = Array.isArray(post.faqs) ? post.faqs.filter((f) => f && f.q && f.a) : [];

  const cover = post.coverImage
    ? `<div class="image-frame" style="aspect-ratio:16/9;margin:0 auto 30px;max-width:820px;border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-md)"><img src="${escapeHtml(post.coverImage)}" alt="${escapeHtml(post.title)}" style="width:100%;height:100%;object-fit:cover"></div>`
    : '';
  const tags = (post.tags || []).length
    ? `<div style="margin-top:34px;display:flex;gap:8px;flex-wrap:wrap">${post.tags.map((t) => `<span style="background:#f0ece2;color:var(--ink-2);font-size:13px;font-weight:600;padding:5px 12px;border-radius:999px">${escapeHtml(t)}</span>`).join('')}</div>`
    : '';
  const faqHtml = faqs.length
    ? `<div class="prose" style="margin-top:44px"><h2>Frequently asked questions</h2><div class="faq-list">${faqs.map((f) => `<details><summary><h3>${escapeHtml(f.q)}</h3></summary><p>${escapeHtml(f.a)}</p></details>`).join('')}</div></div>`
    : '';

  // Towns each corridor post is actually about. Emitted as contentLocation so
  // engines can tie the article to a place, not just to the business.
  //
  // Deliberately name + address only, no coordinates: town centroids would be
  // guessed rather than verified, and a wrong lat/long is worse than none.
  // A slug that isn't listed simply gets no contentLocation.
  const places = (POST_PLACES[post.slug] || []).map(([locality, region]) => ({
    '@type': 'Place',
    name: `${locality}, ${region}`,
    address: { '@type': 'PostalAddress', addressLocality: locality, addressRegion: region, addressCountry: 'US' },
  }));

  // ---- Structured data: one @graph tying the article to the local business ----
  const graph = [
    businessNode(),
    {
      '@type': 'BlogPosting',
      '@id': `${url}#article`,
      isPartOf: { '@type': 'Blog', '@id': `${SITE.base}/blog/#blog`, name: `${SITE.name} Blog` },
      headline: post.title,
      name: post.title,
      description: desc,
      image: post.coverImage || SITE.image,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt || post.publishedAt,
      inLanguage: 'en-US',
      author: { '@id': `${SITE.base}/#business` },
      publisher: { '@id': `${SITE.base}/#business` },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      ...(places.length ? { contentLocation: places.length === 1 ? places[0] : places } : {}),
      ...(post.tags?.length ? { keywords: post.tags.join(', ') } : {}),
    },
    breadcrumbNode([
      { name: 'Home', url: `${SITE.base}/` },
      { name: 'Blog', url: `${SITE.base}/blog/` },
      { name: post.title, url },
    ]),
  ];
  if (faqs.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }
  const jsonld = { '@context': 'https://schema.org', '@graph': graph };

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
    ${faqHtml}
    <div style="max-width:780px;margin:36px auto 0;display:flex;gap:12px;flex-wrap:wrap">
      <a class="btn btn-ghost" href="/blog/" style="background:var(--ink);color:#fff">← Back to blog</a>
      <a class="btn btn-ghost" href="/service-areas/">Service areas across the I-40 corridor</a>
    </div>
  </div>
</section>`;

  const html = page({
    title: `${post.title} | American Muffler & Towing`,
    description: desc, canonical: url, ogImage: post.coverImage || SITE.image,
    headExtra: `<meta property="article:published_time" content="${post.publishedAt}" />\n<meta property="article:modified_time" content="${post.updatedAt || post.publishedAt}" />\n<script type="application/ld+json">${JSON.stringify(jsonld)}</script>`,
    main,
  });
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate' } });
};

export const config = { path: ['/blog/:slug', '/blog/:slug/'] };
