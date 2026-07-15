import { getSession, csrfOk, getAdminCreds, verifyPassword, hashPassword } from '../lib/auth.mjs';
import { getConfig, saveConfig, json } from '../lib/store.mjs';

export default async (req) => {
  const session = getSession(req);
  if (!session) return json({ error: 'Not authorized' }, 401);
  if (!csrfOk(req)) return json({ error: 'Bad request' }, 403);
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body; try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const current = body.currentPassword || '';
  const next = body.newPassword || '';
  const newUser = (body.newUsername || '').trim();

  const creds = await getAdminCreds();
  if (!verifyPassword(current, creds.hash)) return json({ error: 'Current password is incorrect' }, 401);
  if (String(next).length < 8) return json({ error: 'New password must be at least 8 characters' }, 400);

  const cfg = await getConfig();
  cfg.admin = { user: newUser || creds.user, passwordHash: hashPassword(next) };
  await saveConfig(cfg);
  return json({ ok: true, user: cfg.admin.user });
};

export const config = { path: '/api/change-password' };
