// Server-rendered shop catalogue.
//
// This page used to be a static shell that fetched /api/products client-side and
// injected the grid with innerHTML. Googlebot renders JS so it saw the products,
// but GPTBot, ClaudeBot and PerplexityBot do not — and robots.txt disallows
// /api/, so there was no fallback route to the data either. To every AI crawler
// the page was 102 words ending in "Loading products...".
//
// Rendering server-side fixes that and makes Product/Offer schema meaningful,
// since client-injected JSON-LD would have been invisible to the same crawlers.
import { listProducts } from '../lib/store.mjs';
import { page, SITE, businessNode, breadcrumbNode } from '../lib/blog-render.mjs';
import { escapeHtml } from '../lib/markdown.mjs';

const PHONE = 'tel:+15058635990';

const money = (n) =>
  '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PLACEHOLDER =
  '<div class="pimg placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">' +
  '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>';

const PHONE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.35 1.84.59 2.8.72A2 2 0 0 1 22 16.92Z"/></svg>';

function stockTag(p) {
  if (p.stock === null || p.stock === undefined) return '';
  if (p.stock <= 0) return '<span class="stock-tag stock-out">Sold out</span>';
  if (p.stock <= 3) return `<span class="stock-tag stock-low">Only ${p.stock} left</span>`;
  return '<span class="stock-tag stock-in">In stock</span>';
}

function card(p) {
  const img = p.imageUrl
    ? `<div class="pimg"><img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.name)}" loading="lazy"></div>`
    : PLACEHOLDER;
  const price = p.price > 0 ? money(p.price) : '<small>Call for price</small>';
  return `<article class="product-card" data-cat="${escapeHtml(p.category || 'Other')}" data-name="${escapeHtml(
    `${p.name} ${p.description || ''} ${p.category || ''}`.toLowerCase(),
  )}">${img}<div class="pbody"><h3>${escapeHtml(p.name)}</h3><p class="pdesc">${escapeHtml(
    p.description || '',
  )}</p><div class="pmeta"><span class="price">${price}</span>${stockTag(p)}</div>` +
    `<a class="pcta" href="${PHONE}">${PHONE_SVG}Call to order</a></div></article>`;
}

// Product/Offer nodes. Price is omitted rather than guessed when the shop has
// not set one — a $0 offer would be a false statement about what they charge.
function productNode(p, i) {
  const node = {
    '@type': 'Product',
    '@id': `${SITE.base}/shop/#product-${p.id}`,
    name: p.name,
    category: p.category || 'Other',
  };
  if (p.description) node.description = p.description;
  if (p.imageUrl) node.image = p.imageUrl;
  if (p.sku) node.sku = p.sku;
  if (p.price > 0) {
    const offer = {
      '@type': 'Offer',
      price: p.price.toFixed(2),
      priceCurrency: 'USD',
      url: `${SITE.base}/shop/`,
      seller: { '@id': `${SITE.base}/#business` },
    };
    if (p.stock !== null && p.stock !== undefined) {
      offer.availability = p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
    }
    node.offers = offer;
  }
  return { '@type': 'ListItem', position: i + 1, item: node };
}

