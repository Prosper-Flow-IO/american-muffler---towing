// Auth helpers — Node built-in crypto for hashing/tokens.
// Password hashing via scrypt; session tokens via HMAC-signed JSON (mini-JWT).
// Admin credentials come from Blobs config if set (self-service password change),
// otherwise fall back to the ADMIN_USER / ADMIN_PASSWORD_HASH env vars.
import crypto from 'node:crypto';
import { getConfig } from './store.mjs';

const SECRET = process.env.SESSION_SECRET || 'dev-insecure-secret-change-me';
const ENV_ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ENV_ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const COOKIE_NAME = 'amt_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64');
}

// ---- password hashing (salt:derivedKey, both hex) ----
export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(String(password), salt, 64);
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}
export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [saltHex, keyHex] = stored.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(keyHex, 'hex');
  const derived = crypto.scryptSync(String(password), salt, expected.length);
  return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
}

// ---- session tokens ----
function sign(payloadB64) {
  return b64url(crypto.createHmac('sha256', SECRET).update(payloadB64).digest());
}
export function issueToken(username) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: username, iat: now, exp: now + SESSION_TTL_SECONDS };
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64)}`;
}
export function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payloadB64, sig] = token.split('.');
  const expected = sign(payloadB64);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  let payload;
  try { payload = JSON.parse(b64urlDecode(payloadB64).toString('utf8')); } catch { return null; }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// ---- cookies ----
export function parseCookies(req) {
  const header = req.headers.get('cookie') || '';
  const out = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}
export function sessionCookie(token) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
}
export function clearCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

// ---- request auth ----
export function getSession(req) {
  const cookies = parseCookies(req);
  return verifyToken(cookies[COOKIE_NAME]);
}
// state-changing requests must carry this header (blocks form-based CSRF)
export function csrfOk(req) {
  return req.headers.get('x-amt-admin') === '1';
}
// resolve admin credentials: Blobs config override wins, else env vars
export async function getAdminCreds() {
  const cfg = await getConfig();
  const a = cfg.admin || {};
  return {
    user: a.user || ENV_ADMIN_USER,
    hash: a.passwordHash || ENV_ADMIN_PASSWORD_HASH,
  };
}
export async function checkLogin(username, password) {
  const creds = await getAdminCreds();
  if (username !== creds.user) return false;
  return verifyPassword(password, creds.hash);
}
