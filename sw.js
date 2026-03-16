// Moon Lab Service Worker
// Cache version — increment this string whenever you deploy updated files
const CACHE_NAME = 'moon-lab-v1';

// Files to cache on install
// Three.js is fetched from CDN on first load and then cached locally
const PRECACHE_URLS = [
  './moon-lab-vr.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
];

// Optional texture files — cached if present, skipped if not
const OPTIONAL_URLS = [
  './jupiter.jpg',
  './saturn.jpg',
  './icon-192.png',
  './icon-512.png'
];

// ── Install: pre-cache everything ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Cache required files — fail loudly if any are missing
      await cache.addAll(PRECACHE_URLS);
      // Cache optional files — ignore failures (textures may not exist)
      await Promise.allSettled(
        OPTIONAL_URLS.map(url =>
          fetch(url).then(res => {
            if (res.ok) return cache.put(url, res);
          }).catch(() => {})
        )
      );
    })
  );
  // Take over immediately without waiting for old SW to unload
  self.skipWaiting();
});

// ── Activate: delete old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first, network fallback ──
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Not in cache — fetch from network and cache for next time
      return fetch(event.request).then(response => {
        // Only cache valid responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => {
        // Network failed and not in cache — return a minimal offline page
        // for navigation requests only
        if (event.request.mode === 'navigate') {
          return caches.match('./moon-lab-vr.html');
        }
      });
    })
  );
});
