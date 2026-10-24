/* OMB Gas Service - where customers, records, invoices and appointments are kept on this device.
   They used to live in localStorage (about 5 MB, which fills after roughly a thousand jobs). They now live in
   IndexedDB, which holds far more. On the first start the old copy is moved across and checked before it is removed.
   If IndexedDB is not available the app carries on with localStorage exactly as before.
   After loading, this file starts the rest of the app (cal.js, data-tools.js, app.js) in order. */
'use strict';
const OMBSTORE = (() => {
  const KEYS = ['omb_customers', 'omb_records', 'omb_invoices', 'omb_bookings'], NAME = 'omb_data', cache = {};
  let db = null, timer = 0, dead = false;
  const dirty = new Set();
  const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const open = () => new Promise(res => {
    try { const q = indexedDB.open(NAME, 1); q.onupgradeneeded = () => q.result.createObjectStore('kv'); q.onsuccess = () => res(q.result); q.onerror = q.onblocked = () => res(null); } catch (e) { res(null); }
  });
  const getOne = k => req(db.transaction('kv').objectStore('kv').get(k));
  const putOne = (k, v) => new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = t.onabort = () => rej(t.error); });
  const fromLS = k => { try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : undefined; } catch (e) { return undefined; } };
  const toLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

  async function init() {
    db = await open();
    if (!db) return;
    for (const k of KEYS) {
      try {
        let v = await getOne(k);
        if (v === undefined) {
          const old = fromLS(k);
          if (old === undefined) { cache[k] = undefined; continue; }
          await putOne(k, old);
          const back = await getOne(k);
          if (JSON.stringify(back) !== JSON.stringify(old)) throw new Error('verify');
          v = back;
        }
        cache[k] = v;
        try { localStorage.removeItem(k); } catch (e) { }
      } catch (e) { /* this key stays in localStorage */ }
    }
  }
  async function flush() {
    clearTimeout(timer); timer = 0;
    if (dead || !db || !dirty.size) return;
    const keys = [...dirty]; dirty.clear();
    for (const k of keys) {
      try { await putOne(k, cache[k]); }
      catch (e) { if (!toLS(k, cache[k]) && typeof toast === 'function') toast('Storage full – back up and ask support for help'); }
    }
  }
  const api = {
    has: k => k in cache,
    get: (k, d) => (cache[k] ?? d),
    set(k, v) { cache[k] = v; dirty.add(k); if (!timer) timer = setTimeout(flush, 120); },
    flush,
    /* bytes held in the database (approximate), for the Backup card */
    bytes: () => { try { return KEYS.reduce((n, k) => n + (k in cache ? JSON.stringify(cache[k]).length * 2 : 0), 0); } catch (e) { return 0; } },
    /* sign-out / another person logging in: forget everything held here */
    wipe() { dead = true; clearTimeout(timer); try { if (db) db.close(); indexedDB.deleteDatabase(NAME); } catch (e) { } },
    ready: null
  };
  api.ready = init().catch(() => { });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);
  return api;
})();
OMBSTORE.ready.then(() => {
  ['cal.js', 'search.js', 'boilertol.js', 'tour.js', 'data-tools.js', 'zip-backup.js', 'today.js', 'register.js', 'history.js', 'followup.js', 'commonfaults.js', 'app.js'].forEach(src => { const s = document.createElement('script'); s.src = src; s.async = false; document.body.appendChild(s); });
});
