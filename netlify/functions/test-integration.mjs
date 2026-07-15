import { getSession, csrfOk } from '../lib/auth.mjs';
import { json } from '../lib/store.mjs';
import { testChannel } from '../lib/notify.mjs';

export default async (req) => {
  const session = getSession(req);
  if (!session) return json({ error: 'Not authorized' }, 401);
  if (!csrfOk(req)) return json({ error: 'Bad request' }, 403);
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body; try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const channel = body.channel;
  if (!['webhook', 'email'].includes(channel)) return json({ error: 'Unknown channel' }, 400);

  const res = await testChannel(channel);
  if (res.ok) return json({ ok: true, message: `Test ${channel} sent successfully.` });
  return json({ ok: false, error: res.reason || `Test failed (status ${res.status || '?'}). Check the settings.` }, 400);
};

export const config = { path: '/api/test-integration' };
