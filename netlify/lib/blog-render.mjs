// Shared server-side HTML shell for public blog pages — matches the static site.
export const SITE = {
  name: 'American Muffler & Towing',
  base: 'https://www.americanmufflerandtowing.com',
  phone: '+15058635990',
  phoneDisplay: '(505) 863-5990',
  icon: 'https://assets.cdn.filesafe.space/kst2bkxitM1nA0d1KJd4/media/69e7fc386fc69286f3b76ef1.jpeg',
  image: 'https://assets.cdn.filesafe.space/kst2bkxitM1nA0d1KJd4/media/69e7fc385e482c379bc6a675.jpeg',
};

// Canonical business entity — reused by @id across all blog pages so search &
// AI engines resolve every article to one clear local business.
export function businessNode() {
  return {
    '@type': ['AutomotiveBusiness', 'AutoRepair', 'TowingService'],
    '@id': `${SITE.base}/#business`,
    name: SITE.name,
    url: `${SITE.base}/`,
    telephone: '+1-505-863-5990',
    priceRange: '$$',
    foundingDate: '2012',
    image: SITE.image,
    logo: { '@type': 'ImageObject', url: SITE.icon },
    address: { '@type': 'PostalAddress', streetAddress: '827 N 9th St', addressLocality: 'Gallup', addressRegion: 'NM', postalCode: '87301', addressCountry: 'US' },
    geo: { '@type': 'GeoCoordinates', latitude: 35.5370, longitude: -108.7389 },
    openingHours: ['Mo-Sa 09:00-17:00'],
    areaServed: ['Gallup NM', 'Church Rock NM', 'Thoreau NM', 'Grants NM', 'Milan NM', 'Yah-Ta-Hey NM', 'Zuni NM', 'Crownpoint NM', 'Window Rock AZ', 'Fort Defiance AZ', 'Lupton AZ', 'I-40 Corridor', 'Navajo Nation']
      .map((n) => ({ '@type': 'Place', name: n })),
    sameAs: ['https://www.facebook.com/p/American-Muffler-and-Towing-100054548645014/', 'https://www.yelp.com/biz/american-muffler-and-towing-gallup-2'],
  };
}

export function breadcrumbNode(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
  };
}

const PHONE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.35 1.84.59 2.8.72A2 2 0 0 1 22 16.92Z"/></svg>';

function header() {
  return `<div class="emergency" role="status" aria-live="polite">
  Broke down? Our tow line answers 24/7 — <a href="tel:${SITE.phone}">call ${SITE.phoneDisplay}</a>
</div>
<header class="site-header">
  <div class="container nav">
    <a href="/" class="brand" aria-label="${SITE.name} home"><span class="mark" aria-hidden="true">A</span><span>American Muffler &amp; Towing<small>Gallup, NM · Since 2012</small></span></a>
    <nav aria-label="Primary"><ul>
      <li><a href="/services/">Services</a></li>
      <li><a href="/shop/">Shop</a></li>
      <li><a href="/blog/" aria-current="page">Blog</a></li>
      <li><a href="/service-areas/">Service Areas</a></li>
      <li><a href="/about/">About</a></li>
      <li><a href="/contact/">Contact</a></li>
    </ul></nav>
    <a class="call-btn" href="tel:${SITE.phone}" aria-label="Call ${SITE.phoneDisplay}">${PHONE_SVG} ${SITE.phoneDisplay}</a>
  </div>
</header>`;
}

function footer() {
  return `<section class="cta-band"><div class="container">
  <p class="eyebrow" style="color:#FF5063;">We answer every call</p>
  <h2>Need a tow or a repair? Call us right now.</h2>
  <p>A real person on the line, every time — 24/7 for towing and roadside.</p>
  <a class="btn btn-primary" href="tel:${SITE.phone}">Call ${SITE.phoneDisplay}</a>
</div></section>
<footer><div class="container">
  <div class="foot-grid">
    <div>
      <div class="brand" style="color:#fff;margin-bottom:14px;"><span class="mark" aria-hidden="true">A</span><span>American Muffler &amp; Towing<small>Gallup, NM · Since 2012</small></span></div>
      <p style="color:#9aa2b1;margin-bottom:8px;">827 N 9th Street<br>Gallup, NM 87301</p>
      <p style="color:#9aa2b1;margin-bottom:8px;">Office: Mon–Sat 9am–5pm<br>Tow line: 24/7</p>
      <p><a href="tel:${SITE.phone}" style="color:#fff;font-weight:700;">${SITE.phoneDisplay}</a></p>
    </div>
    <div><h4>Services</h4><ul>
      <li><a href="/services/towing/">Towing</a></li>
      <li><a href="/services/roadside-assistance/">Roadside Assistance</a></li>
      <li><a href="/services/auto-repair/">Auto Repair</a></li>
      <li><a href="/services/muffler-exhaust/">Muffler &amp; Exhaust</a></li>
      <li><a href="/services/tires/">New &amp; Used Tires</a></li>
      <li><a href="/services/junk-car-removal/">Junk Car Removal</a></li>
    </ul></div>
    <div><h4>Explore</h4><ul>
      <li><a href="/blog/">Blog</a></li>
      <li><a href="/shop/">Shop</a></li>
      <li><a href="/reviews/">Reviews</a></li>
      <li><a href="/service-areas/">Service Areas</a></li>
    </ul></div>
    <div><h4>Company</h4><ul>
      <li><a href="/about/">About</a></li>
      <li><a href="/contact/">Contact</a></li>
      <li><a href="/rss.xml">RSS feed</a></li>
    </ul></div>
  </div>
  <div class="foot-bottom"><div>© ${new Date().getFullYear()} American Muffler &amp; Towing · Gallup, NM</div><div>Family-owned &amp; operated on Route 66</div></div>
</div></footer>
<a class="mobile-call" href="tel:${SITE.phone}" aria-label="Call ${SITE.phoneDisplay}">
  <div class="icon" aria-hidden="true">${PHONE_SVG}</div>
  <div><small>24/7 tow line · tap to call</small><div class="number">${SITE.phoneDisplay}</div></div>
  <div aria-hidden="true" style="font-size:22px;font-weight:900;">›</div>
</a>`;
}

export function page({ title, description, canonical, ogImage, headExtra = '', main }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<meta name="description" content="${description}" />
<meta name="robots" content="index,follow,max-image-preview:large" />
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="American Muffler &amp; Towing" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${canonical}" />
${ogImage ? `<meta property="og:image" content="${ogImage}" />\n<meta name="twitter:card" content="summary_large_image" />` : ''}
<link rel="alternate" type="application/rss+xml" title="American Muffler &amp; Towing Blog" href="${SITE.base}/rss.xml" />
<link rel="icon" href="${SITE.icon}" />
<link rel="stylesheet" href="/assets/css/site.css" />
${headExtra}
</head>
<body>
${header()}
${main}
${footer()}
<script>var y=document.getElementById('year');if(y)y.textContent=new Date().getFullYear();</script>
</body>
</html>`;
}
