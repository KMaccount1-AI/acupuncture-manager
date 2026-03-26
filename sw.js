const CACHE_NAME = 'acm-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png'
];
const CDN_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// Install — cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([...ASSETS, ...CDN_ASSETS])
    )
  );
  self.skipWaiting(); // Activate immediately
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // Take control immediately
});

// Fetch — Network-first for HTML (always get latest), Cache-first for assets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // HTML pages: network-first (ensures latest version)
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Other assets (JS, CSS, images): cache-first with background update
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(response => {
        if (response.ok && e.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => null);

      return cached || fetchPromise;
    })
  );
});

// Listen for skip-waiting message from the page
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