export default async () => {
  let products = [];
  let loadFailed = false;
  try {
    products = (await listProducts()).filter((p) => p.active !== false);
  } catch {
    loadFailed = true;
  }

  const groups = {};
  products.forEach((p) => {
    const c = p.category || 'Other';
    (groups[c] = groups[c] || []).push(p);
  });
  const cats = Object.keys(groups).sort();

  const chips = ['All', ...cats]
    .map((c) => `<button class="chip${c === 'All' ? ' active' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`)
    .join('');

  const catalog = cats
    .map(
      (c) =>
        `<div class="cat-block" data-cat="${escapeHtml(c)}"><div class="cat-head"><h2>${escapeHtml(c)}</h2>` +
        `<span>${groups[c].length} item${groups[c].length === 1 ? '' : 's'}</span></div>` +
        `<div class="grid grid-3">${groups[c].map(card).join('')}</div></div>`,
    )
    .join('\n');

  const empty = loadFailed
    ? `<div class="shop-empty"><h2>Couldn't load the catalog</h2><p>Please refresh, or call us and we'll help you out right away.</p><a class="btn btn-primary" href="${PHONE}">Call (505) 863-5990</a></div>`
    : `<div class="shop-empty"><h2>Products coming soon</h2><p>We're loading our shelves into the site. In the meantime, call us for tires, mufflers, exhaust parts, and more — we've got plenty in the shop.</p><a class="btn btn-primary" href="${PHONE}">Call (505) 863-5990</a></div>`;

  const main = `
<section class="page-hero">
  <div class="container">
    <div class="breadcrumbs"><a href="/">Home</a><span class="sep">/</span>Shop</div>
    <p class="eyebrow" style="color:#FF5063;">In stock in Gallup</p>
    <h1>Tires, mufflers &amp; parts — ready when you are</h1>
    <p class="lede">Browse what we carry in the shop. See something you need? Call and we'll set it aside, quote installation, or get it on your vehicle the same day.</p>
    <div class="hero-ctas"><a class="btn btn-primary" href="${PHONE}">Call to order</a></div>
  </div>
</section>

<section>
  <div class="container">
    ${products.length ? `<div class="shop-toolbar" id="toolbar">
      <div class="shop-filters" id="filters">${chips}</div>
      <input class="shop-search" id="search" type="search" placeholder="Search products&hellip;" aria-label="Search products" />
    </div>` : ''}
    <div id="catalog">${products.length ? catalog : empty}</div>
    <div class="shop-empty" id="noresults" hidden><h2>Nothing matches that</h2><p>Try another category or give us a call — if we don't have it on the shelf, we can usually get it fast.</p><a class="btn btn-primary" href="${PHONE}">Call (505) 863-5990</a></div>
  </div>
</section>

<script>
// Filtering only. The catalogue itself is server-rendered above, so the page is
// complete without this script ever running.
(function () {
  var filters = document.getElementById('filters');
  var search = document.getElementById('search');
  var noresults = document.getElementById('noresults');
  if (!filters || !search) return;
  var cards = Array.prototype.slice.call(document.querySelectorAll('.product-card'));
  var blocks = Array.prototype.slice.call(document.querySelectorAll('.cat-block'));
  var activeCat = 'All';

  function apply() {
    var q = search.value.trim().toLowerCase();
    var shown = 0;
    cards.forEach(function (el) {
      var okCat = activeCat === 'All' || el.dataset.cat === activeCat;
      var okQ = !q || el.dataset.name.indexOf(q) !== -1;
      var vis = okCat && okQ;
      el.hidden = !vis;
      if (vis) shown++;
    });
    blocks.forEach(function (b) {
      b.hidden = !b.querySelector('.product-card:not([hidden])');
    });
    noresults.hidden = shown > 0;
  }

  filters.addEventListener('click', function (e) {
    var btn = e.target.closest('.chip');
    if (!btn) return;
    activeCat = btn.dataset.cat;
    filters.querySelectorAll('.chip').forEach(function (b) { b.classList.toggle('active', b === btn); });
    apply();
  });
  search.addEventListener('input', apply);
})();
</script>`;

  const graph = [
    businessNode(),
    breadcrumbNode([
      { name: 'Home', url: `${SITE.base}/` },
      { name: 'Shop', url: `${SITE.base}/shop/` },
    ]),
  ];
  if (products.length) {
    graph.push({
      '@type': 'ItemList',
      '@id': `${SITE.base}/shop/#catalog`,
      name: 'Parts & accessories in stock',
      numberOfItems: products.length,
      itemListElement: products.map(productNode),
    });
  }

  const html = page({
    title: 'Shop — Tires, Mufflers & Parts in Gallup, NM | American Muffler & Towing',
    description:
      'Browse tires, mufflers, exhaust parts, and accessories in stock at American Muffler & Towing in Gallup, NM. Call (505) 863-5990 to order or reserve.',
    canonical: `${SITE.base}/shop/`,
    ogType: 'website',
    navCurrent: '/shop/',
    headExtra: `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': graph,
    }).replace(/</g, '\\u003c')}</script>`,
    main,
  });

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate' },
  });
};

export const config = { path: ['/shop', '/shop/'] };
