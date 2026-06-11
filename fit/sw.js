// MèoFit service worker — chạy offline. Bump CACHE khi đổi nội dung để cập nhật.
const CACHE = 'meofit-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const sameOrigin = new URL(req.url).origin === self.location.origin;

  if (sameOrigin) {
    // App shell: cache-first, cập nhật nền; fallback về index.html khi offline
    e.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html')))
    );
  } else {
    // Ảnh cơ (Wikimedia), font (Google): stale-while-revalidate, cache cả response opaque
    e.respondWith(
      caches.open(CACHE).then(c => c.match(req).then(cached => {
        const net = fetch(req).then(res => { c.put(req, res.clone()).catch(() => {}); return res; }).catch(() => cached);
        return cached || net;
      }))
    );
  }
});
