import crypto from 'node:crypto';
import { getSession, csrfOk } from '../lib/auth.mjs';
import { leadStore, listLeads, json } from '../lib/store.mjs';

const STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost'];

function clean(body) {
  return {
    name: String(body.name || '').trim().slice(0, 120),
    phone: String(body.phone || '').trim().slice(0, 40),
    email: String(body.email || '').trim().slice(0, 160),
    service: String(body.service || '').trim().slice(0, 80),
    message: String(body.message || '').trim().slice(0, 2000),
  };
}

export default async (req, context) => {
  const session = getSession(req);
  if (!session) return json({ error: 'Not authorized' }, 401);
  const method = req.method;
  const id = context.params?.id;
  const store = leadStore();

  if (method === 'GET') {
    return json({ leads: await listLeads() });
  }

  if (!csrfOk(req)) return json({ error: 'Bad request' }, 403);

  if (method === 'POST') {
    let body; try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const data = clean(body);
    if (!data.name) return json({ error: 'Name is required' }, 400);
    const now = new Date().toISOString();
    const lead = { id: crypto.randomUUID(), ...data, source: (body.source || 'manual'), status: 'new', notes: [], createdAt: now, updatedAt: now };
    await store.setJSON(lead.id, lead);
    return json({ lead }, 201);
  }

  if (method === 'PUT') {
    if (!id) return json({ error: 'Missing id' }, 400);
    const existing = await store.get(id, { type: 'json' }).catch(() => null);
    if (!existing) return json({ error: 'Lead not found' }, 404);
    let body; try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const patch = {};
    if (body.status && STATUSES.includes(body.status)) patch.status = body.status;
    ['name', 'phone', 'email', 'service', 'message'].forEach((k) => {
      if (body[k] !== undefined) patch[k] = String(body[k]).slice(0, 2000);
    });
    let notes = Array.isArray(existing.notes) ? existing.notes.slice() : [];
    if (body.addNote && String(body.addNote).trim()) {
      notes.push({ ts: new Date().toISOString(), text: String(body.addNote).trim().slice(0, 1000) });
    }
    const lead = { ...existing, ...patch, notes, id, updatedAt: new Date().toISOString() };
    await store.setJSON(id, lead);
    return json({ lead });
  }

  if (method === 'DELETE') {
    if (!id) return json({ error: 'Missing id' }, 400);
    await store.delete(id);
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
};

export const config = { path: ['/api/leads', '/api/leads/:id'] };
