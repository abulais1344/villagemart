const CACHE_VERSION = 'v31';

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
    data: { url: '/merchant-login' },
    actions: [
      { action: 'open', title: '👀 View Order' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      // Focus any existing PWA window and navigate it to the target URL.
      // In standalone mode there's typically only one window.
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
