/* Fault photos – take or choose a photo of a faulty part, keep it with the record, and add it to the PDF
   on its own "FAULT PHOTOS" page with the fault details underneath.
   Photos are shrunk on the phone and kept in IndexedDB (localStorage is too small); the record only holds the photo ids.
   Where the ids live in a record:
     gas / Legionella  defects[i].photos      warning notice  faults[i].photos
     service / aircon  fotos[<check key>]    (only for a check that has been marked FAIL) */
'use strict';
const PH = (() => {
  const MAX_PER_FAULT = 3, MAX_PX = 1100, QUALITY = 0.7;
  const mem = new Map();               // id -> { data, w, h }
  let dbp = null;

  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      try {
        const q = indexedDB.open('cph_photos', 1);
        q.onupgradeneeded = () => q.result.createObjectStore('p', { keyPath: 'id' });
        q.onsuccess = () => res(q.result);
        q.onerror = () => rej(q.error);
      } catch (e) { rej(e); }
    }).catch(() => null);
    return dbp;
  }
  const tx = async (mode, fn) => {
    const d = await db(); if (!d) return null;
    return new Promise(res => {
      try { const t = d.transaction('p', mode), r = fn(t.objectStore('p')); t.oncomplete = () => res(r && 'result' in r ? r.result : true); t.onerror = t.onabort = () => res(null); }
      catch (e) { res(null); }
    });
  };

  async function get(id) {
    if (mem.has(id)) return mem.get(id);
    const p = await tx('readonly', s => s.get(id));
    if (p && p.data) { const o = { data: p.data, w: p.w, h: p.h }; mem.set(id, o); return o; }
    return null;
  }
  async function put(id, o) { mem.set(id, o); await tx('readwrite', s => s.put({ id, data: o.data, w: o.w, h: o.h })); }
  const keys = async () => (await tx('readonly', s => s.getAllKeys())) || [];
  async function del(id) { mem.delete(id); await tx('readwrite', s => s.delete(id)); }

  /* shrink a camera photo to ~1100px JPEG */
  function compress(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const sc = Math.min(1, MAX_PX / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * sc)), h = Math.max(1, Math.round(img.naturalHeight * sc));
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); cx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url); res({ data: cv.toDataURL('image/jpeg', QUALITY), w, h });
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
      img.src = url;
    });
  }

  /* ----- where a record keeps its photo ids ----- */
  const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const list = (rec, path) => { const v = getP(rec, path); return Array.isArray(v) ? v : []; };
  function setList(rec, path, arr) {
    const ks = path.split('.'), last = ks.pop();
    const t = ks.reduce((a, k) => { if (a[k] == null || typeof a[k] !== 'object') a[k] = {}; return a[k]; }, rec);
    t[last] = arr;
  }
  /* every photo id a record holds (used for delete and backup) */
  function recIds(rec) {
    const ids = [];
    (rec.defects || []).forEach(d => ids.push(...(d.photos || [])));
    (rec.faults || []).forEach(d => ids.push(...(d.photos || [])));
    Object.values(rec.fotos || {}).forEach(a => ids.push(...(a || [])));
    return ids;
  }

  /* ----- signatures: kept in the same store so the 5MB record store doesn't fill up ----- */
  const rid = p => p + (self.crypto && crypto.randomUUID ? crypto.randomUUID().slice(0, 13) : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
  const SIGS = ['engineerSig', 'customerSig'];
  const isRef = v => typeof v === 'string' && v.startsWith('idb:');
  function sigStore(dataUrl) { const id = rid('sg'); put(id, { data: dataUrl, w: 0, h: 0 }); return 'idb:' + id; }
  async function sigResolve(v) { if (!isRef(v)) return v || ''; const p = await get(v.slice(4)); return p ? p.data : ''; }
  async function resolveRec(rec) {
    if (!SIGS.some(k => isRef(rec[k]))) return rec;
    const c = { ...rec }; for (const k of SIGS) c[k] = await sigResolve(rec[k]); return c;
  }
  const sigIds = rec => SIGS.filter(k => isRef(rec[k])).map(k => rec[k].slice(4));
  const allIds = rec => [...recIds(rec), ...sigIds(rec)];
  /* one-off: move signatures saved the old way (inside the record) into the store; then tidy up anything no record uses */
  async function tidy(records) {
    let moved = 0;
    records.forEach(r => SIGS.forEach(k => { if (typeof r[k] === 'string' && r[k].startsWith('data:')) { r[k] = sigStore(r[k]); moved++; } }));
    const used = new Set(); records.forEach(r => allIds(r).forEach(id => used.add(id)));
    for (const id of await keys()) if (!used.has(id)) await del(id);
    return moved;
  }

  const uid = () => rid('ph');
  async function attach(rec, path, files) {
    const cur = list(rec, path).slice();
    for (const f of Array.from(files)) {
      if (cur.length >= MAX_PER_FAULT) break;
      try { const o = await compress(f), id = uid(); await put(id, o); cur.push(id); } catch (e) { /* skip unreadable file */ }
    }
    setList(rec, path, cur);
  }
  async function remove(rec, path, id) {
    setList(rec, path, list(rec, path).filter(x => x !== id));
    await del(id);
  }
  async function dropAll(ids) { for (const id of ids) await del(id); }

  /* ----- form widget ----- */
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function field(rec, path, label) {
    const ids = list(rec, path), full = ids.length >= MAX_PER_FAULT;
    return `<div class="f phf"><span>${esc(label || 'Photo of the fault')}</span>
      ${ids.length ? `<div class="phs">${ids.map(id => `<div class="ph-i"><img data-pid="${id}" alt="Fault photo"><button type="button" data-act="photoRm" data-path="${esc(path)}" data-pid="${id}" aria-label="Remove photo">✕</button></div>`).join('')}</div>` : ''}
      ${full ? `<small>Maximum of ${MAX_PER_FAULT} photos for this fault.</small>`
        : `<div class="row ph-btns">
             <label class="btn grow ph-add">📷 Take photo<input type="file" accept="image/*" capture="environment" hidden data-photo="${esc(path)}"></label>
             <label class="btn grow ph-add">🖼 ${ids.length ? 'Add from gallery' : 'Choose photo'}<input type="file" accept="image/*" multiple hidden data-photo="${esc(path)}"></label>
           </div>
           ${ids.length ? '' : '<small>Optional. It goes on its own page in the PDF.</small>'}`}
    </div>`;
  }
  /* fill in the thumbnails after a render */
  function hydrate() {
    document.querySelectorAll('img[data-pid]:not([src])').forEach(img => {
      get(img.dataset.pid).then(p => { if (p) img.src = p.data; else img.alt = 'Photo not on this phone'; });
    });
  }

  /* ----- what goes on the photo pages, per form ----- */
  function items(rec) {
    const out = [], row = (k, v) => (String(v ?? '').trim() ? [k, String(v)] : null);
    const add = (title, photos, rows) => { if (photos && photos.length) out.push({ title, photos: photos.slice(0, MAX_PER_FAULT), rows: rows.filter(Boolean) }); };
    const t = rec.type || 'gas';
    if (t === 'gas') {
      (rec.defects || []).slice(0, +rec.defectCount || 0).forEach((d, i) =>
        add(`DEFECT ${i + 1}`, d.photos, [row('Defect', d.text), row('Classification', d.cls), row('Remedial action taken', d.action)]));
    } else if (t === 'legionella') {
      (rec.defects || []).forEach((d, i) =>
        add(`RISK / DEFECT ${i + 1}`, d.photos, [row('Risk / defect', d.text), row('Priority', d.cls), row('Recommendation', d.action)]));
    } else if (t === 'service') {
      [...SVC.APP, ...SVC.SAFE].forEach(c => {
        if (rec.chk && rec.chk[c.k] === 'FAIL') add('FAILED CHECK – ' + c.label.toUpperCase(), (rec.fotos || {})[c.k], [row('Check', c.label), row('Result', 'FAIL'), row('Failure details', (rec.fault || {})[c.k])]);
      });
    } else if (t === 'aircon') {
      [['drain', 'Condensate drain'], ['electrical', 'Electrical supply, isolator and connections']].forEach(([k, label]) => {
        if (rec[k] === 'FAIL') add('FAILED CHECK – ' + label.toUpperCase(), (rec.fotos || {})[k], [row('Check', label), row('Result', 'FAIL'), row('Engineer notes', rec.notes)]);
      });
    } else if (t === 'warning') {
      const n = Math.max(1, Math.min(4, +rec.faultCount || 1));
      (rec.faults || []).slice(0, n).forEach((f, i) =>
        add(`FAULT ${i + 1}${f.type ? ' – ' + String(f.type).toUpperCase() : ''}`, f.photos, [
          row('Location', WARN.locText(f)), row('Appliance', [f.type, f.make, f.model].filter(Boolean).join(' · ')), row('Serial number', f.serial),
          row('Classification', f.cls === 'ID' ? 'Immediately Dangerous (ID)' : f.cls === 'AR' ? 'At Risk (AR)' : ''), row('Reason / notes', f.notes)]));
    }
    return out;
  }
  const count = rec => items(rec).reduce((a, i) => a + i.photos.length, 0);

  /* ----- PDF: append the FAULT PHOTOS pages to a finished document ----- */
  async function addPages(doc, rec, land) {
    const its = items(rec);
    for (const it of its) { it.imgs = []; for (const id of it.photos) { const p = await get(id); if (p) it.imgs.push(p); } }
    const todo = its.filter(i => i.imgs.length);
    if (!todo.length) return 0;
    const W = land ? 297 : 210, H = land ? 210 : 297, M = 8, CW = W - 2 * M, FOOT = 14, GAP = 3, BAR = 5.2;
    const GOLD = [255, 242, 0], INK = [22, 22, 22], GREY = [105, 105, 105], LINE = [190, 190, 190];
    const HMAX = land ? 80 : 78, LABW = 36, FS = 8, LH = 3.5;
    let y = 0, pages = 0;
    function page() {
      doc.addPage('a4', land ? 'landscape' : 'portrait'); pages++;
      doc.setFillColor(12, 12, 12); doc.rect(0, 0, W, 12, 'F'); doc.setFillColor(...GOLD); doc.rect(0, 12, W, 0.8, 'F');
      doc.setTextColor(...GOLD); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.text('FAULT PHOTOS', M, 8); doc.setTextColor(255, 255, 255); doc.text(rec.ref || '', W - M, 8, { align: 'right' });
      y = 12.8 + 4;
    }
    const wrapT = (t, w, b) => { doc.setFont('helvetica', b ? 'bold' : 'normal'); doc.setFontSize(FS); return String(t).split('\n').flatMap(l => doc.splitTextToSize(l || ' ', w)); };
    page();
    for (const it of todo) {
      const n = it.imgs.length, g = 3, cw = n === 1 ? Math.min(CW, 110) : (CW - (n - 1) * g) / n;
      const rowsL = it.rows.map(([k, v]) => ({ k, lines: wrapT(v, CW - LABW - 4) }));
      const detH = rowsL.reduce((a, r) => a + r.lines.length * LH + 2.2, 0) + 1.2;
      let ch = Math.min(HMAX, Math.max(...it.imgs.map(p => cw * p.h / p.w)));
      const need = () => BAR + 2 + ch + 2 + detH + GAP;
      if (y + need() > H - FOOT) { page(); }
      const room = H - FOOT - y - BAR - 4 - detH - GAP;       // a single block taller than a page: shrink the photos
      if (room < ch) ch = Math.max(30, room);
      /* title bar */
      doc.setFillColor(...GOLD); doc.rect(M, y, CW, BAR, 'F'); doc.setDrawColor(...INK); doc.setLineWidth(0.2); doc.rect(M, y, CW, BAR);
      doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.2); doc.text(it.title, M + 2.4, y + 3.6);
      y += BAR + 2;
      /* photos, centred in their cells */
      const totalW = n * cw + (n - 1) * g; let x = M + (CW - totalW) / 2;
      it.imgs.forEach(p => {
        const sc = Math.min(cw / p.w, ch / p.h), iw = p.w * sc, ih = p.h * sc;
        doc.setDrawColor(...LINE); doc.setLineWidth(0.25); doc.rect(x, y, cw, ch);
        doc.addImage(p.data, 'JPEG', x + (cw - iw) / 2, y + (ch - ih) / 2, iw, ih, undefined, 'FAST');
        x += cw + g;
      });
      y += ch + 2;
      /* fault details underneath */
      doc.setDrawColor(...LINE); doc.rect(M, y, CW, detH);
      let ty = y + 1.2;
      rowsL.forEach((r, i) => {
        const h = r.lines.length * LH + 2.2;
        if (i) { doc.setDrawColor(225, 225, 225); doc.line(M, ty, M + CW, ty); }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(FS); doc.setTextColor(...GREY); doc.text(r.k, M + 2, ty + 3.1);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...INK);
        r.lines.forEach((t, j) => doc.text(t, M + LABW, ty + 3.1 + j * LH));
        ty += h;
      });
      y += detH + GAP;
    }
    return pages;
  }

  return { sigStore, sigResolve, resolveRec, allIds, tidy, MAX_PER_FAULT, field, hydrate, attach, remove, dropAll, get, put, recIds, list, items, count, addPages };
})();
