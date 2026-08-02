// Netlify event-triggered function. The filename is the contract: Netlify runs
// `deploy-succeeded` automatically after every successful deploy, so the ping
// happens whoever deploys and however they do it — no wrapper script to forget.
//
// Pushes the current URL set to IndexNow, which Bing, Yandex and Seznam consume.
// ChatGPT Search and Copilot both lean on Bing's index, and before 2 Aug 2026
// this site had never submitted anything to it.
//
// The key is deliberately hardcoded: IndexNow validates by fetching
// https://<host>/<key>.txt from the public root, so the key is public by design
// and is not a secret. If the key file is ever rotated, change it in both places.

const KEY = '3916b323906a7d62af8bdaf82b82f5c5';
const HOST = 'www.americanmufflerandtowing.com';
const BASE = `https://${HOST}`;
const SITEMAPS = [`${BASE}/sitemap.xml`, `${BASE}/blog-sitemap.xml`];

async function urlsFrom(sitemap) {
  try {
    const res = await fetch(sitemap, { headers: { 'User-Agent': 'amt-indexnow/1.0' } });
    if (!res.ok) return [];
    const xml = await res.text();
    return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  } catch {
    return [];
  }
}

export default async (req) => {
  // Only production deploys should ping. Draft and branch deploys would submit
  // URLs that aren't live, or re-submit unchanged ones for no reason.
  let context = 'unknown';
  try {
    const body = await req.json();
    context = body?.payload?.context ?? body?.context ?? 'unknown';
  } catch {
    // Payload shape is Netlify's, not ours. If it can't be read, skip rather
    // than ping blind — a wrong submission is worse than a missed one.
  }
  if (context !== 'production') {
    return new Response(`skipped: context=${context}`, { status: 200 });
  }

  const lists = await Promise.all(SITEMAPS.map(urlsFrom));
  const urlList = [...new Set(lists.flat())].filter((u) => u.startsWith(BASE));

  if (!urlList.length) {
    // Sitemaps unreachable or empty. Submitting nothing is correct here.
    return new Response('skipped: no URLs resolved from sitemaps', { status: 200 });
  }

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${BASE}/${KEY}.txt`, urlList }),
    });
    const msg = `IndexNow ${res.status} for ${urlList.length} URLs`;
    console.log(msg);
    return new Response(msg, { status: 200 });
  } catch (err) {
    // Never fail the deploy over a submission. Log and move on.
    console.error('IndexNow ping failed:', err?.message || err);
    return new Response('IndexNow ping failed (deploy unaffected)', { status: 200 });
  }
};
