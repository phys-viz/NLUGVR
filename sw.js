// Moon Lab — Dev-friendly Service Worker
// Strategy: NETWORK FIRST, fall back to cache only when offline.
// Bumping CACHE_VERSION forces a full cache clear on next load.

const CACHE_VERSION = 'moonlab-v1';

// Install: pre-cache nothing — let runtime caching handle it
self.addEventListener('install', e => {
  self.skipWaiting(); // activate immediately, don't wait for old tabs
});

// Activate: delete any old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim()) // take control of all tabs now
  );
});

// Fetch: always try network first
self.addEventListener('fetch', e => {
  // Skip non-GET requests and chrome-extension / cross-origin noise
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Network succeeded — clone into cache for offline fallback
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Network failed — try cache
        return caches.match(e.request).then(cached => {
          if (cached) return cached;
          // Nothing cached either — return a basic offline message for nav requests
          if (e.request.mode === 'navigate') {
            return new Response(
              '<h1 style="font-family:monospace;color:#ffd54f;background:#080c12;margin:0;padding:40px">Moon Lab is offline — connect and reload</h1>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          }
          return Response.error();
        });
      })
  );
});
