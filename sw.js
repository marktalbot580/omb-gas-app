// Offline cache so the form still opens with no signal on site.
const CACHE = 'omb-gas-v99';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'addr.js', 'help.js', 'reminders.js', 'tools.js', 'changelog.js', 'leg-config.js', 'svc-config.js', 'ac-config.js', 'comm-config.js', 'quote-config.js', 'lib/xlsx.core.min.js', 'pdf-quote.js', 'sample.js', 'pdf-comm.js', 'warn-config.js', 'pdf.js', 'pdf-leg.js', 'pdf-svc.js', 'pdf-ac.js', 'pdf-warn.js', 'pdf-inv.js', 'pdf-stmt.js', 'pdf-tools.js', 'photos.js', 'config.js', 'cloud.js', 'manifest.json',
  'gassafe.png', 'icon-192.png', 'icon-512.png', 'logo.svg', 'fonts/bricolage-grotesque-latin-800-normal.woff2', 'fonts/bricolage-grotesque-latin-700-normal.woff2', 'fonts/instrument-sans-latin-400-normal.woff2', 'fonts/instrument-sans-latin-600-normal.woff2', 'fonts/jetbrains-mono-latin-500-normal.woff2', 'lib/jspdf.umd.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return; // never cache Google Sheets calls
  // network first so updates arrive, fall back to cache when offline
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy));
    return res;
  }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
});
