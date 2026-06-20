const CACHE_NAME = 'vheora-v4';
const STATIC_CACHE = 'vheora-static-v4';
const DYNAMIC_CACHE = 'vheora-dynamic-v4';

const STATIC_ASSETS = [
  '/style.css',
  '/script.js',
  '/favicon.png',
  '/404.html',
  '/collection.html',
  '/custom-design.html',
  '/legal.html',
  '/manifest.json',
  '/images/hero_collection.webp',
  '/images/gold_diamond_ring.webp',
  '/images/gold_bracelet.webp',
  '/images/diamond_necklace.webp',
  '/images/gold_earrings.webp',
  '/images/jewelry_workshop.webp',
  '/workshop.webp'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin/')) return;
  if (!url.protocol.startsWith('http')) return;

  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(request).then(response => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(c => c.put(request, clone));
        }
        return response;
      }).catch(() => caches.match(request).then(r => r || caches.match('/404.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request).then(response => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(c => c.put(request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
