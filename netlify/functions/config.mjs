import { getSession, csrfOk } from '../lib/auth.mjs';
import { getConfig, saveConfig, pushStore, json } from '../lib/store.mjs';
import { vapidPublicKey } from '../lib/notify.mjs';

function mask(val) {
  if (!val) return '';
  const s = String(val);
  return s.length <= 8 ? '••••' : '••••' + s.slice(-4);
}

export default async (req) => {
  const session = getSession(req);
  if (!session) return json({ error: 'Not authorized' }, 401);

  const cfg = await getConfig();

  if (req.method === 'GET') {
    const wh = cfg.integrations?.webhook || {};
    const em = cfg.integrations?.email || {};
    let subCount = 0;
    try { subCount = (await pushStore().list()).blobs.length; } catch { /* ignore */ }
    return json({
      business: cfg.business || { name: 'American Muffler & Towing', phone: '(505) 863-5990', email: '', address: '827 N 9th Street, Gallup, NM 87301', hours: 'Mon–Sat 9am–5pm · Tow line 24/7' },
      integrations: {
        webhook: { enabled: !!wh.enabled, urlSet: !!wh.url, urlHint: mask(wh.url) },
        email: { enabled: !!em.enabled, apiKeySet: !!em.apiKey, apiKeyHint: mask(em.apiKey), from: em.from || '', to: em.to || '' },
        push: { available: !!vapidPublicKey(), vapidPublicKey: vapidPublicKey(), subscribers: subCount },
      },
      admin: { user: cfg.admin?.user || process.env.ADMIN_USER || 'admin' },
    });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    if (!csrfOk(req)) return json({ error: 'Bad request' }, 403);
    let body; try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const next = { ...cfg };
    next.integrations = { ...(cfg.integrations || {}) };

    if (body.business) {
      next.business = {
        name: String(body.business.name || '').slice(0, 120),
        phone: String(body.business.phone || '').slice(0, 40),
        email: String(body.business.email || '').slice(0, 160),
        address: String(body.business.address || '').slice(0, 200),
        hours: String(body.business.hours || '').slice(0, 200),
      };
    }
    if (body.webhook) {
      const cur = cfg.integrations?.webhook || {};
      next.integrations.webhook = {
        enabled: !!body.webhook.enabled,
        url: (body.webhook.url && body.webhook.url.trim()) ? body.webhook.url.trim().slice(0, 500) : cur.url || '',
      };
    }
    if (body.email) {
      const cur = cfg.integrations?.email || {};
      next.integrations.email = {
        enabled: !!body.email.enabled,
        apiKey: (body.email.apiKey && body.email.apiKey.trim()) ? body.email.apiKey.trim().slice(0, 200) : cur.apiKey || '',
        from: String(body.email.from || cur.from || '').slice(0, 200),
        to: String(body.email.to || cur.to || '').slice(0, 400),
      };
    }
    next.updatedAt = new Date().toISOString();
    await saveConfig(next);
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
};

export const config = { path: '/api/config' };
