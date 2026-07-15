// PUBLIC endpoint — website contact / tow-request forms post here.
import crypto from 'node:crypto';
import { leadStore, json } from '../lib/store.mjs';
import { notifyNewLead } from '../lib/notify.mjs';

const SERVICES = ['Towing', 'Roadside Assistance', 'Auto Repair', 'Muffler & Exhaust', 'Tires', 'Junk Car Removal', 'Other'];

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body;
  try {
    const ct = req.headers.get('content-type') || '';
    if (ct.includes('application/json')) body = await req.json();
    else body = Object.fromEntries((await req.formData()).entries());
  } catch { return json({ error: 'Invalid submission' }, 400); }

  // honeypot: real users never fill this hidden field
  if (body.company) return json({ ok: true });

  const name = String(body.name || '').trim().slice(0, 120);
  const phone = String(body.phone || '').trim().slice(0, 40);
  const email = String(body.email || '').trim().slice(0, 160);
  const message = String(body.message || '').trim().slice(0, 2000);
  let service = String(body.service || '').trim().slice(0, 80);
  if (service && !SERVICES.includes(service)) service = service.slice(0, 80);
  const source = String(body.source || 'contact-form').trim().slice(0, 40);

  if (!name || (!phone && !email)) {
    return json({ error: 'Please include your name and a phone or email.' }, 400);
  }

  const now = new Date().toISOString();
  const lead = { id: crypto.randomUUID(), name, phone, email, service, message, source, status: 'new', notes: [], createdAt: now, updatedAt: now };
  await leadStore().setJSON(lead.id, lead);

  // fire notifications, but never fail the visitor's submission on a notify error
  let notified = [];
  try { notified = await notifyNewLead(lead); } catch { /* ignore */ }

  return json({ ok: true, notified: notified.filter((n) => n && n.ok).map((n) => n.channel) }, 201);
};

export const config = { path: '/api/lead-submit' };
