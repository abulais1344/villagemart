self.addEventListener('install', () => {})
self.addEventListener('fetch', () => {})

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
  const url = event.notification.data?.url || '/merchant-login';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes('merchant') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
