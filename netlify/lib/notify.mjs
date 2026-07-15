// Fan-out notifications for a new lead across configured channels.
import webpush from 'web-push';
import { pushStore, listAll, getConfig } from './store.mjs';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:xolby1@gmail.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try { webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE); } catch { /* ignore */ }
}

function leadSummary(lead) {
  const bits = [lead.service && `Service: ${lead.service}`, lead.phone && `📞 ${lead.phone}`, lead.email && `✉ ${lead.email}`]
    .filter(Boolean).join('  ·  ');
  return `${bits}${lead.message ? `\n"${lead.message}"` : ''}`;
}

// ---- Web Push ----
async function sendPush(lead) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return { channel: 'push', ok: false, reason: 'not configured' };
  const store = pushStore();
  const { blobs } = await store.list();
  if (!blobs.length) return { channel: 'push', ok: false, reason: 'no subscribers' };
  const payload = JSON.stringify({
    title: `New ${lead.source === 'towing' ? 'tow request' : 'lead'}: ${lead.name}`,
    body: leadSummary(lead),
    url: '/admin/#leads',
  });
  let sent = 0;
  await Promise.all(blobs.map(async (b) => {
    const sub = await store.get(b.key, { type: 'json' }).catch(() => null);
    if (!sub) return;
    try {
      await webpush.sendNotification(sub, payload);
      sent++;
    } catch (err) {
      // clean up dead subscriptions
      if (err?.statusCode === 404 || err?.statusCode === 410) { await store.delete(b.key).catch(() => {}); }
    }
  }));
  return { channel: 'push', ok: sent > 0, sent };
}

// ---- Webhook (Slack / Discord / Zapier / generic) ----
async function sendWebhook(lead, wh) {
  if (!wh?.enabled || !wh.url) return { channel: 'webhook', ok: false, reason: 'not configured' };
  const isSlack = /hooks\.slack\.com/.test(wh.url);
  const isDiscord = /discord(app)?\.com\/api\/webhooks/.test(wh.url);
  const text = `🔔 *New ${lead.source === 'towing' ? 'TOW REQUEST' : 'lead'} — ${lead.name}*\n${leadSummary(lead)}`;
  let body;
  if (isSlack) body = { text };
  else if (isDiscord) body = { content: text };
  else body = { type: 'new_lead', lead, text }; // generic / Zapier
  try {
    const r = await fetch(wh.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { channel: 'webhook', ok: r.ok, status: r.status };
  } catch (err) {
    return { channel: 'webhook', ok: false, reason: String(err) };
  }
}

// ---- Email via Resend ----
async function sendEmail(lead, em) {
  if (!em?.enabled || !em.apiKey || !em.to) return { channel: 'email', ok: false, reason: 'not configured' };
  const to = String(em.to).split(',').map((s) => s.trim()).filter(Boolean);
  const from = em.from || 'American Muffler & Towing <onboarding@resend.dev>';
  const html = `
    <h2>New ${lead.source === 'towing' ? 'tow request' : 'lead'}</h2>
    <p><strong>Name:</strong> ${esc(lead.name)}</p>
    ${lead.phone ? `<p><strong>Phone:</strong> <a href="tel:${esc(lead.phone)}">${esc(lead.phone)}</a></p>` : ''}
    ${lead.email ? `<p><strong>Email:</strong> <a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a></p>` : ''}
    ${lead.service ? `<p><strong>Service:</strong> ${esc(lead.service)}</p>` : ''}
    ${lead.message ? `<p><strong>Message:</strong><br>${esc(lead.message)}</p>` : ''}
    <p style="color:#888;font-size:12px">Submitted ${esc(lead.createdAt)} · via americanmufflerandtowing.com</p>`;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${em.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject: `New ${lead.source === 'towing' ? 'tow request' : 'lead'}: ${lead.name}`, html }),
    });
    return { channel: 'email', ok: r.ok, status: r.status };
  } catch (err) {
    return { channel: 'email', ok: false, reason: String(err) };
  }
}

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

export async function notifyNewLead(lead) {
  const cfg = await getConfig();
  const integ = cfg.integrations || {};
  const results = await Promise.allSettled([
    sendPush(lead),
    sendWebhook(lead, integ.webhook),
    sendEmail(lead, integ.email),
  ]);
  return results.map((r) => (r.status === 'fulfilled' ? r.value : { ok: false, reason: String(r.reason) }));
}

export function vapidPublicKey() { return VAPID_PUBLIC; }

// Send a sample lead through ONE channel so the Integrations "Test" button can verify it.
export async function testChannel(channel) {
  const cfg = await getConfig();
  const integ = cfg.integrations || {};
  const sample = {
    name: 'Test Lead (Jane Doe)', phone: '(505) 555-0142', email: 'test@example.com',
    service: 'Towing', message: 'This is a test message from your dashboard — everything is wired up!',
    source: 'test', status: 'new', createdAt: new Date().toISOString(),
  };
  if (channel === 'webhook') return sendWebhook(sample, integ.webhook);
  if (channel === 'email') return sendEmail(sample, integ.email);
  return { ok: false, reason: 'Unknown channel' };
}

export async function sendTestPush() {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return { ok: false, reason: 'Push not configured on server' };
  const store = pushStore();
  const { blobs } = await store.list();
  if (!blobs.length) return { ok: false, reason: 'No devices subscribed yet' };
  const payload = JSON.stringify({ title: 'Test notification ✅', body: 'Push is working. New leads will ping here.', url: '/admin/#leads' });
  let sent = 0;
  await Promise.all(blobs.map(async (b) => {
    const sub = await store.get(b.key, { type: 'json' }).catch(() => null);
    if (!sub) return;
    try { await webpush.sendNotification(sub, payload); sent++; }
    catch (err) { if (err?.statusCode === 404 || err?.statusCode === 410) await store.delete(b.key).catch(() => {}); }
  }));
  return { ok: sent > 0, sent };
}
