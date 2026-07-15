import crypto from 'node:crypto';
import { getSession, csrfOk } from '../lib/auth.mjs';
import { imageStore, json } from '../lib/store.mjs';

const ALLOWED = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB after client-side resize

export default async (req, context) => {
  const method = req.method;
  const id = context.params?.id;
  const store = imageStore();

  // ---- Public: serve an image ----
  if (method === 'GET') {
    if (!id) return json({ error: 'Missing id' }, 400);
    const res = await store.getWithMetadata(id, { type: 'arrayBuffer' }).catch(() => null);
    if (!res || !res.data) return new Response('Not found', { status: 404 });
    const contentType = res.metadata?.contentType || 'application/octet-stream';
    return new Response(res.data, {
      status: 200,
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000, immutable' },
    });
  }

  // ---- Upload (auth) ----
  if (method === 'POST') {
    const session = getSession(req);
    if (!session) return json({ error: 'Not authorized' }, 401);
    if (!csrfOk(req)) return json({ error: 'Bad request' }, 403);

    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const dataUrl = body.dataUrl || '';
    const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
    if (!m) return json({ error: 'Invalid image data' }, 400);
    const contentType = m[1].toLowerCase();
    if (!ALLOWED[contentType]) return json({ error: 'Unsupported image type. Use JPG, PNG, WebP, or GIF.' }, 400);
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length === 0) return json({ error: 'Empty image' }, 400);
    if (buf.length > MAX_BYTES) return json({ error: 'Image too large (max 4 MB after resize)' }, 413);

    const imgId = crypto.randomUUID();
    await store.set(imgId, buf, { metadata: { contentType } });
    return json({ id: imgId, url: `/api/product-image/${imgId}` }, 201);
  }

  return json({ error: 'Method not allowed' }, 405);
};

export const config = { path: ['/api/product-image', '/api/product-image/:id'] };
