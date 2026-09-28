/* Service worker for DSR Online Media App.
   Network-first for same-origin app-shell requests: every launch with a
   connection gets the latest index.html / assets, cache is the offline
   fallback only. Plex / YouTube / lrclib requests (cross-origin) always hit
   the network directly and are never cached. */
const CACHE = 'dsr-oma-v1b';
const OWN = 'dsr-oma-';   // only ever delete THIS app's old caches – every DSR app shares the github.io origin's cache storage
const SHELL = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k.indexOf(OWN) === 0).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Plex / YouTube / lrclib / CDN
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
  );
});
