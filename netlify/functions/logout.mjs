import { clearCookie } from '../lib/auth.mjs';
import { json } from '../lib/store.mjs';

export default async () => {
  return json({ ok: true }, 200, { 'Set-Cookie': clearCookie() });
};

export const config = { path: '/api/logout' };
