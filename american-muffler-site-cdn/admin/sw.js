// Service worker for the AM&T admin PWA — handles web push + notification clicks.
const VERSION = 'amt-admin-v1';

self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

// Required for installability; pass-through (dashboard is online-only).
self.addEventListener('fetch', () => {});

self.addEventListener('push', (event) => {
  let data = { title: 'New lead', body: 'You have a new lead.', url: '/admin/#leads' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/admin/icon.svg',
      badge: '/admin/icon.svg',
      tag: 'amt-lead',
      renotify: true,
      data: { url: data.url || '/admin/#leads' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/admin/#leads';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if (c.url.includes('/admin') && 'focus' in c) { c.navigate(url); return c.focus(); } }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
