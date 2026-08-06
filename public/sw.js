const CACHE_VERSION = 'v37';

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => self.clients.claim())

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept: non-GET, API calls, admin/merchant/rider/auth routes
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/merchant') ||
    url.pathname.startsWith('/rider') ||
    url.pathname.startsWith('/auth')
  ) {
    return;
  }

  // All other GET requests: pass through to network
  event.respondWith(fetch(event.request));
})

self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};

  const title = data.title || 'Zupr — New Order! 🛍️';
  const options = {
    body: data.body || 'A new order has been placed',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'new-order',
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: { url: data.url || '/', broadcast_id: data.broadcast_id, customer_id: data.customer_id },
    actions: [
      { action: 'open', title: '👀 View Order' }
    ]
  };

  const notifPromise = self.registration.showNotification(title, options);

  const logPromise = data.broadcast_id
    ? fetch('/api/events/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'push_received',
          customer_id: data.customer_id ?? null,
          metadata: { broadcast_id: data.broadcast_id },
        }),
      }).catch(() => {})
    : Promise.resolve();

  event.waitUntil(Promise.all([notifPromise, logPromise]));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const { url, broadcast_id, customer_id } = event.notification.data || {};
  const targetUrl = url || '/';

  const logPromise = broadcast_id
    ? fetch('/api/events/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'push_clicked',
          customer_id: customer_id ?? null,
          metadata: { broadcast_id },
        }),
      }).catch(() => {})
    : Promise.resolve();

  const navPromise = clients.matchAll({ type: 'window' }).then(function(clientList) {
    for (const client of clientList) {
      if ('focus' in client) {
        client.navigate(targetUrl);
        return client.focus();
      }
    }
    if (clients.openWindow) {
      return clients.openWindow(targetUrl);
    }
  });

  event.waitUntil(Promise.all([logPromise, navPromise]));
});
