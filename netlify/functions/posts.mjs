import crypto from 'node:crypto';
import { getSession, csrfOk } from '../lib/auth.mjs';
import { postStore, listPosts, json } from '../lib/store.mjs';

function slugify(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}
async function uniqueSlug(base, selfId) {
  base = base || 'post';
  const all = await listPosts();
  const taken = new Set(all.filter((p) => p.id !== selfId).map((p) => p.slug));
  if (!taken.has(base)) return base;
  let i = 2; while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

function cleanFaqs(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) => ({ q: String(f?.q || '').trim().slice(0, 300), a: String(f?.a || '').trim().slice(0, 1200) }))
    .filter((f) => f.q && f.a)
    .slice(0, 12);
}

function clean(body) {
  return {
    title: String(body.title || '').trim().slice(0, 160),
    excerpt: String(body.excerpt || '').trim().slice(0, 300),
    content: String(body.content || '').slice(0, 60000),
    coverImage: String(body.coverImage || '').trim().slice(0, 500),
    author: String(body.author || '').trim().slice(0, 80),
    tags: Array.isArray(body.tags) ? body.tags.map((t) => String(t).trim().slice(0, 40)).filter(Boolean).slice(0, 12)
      : String(body.tags || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 12),
    faqs: cleanFaqs(body.faqs),
    status: body.status === 'published' ? 'published' : 'draft',
  };
}

export default async (req, context) => {
  const session = getSession(req);
  if (!session) return json({ error: 'Not authorized' }, 401);
  const method = req.method;
  const id = context.params?.id;
  const store = postStore();

  if (method === 'GET') return json({ posts: await listPosts() });

  if (!csrfOk(req)) return json({ error: 'Bad request' }, 403);

  if (method === 'POST') {
    let body; try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const data = clean(body);
    if (!data.title) return json({ error: 'Title is required' }, 400);
    const now = new Date().toISOString();
    const slug = await uniqueSlug(body.slug ? slugify(body.slug) : slugify(data.title), null);
    const post = {
      id: crypto.randomUUID(), slug, ...data,
      publishedAt: data.status === 'published' ? now : null,
      createdAt: now, updatedAt: now,
    };
    await store.setJSON(post.id, post);
    return json({ post }, 201);
  }

  if (method === 'PUT') {
    if (!id) return json({ error: 'Missing id' }, 400);
    const existing = await store.get(id, { type: 'json' }).catch(() => null);
    if (!existing) return json({ error: 'Post not found' }, 404);
    let body; try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const data = clean({ ...existing, ...body });
    if (!data.title) return json({ error: 'Title is required' }, 400);
    const slug = await uniqueSlug(body.slug !== undefined ? slugify(body.slug) : (existing.slug || slugify(data.title)), id);
    // set publishedAt the first time it goes live
    let publishedAt = existing.publishedAt;
    if (data.status === 'published' && !publishedAt) publishedAt = new Date().toISOString();
    if (data.status === 'draft') publishedAt = existing.status === 'published' ? existing.publishedAt : publishedAt;
    const post = { ...existing, ...data, slug, publishedAt, id, updatedAt: new Date().toISOString() };
    await store.setJSON(id, post);
    return json({ post });
  }

  if (method === 'DELETE') {
    if (!id) return json({ error: 'Missing id' }, 400);
    await store.delete(id);
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
};

export const config = { path: ['/api/posts', '/api/posts/:id'] };
