import crypto from 'node:crypto';
import { getSession, csrfOk } from '../lib/auth.mjs';
import { productStore, imageStore, listProducts, json } from '../lib/store.mjs';

function clean(body) {
  const name = String(body.name || '').trim().slice(0, 140);
  const category = String(body.category || 'Other').trim().slice(0, 60) || 'Other';
  const description = String(body.description || '').trim().slice(0, 2000);
  const imageUrl = String(body.imageUrl || '').trim().slice(0, 500);
  let price = Number.parseFloat(body.price);
  if (!Number.isFinite(price) || price < 0) price = 0;
  price = Math.round(price * 100) / 100;
  let stock = null;
  if (body.stock !== '' && body.stock !== null && body.stock !== undefined) {
    const s = Number.parseInt(body.stock, 10);
    stock = Number.isFinite(s) && s >= 0 ? s : null;
  }
  const active = body.active !== false && body.active !== 'false';
  const sku = String(body.sku || '').trim().slice(0, 60);
  return { name, category, description, imageUrl, price, stock, active, sku };
}

export default async (req, context) => {
  const method = req.method;
  const id = context.params?.id;

  // ---- Public read ----
  if (method === 'GET') {
    const session = getSession(req);
    const url = new URL(req.url);
    const wantAll = url.searchParams.get('all') === '1';
    const all = await listProducts();
    if (wantAll && session) {
      return json({ products: all }, 200);
    }
    // public: active only, and never leak internal stock counts as anything special
    const publicList = all.filter((p) => p.active);
    return json({ products: publicList }, 200);
  }

  // ---- Everything below requires auth ----
  const session = getSession(req);
  if (!session) return json({ error: 'Not authorized' }, 401);
  if (!csrfOk(req)) return json({ error: 'Bad request' }, 403);

  const store = productStore();

  if (method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const data = clean(body);
    if (!data.name) return json({ error: 'Product name is required' }, 400);
    const now = new Date().toISOString();
    const product = { id: crypto.randomUUID(), ...data, createdAt: now, updatedAt: now };
    await store.setJSON(product.id, product);
    return json({ product }, 201);
  }

  if (method === 'PUT') {
    if (!id) return json({ error: 'Missing id' }, 400);
    const existing = await store.get(id, { type: 'json' }).catch(() => null);
    if (!existing) return json({ error: 'Product not found' }, 404);
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const data = clean({ ...existing, ...body });
    if (!data.name) return json({ error: 'Product name is required' }, 400);
    const product = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
    await store.setJSON(id, product);
    return json({ product }, 200);
  }

  if (method === 'DELETE') {
    if (!id) return json({ error: 'Missing id' }, 400);
    const existing = await store.get(id, { type: 'json' }).catch(() => null);
    // best-effort cleanup of an owned image blob
    if (existing?.imageUrl) {
      const m = existing.imageUrl.match(/\/api\/product-image\/([A-Za-z0-9-]+)/);
      if (m) { try { await imageStore().delete(m[1]); } catch { /* ignore */ } }
    }
    await store.delete(id);
    return json({ ok: true }, 200);
  }

  return json({ error: 'Method not allowed' }, 405);
};

export const config = { path: ['/api/products', '/api/products/:id'] };
