// Netlify Blobs wrappers.
import { getStore } from '@netlify/blobs';

export function productStore() { return getStore({ name: 'products', consistency: 'strong' }); }
export function imageStore()   { return getStore({ name: 'product-images', consistency: 'strong' }); }
export function leadStore()    { return getStore({ name: 'leads', consistency: 'strong' }); }
export function configStore()  { return getStore({ name: 'config', consistency: 'strong' }); }
export function pushStore()    { return getStore({ name: 'push-subs', consistency: 'strong' }); }
export function postStore()    { return getStore({ name: 'posts', consistency: 'strong' }); }

const CONFIG_KEY = 'settings';

export async function getConfig() {
  const raw = await configStore().get(CONFIG_KEY, { type: 'json' }).catch(() => null);
  return raw || {};
}
export async function saveConfig(cfg) {
  await configStore().setJSON(CONFIG_KEY, cfg);
  return cfg;
}

export async function listAll(store) {
  const { blobs } = await store.list();
  const items = await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' }).catch(() => null)));
  return items.filter(Boolean);
}

export async function listProducts() {
  const items = await listAll(productStore());
  return items.sort((a, b) =>
    (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || ''));
}

export async function listLeads() {
  const items = await listAll(leadStore());
  return items.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export async function listPosts() {
  const items = await listAll(postStore());
  return items.sort((a, b) => String(b.publishedAt || b.createdAt || '').localeCompare(String(a.publishedAt || a.createdAt || '')));
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extraHeaders },
  });
}
