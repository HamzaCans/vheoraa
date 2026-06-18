const CACHE_NAME = 'vheora-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/favicon.png',
  '/404.html',
  '/collection.html',
  '/custom-design.html',
  '/legal.html',
  '/manifest.json',
  '/images/hero_collection.png',
  '/images/gold_diamond_ring.png',
  '/images/gold_bracelet.png',
  '/images/diamond_necklace.png',
  '/images/gold_earrings.png',
  '/images/jewelry_workshop.png',
  '/workshop.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Do not intercept API or Admin calls
  if (event.request.url.includes('/api/') || event.request.url.includes('/admin/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/404.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
