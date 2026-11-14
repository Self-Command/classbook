self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = { title: '', body: '', url: '/notifications', tag: '' };

  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    payload.body = event.data ? event.data.text() : '有一条新消息';
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || '拾光同学录', {
      body: payload.body,
      tag: payload.tag || undefined,
      data: { url: payload.url || '/notifications' },
      vibrate: [80, 60, 80],
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const target = event.notification.data?.url || '/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const absolute = new URL(target, self.registration.scope).href;

      for (const client of clients) {
        if (client.url === absolute && 'focus' in client) return client.focus();
      }

      return self.clients.openWindow(absolute);
    }),
  );
});