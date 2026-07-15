import { checkLogin, issueToken, sessionCookie } from '../lib/auth.mjs';
import { json } from '../lib/store.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid request' }, 400); }
  const username = (body.username || '').trim();
  const password = body.password || '';
  if (!username || !password) return json({ error: 'Username and password required' }, 400);

  if (!(await checkLogin(username, password))) {
    return json({ error: 'Incorrect username or password' }, 401);
  }
  const token = issueToken(username);
  return json({ ok: true, username }, 200, { 'Set-Cookie': sessionCookie(token) });
};

export const config = { path: '/api/login' };
