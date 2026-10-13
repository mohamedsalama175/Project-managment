// DeliverOps Enterprise PWA Service Worker (v1.0.0)
const CACHE_NAME = 'deliverops-static-v1';
const API_CACHE = 'deliverops-api-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.ico',
];

// 1. Install & Pre-cache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate & Clean Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== API_CACHE).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Stale-While-Revalidate for APIs, Cache-First for Assets
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Read-only API caching for offline resilience
  if (request.method === 'GET' && (url.pathname.includes('/api/v1/projects') || url.pathname.includes('/api/v1/tasks'))) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          const cachedResponse = await cache.match(request);
          if (cachedResponse) return cachedResponse;
          return new Response(JSON.stringify({ error: 'OFFLINE_NO_CACHE', message: 'You are offline.' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 503,
          });
        }
      })
    );
    return;
  }

  // App shell & static assets: Cache first with network fallback
  if (request.method === 'GET' && (request.destination === 'document' || request.destination === 'script' || request.destination === 'style' || request.destination === 'image')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).catch(() => caches.match('/index.html'));
      })
    );
    return;
  }
});

// 4. Web Push Notifications Handler
self.addEventListener('push', (event) => {
  let data = { title: 'DeliverOps Notification', body: 'New update received.', url: '/' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'You have new project updates.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      url: data.action_url || data.url || '/',
    },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(data.title || 'DeliverOps', options));
});

// 5. Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// 6. Background Sync for Queued Offline Mutations
self.addEventListener('sync', (event) => {
  if (event.tag === 'deliverops-sync-queue') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'TRIGGER_BACKGROUND_SYNC' });
        });
      })
    );
  }
});
