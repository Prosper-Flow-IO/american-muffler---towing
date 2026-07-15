import { getSession } from '../lib/auth.mjs';
import { json } from '../lib/store.mjs';

export default async (req) => {
  const session = getSession(req);
  if (!session) return json({ authenticated: false });
  return json({ authenticated: true, username: session.sub });
};

export const config = { path: '/api/session' };
