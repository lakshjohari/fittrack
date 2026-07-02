/* FitTrack service worker — offline caching */
const CACHE = 'fittrack-v1';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // App shell: network-first so edits show up, cache fallback for offline.
  if (url.origin === location.origin && (url.pathname.endsWith('/') || url.pathname.endsWith('index.html'))) {
    e.respondWith(
      fetch(e.request)
        .then(r => { const cl = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); return r; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Everything else (GIFs, CDN Chart.js / icon font): cache-first.
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      if (r.ok || r.type === 'opaque') { const cl = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); }
      return r;
    }))
  );
});
