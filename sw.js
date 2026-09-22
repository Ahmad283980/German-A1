/* DeutschLern service worker — updates itself, still works offline.

   * the app shell (index.html) is fetched NETWORK FIRST: a new build shows up on the
     next visit, and only falls back to the cached copy when there is no internet.
   * icons, manifest and other assets stay cache-first for instant loading.
   * a new version deletes the previous cache, so nothing goes stale.
*/
const CACHE = 'deutschlern-v3';
const ASSETS = [
  './', './index.html', './manifest.json',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png',
  './apple-touch-icon-180.png', './favicon-32.png'
];
const isShell = req => req.mode === 'navigate' ||
  (req.headers.get('accept') || '').includes('text/html') ||
  /(^|\/)index\.html$/.test(new URL(req.url).pathname);

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  if (isShell(req)) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html', { ignoreSearch: true })
                    .then(hit => hit || caches.match('./')))
    );
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }))
  );
});
self.addEventListener('message', e => { if (e.data === 'skip-waiting') self.skipWaiting(); });
