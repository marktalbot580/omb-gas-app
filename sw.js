// Offline cache so the form still opens with no signal on site.
const CACHE = 'omb-gas-v265';
const FILES = ['./', 'index.html', 'theme.js', 'style.css', 'app.js', 'store.js', 'cal.js', 'search.js', 'boilertol.js', 'tour.js', 'today.js', 'register.js', 'history.js', 'followup.js', 'commonfaults.js', 'data-tools.js', 'zip-backup.js', 'lib/fflate.min.js', 'addr.js', 'help.js', 'reminders.js', 'pdf-lazy.js', 'tools-oil.js', 'tools.js', 'changelog.js', 'leg-config.js', 'svc-config.js', 'ac-config.js', 'oil-config.js', 'oform-config.js', 'pdf-oil.js', 'comm-config.js', 'quote-config.js', 'lib/xlsx.core.min.js', 'pdf-quote.js', 'sample.js', 'pdf-comm.js', 'warn-config.js', 'pdf.js', 'pdf-leg.js', 'pdf-svc.js', 'pdf-ac.js', 'pdf-warn.js', 'pdf-inv.js', 'pdf-stmt.js', 'pdf-tools.js', 'photos.js', 'config.js', 'cloud.js', 'manifest.json',
  'gassafe.png', 'icon-192.png', 'icon-512.png', 'logo.svg', 'fonts/bricolage-grotesque-latin-800-normal.woff2', 'fonts/bricolage-grotesque-latin-700-normal.woff2', 'fonts/instrument-sans-latin-400-normal.woff2', 'fonts/instrument-sans-latin-600-normal.woff2', 'fonts/jetbrains-mono-latin-500-normal.woff2', 'lib/jspdf.umd.min.js'];

self.addEventListener('install', e => {
  /* every file is fetched fresh (not from the browser's own cache) and the whole set is kept together, so one release is never a mix of old and new files */
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return; // never cache Google Sheets calls
  /* the app opens from the copy on the phone, so it starts at once even on a poor signal; a new release is fetched in the background
     (the service worker file itself is checked on every launch) and is used from the next launch */
  e.respondWith(caches.match(req, { ignoreSearch: false }).then(hit => hit || fetch(req).then(res => {
    if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match('index.html'))));
});
