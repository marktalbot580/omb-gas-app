/* Folder-style backup (zip). Loaded when you tap "Back up as folders".
   Customers/<name>/Certificates, Invoices, Photos  +  one data file the app uses to restore.
   With a password the whole zip is locked (AES-256-GCM) and saved as .ombzip. */
'use strict';
const ZB = (() => {
  const MAGIC = [79, 77, 66, 90, 73, 80, 49, 0];            // "OMBZIP1\0"
  const DATA = 'OMB restore data.json';
  let loadP = null;
  const load = () => loadP || (loadP = new Promise((ok, no) => {
    if (window.fflate) return ok();
    const s = document.createElement('script'); s.src = 'lib/fflate.min.js'; s.onload = ok;
    s.onerror = () => { loadP = null; no(new Error('Could not load the zip tool. Check your signal and try again.')); }; document.head.appendChild(s);
  }));
  const safe = t => String(t || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Customer';
  const enc = t => new TextEncoder().encode(t);
  const dataToBytes = u => { const b = atob(u.split(',')[1]), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
  const bytesToData = (a, mime) => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(new Blob([a], { type: mime })); });
  const extOf = u => { const m = /^data:image\/(\w+)/.exec(u || ''); return m ? (m[1] === 'jpeg' ? 'jpg' : m[1]) : 'jpg'; };
  const mimeOf = p => /\.png$/i.test(p) ? 'image/png' : 'image/jpeg';
  const ask = () => new Promise(res => {
    const o = document.createElement('div'); o.className = 'bkm';
    o.innerHTML = `<div class="gate-card"><h2>Back up as folders</h2>
      <p class="gate-small">Makes one zip with a folder for each customer, holding their certificates, invoices and photos. You can open it on a computer and browse it.</p>
      <button class="btn gold block" data-w="all">Photos and PDFs</button>
      <p class="gate-small" style="margin:4px 0 10px">Everything. Takes longer if you have lots of jobs.</p>
      <button class="btn block" data-w="photos">Photos only (quick)</button>
      <button class="link" data-w="no">Cancel</button></div>`;
    o.addEventListener('click', e => { const w = e.target.closest('[data-w]'); if (!w) return; o.remove(); res(w.dataset.w === 'no' ? null : w.dataset.w); });
    document.body.appendChild(o);
  });
  /* a readable name for each photo id, from where it sits in the record */
  function labels(r) {
    const out = [], doc = r.general ? 'Quotation' : (FORM_DOC[typeOf(r)] || ['Record'])[0], base = `${doc} ${r.inspectionDate || ''}`.trim();
    const add = (ids, what) => (ids || []).forEach((id, j) => out.push([id, `${base} - ${what} - photo ${j + 1}`]));
    (r.defects || []).forEach((d, i) => add(d && d.photos, 'Defect ' + (i + 1)));
    (r.faults || []).forEach((d, i) => add(d && d.photos, 'Fault ' + (i + 1)));
    Object.entries(r.fotos || {}).forEach(([k, v]) => add(Array.isArray(v) ? v : [], 'Check ' + safe(k)));
    return out;
  }
  async function build(mode, progress) {
    await load();
    const F = window.fflate, files = {}, used = new Set();
    const uniq = p => { let q = p, n = 2; while (used.has(q.toLowerCase())) q = p.replace(/(\.\w+)?$/, ` (${n++})$1`); used.add(q.toLowerCase()); return q; };
    const folders = new Map();                                   // customerId or name -> folder
    const folderFor = (id, name) => {
      const key = id || 'n:' + name;
      if (!folders.has(key)) { let f = safe(name), n = 2; while ([...folders.values()].includes(f)) f = safe(name) + ' (' + n++ + ')'; folders.set(key, f); }
      return folders.get(key);
    };
    customers.forEach(c => folderFor(c.id, c.name));
    const { syncToken, bankName, accName, sortCode, accNo, ...keep } = settings;
    const strip = o => { const c = { ...o }; delete c._dirty; return c; };
    const photoIndex = {};
    let n = 0, total = records.length + invoices.length;
    for (const r of records) {
      const cf = 'Customers/' + folderFor(r.customerId, r.customer && r.customer.name);
      const seen = new Set();
      for (const [id, name] of labels(r)) {
        if (seen.has(id) || photoIndex[id]) continue; seen.add(id);
        const p = await PH.get(id); if (!p) continue;
        const path = uniq(`${cf}/Photos/${safe(name)}.${extOf(p.data)}`);
        files[path] = [dataToBytes(p.data), { level: 0 }]; photoIndex[id] = { path, w: p.w, h: p.h };
      }
      for (const id of PH.allIds(r)) {                           // signatures and anything not named above
        if (photoIndex[id]) continue; const p = await PH.get(id); if (!p) continue;
        const path = uniq(`_app data/${id}.${extOf(p.data)}`);
        files[path] = [dataToBytes(p.data), { level: 0 }]; photoIndex[id] = { path, w: p.w, h: p.h };
      }
      if (mode === 'all') {
        try { const blob = await buildPdf(r, settings); files[uniq(`${cf}/Certificates/${pdfName(r)}`)] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }]; }
        catch (e) { console.warn('pdf skipped', e); }
      }
      progress(++n, total);
    }
    if (mode === 'all') for (const inv of invoices) {
      try {
        const cf = 'Customers/' + folderFor(inv.customerId, inv.customer && inv.customer.name);
        const blob = await buildInvPdf(inv, settings); files[uniq(`${cf}/Invoices/${invFileName(inv)}`)] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }];
      } catch (e) { console.warn('invoice pdf skipped', e); }
      progress(++n, total);
    }
    const data = { app: 'omb-gas', version: 2, exported: new Date().toISOString(), settings: keep, customers: customers.map(strip), records: records.map(strip), invoices, bookings, photoIndex };
    files[DATA] = enc(JSON.stringify(data));
    files['READ ME.txt'] = enc('OMB Gas Service backup, ' + todayISO() + '\r\n\r\nCustomers\\<name>\\ has each customer\'s certificates, invoices and photos.\r\n"' + DATA + '" and the "_app data" folder are what the app uses to restore. Leave them where they are.\r\nTo restore: OMB Gas Service > Settings > Restore from a backup, and choose this file.\r\nThis file holds customer details. Keep it somewhere private. Bank details are not included.\r\n');
    return F.zipSync(files);
  }
  async function lock(zip, pw) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await pwKey(pw, salt), zip));
    const out = new Uint8Array(8 + 16 + 12 + ct.length); out.set(MAGIC); out.set(salt, 8); out.set(iv, 24); out.set(ct, 36); return out;
  }
  async function exportZip() {
    const mode = await ask(); if (!mode) return;
    const pw = await pwBox('make'); if (pw === null) return;
    try {
      toast('Building your backup...');
      let zip = await build(mode, (a, b) => { if (b > 5 && a % 5 === 0) toast(`Building your backup... ${a} of ${b}`); });
      if (pw) zip = await lock(zip, pw);
      const name = `OMB backup ${todayISO()}${pw ? ' (password).ombzip' : '.zip'}`;
      const blob = new Blob([zip], { type: pw ? 'application/octet-stream' : 'application/zip' });
      if (await saveFile(blob, name, blob.type)) { bkSet({ last: todayISO(), snooze: '' }); if (ui.view === 'home' || ui.view === 'settings') render(); toast('Backup saved'); }
    } catch (err) { console.error(err); toast('Could not make the backup: ' + err.message); }
  }
  /* is this file a zip backup? returns the backup data (same shape as the .json one), null if not a zip, or false if cancelled/wrong password */
  async function read(file) {
    const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const locked = MAGIC.every((b, i) => head[i] === b), plain = head[0] === 0x50 && head[1] === 0x4b;
    if (!locked && !plain) return null;
    await load();
    let bytes = new Uint8Array(await file.arrayBuffer());
    if (locked) {
      const pw = await pwBox('open'); if (!pw) return false;
      try { bytes = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(24, 36) }, await pwKey(pw, bytes.slice(8, 24)), bytes.slice(36))); }
      catch (e) { toast('Wrong password, or the file is damaged'); return false; }
    }
    const z = window.fflate.unzipSync(bytes);
    if (!z[DATA]) throw new Error('not an OMB backup');
    const d = JSON.parse(new TextDecoder().decode(z[DATA]));
    if (d.app !== 'omb-gas') throw new Error('not an OMB backup');
    d.photos = d.photos || {};
    for (const [id, m] of Object.entries(d.photoIndex || {})) { const f = z[m.path]; if (f) d.photos[id] = { data: await bytesToData(f, mimeOf(m.path)), w: m.w, h: m.h }; }
    return d;
  }
  return { exportZip, read, build, load };
})();
