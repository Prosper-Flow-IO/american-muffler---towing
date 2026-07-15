import crypto from 'node:crypto';
import { getSession, csrfOk } from '../lib/auth.mjs';
import { pushStore, json } from '../lib/store.mjs';
import { sendTestPush } from '../lib/notify.mjs';

const keyFor = (endpoint) => crypto.createHash('sha256').update(String(endpoint)).digest('hex');

export default async (req) => {
  const session = getSession(req);
  if (!session) return json({ error: 'Not authorized' }, 401);
  if (!csrfOk(req)) return json({ error: 'Bad request' }, 403);
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const action = new URL(req.url).pathname.split('/').pop();
  const store = pushStore();

  if (action === 'subscribe') {
    let body; try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const sub = body.subscription;
    if (!sub || !sub.endpoint) return json({ error: 'Invalid subscription' }, 400);
    await store.setJSON(keyFor(sub.endpoint), sub);
    return json({ ok: true });
  }

  if (action === 'unsubscribe') {
    let body; try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    if (body.endpoint) await store.delete(keyFor(body.endpoint)).catch(() => {});
    return json({ ok: true });
  }

  if (action === 'test') {
    const res = await sendTestPush();
    return json(res, res.ok ? 200 : 400);
  }

  return json({ error: 'Unknown action' }, 404);
};

export const config = { path: ['/api/push/subscribe', '/api/push/unsubscribe', '/api/push/test'] };
