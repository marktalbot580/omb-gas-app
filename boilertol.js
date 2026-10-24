/* Manufacturer figures for a boiler (the data-sheet limits). They are saved on the boiler in the Price list.
   When the make / model / GC number on a service or gas check matches one, each reading gets an (i) button showing the
   figures, and readings that can be judged turn green (inside the limit) or red (outside). Colour is a guide only:
   it never changes safe / unsafe, a result or a warning notice. */
'use strict';
const BT = (() => {
  const FIELDS = [
    ['gc', 'Gas Council (GC) number', ''],
    ['flue', 'Flue type (e.g. Room Sealed)', ''],
    ['hi', 'CH max heat input (kW net)', 'decimal'],
    ['hiMin', 'CH min heat input (kW net), N/A if none', ''],
    ['co2Max', 'CO2 % at maximum rate', 'decimal'],
    ['co2Min', 'CO2 % at minimum rate', 'decimal'],
    ['co2Tol', 'CO2 tolerance, plus or minus (%)', 'decimal'],
    ['ratio', 'Max CO/CO2 ratio', 'decimal'],
    ['co', 'Max CO (ppm)', 'decimal'],
    ['fan', 'Fan pressure (mbar), as printed on the sheet', 'decimal'],
    ['inlet', 'Min gas inlet working pressure (mbar)', 'decimal']
  ];
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const digits = s => String(s || '').replace(/\D/g, '');
  const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.').replace(/[^\d.\-−]/g, '').replace('−', '-')); return isFinite(n) ? n : null; };
  const val = (x, k) => String((x && x['t_' + k]) || '').trim();
  const hasFigures = x => FIELDS.some(([k]) => k !== 'gc' && k !== 'flue' && k !== 'hiMin' && val(x, k) !== '');
  const esc2 = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* the saved boiler that matches: GC number first, then make + model */
  function find(make, model, gc) {
    if (typeof qSeed === 'function' && typeof settings !== 'undefined' && !settings.btSeed) qSeed();
    const list = ((typeof settings !== 'undefined' && settings.qList) || []).filter(x => x.type === 'Boiler' && hasFigures(x));
    if (!list.length) return null;
    const g = digits(gc);
    if (g.length >= 6) { const hit = list.find(x => digits(val(x, 'gc')) === g); if (hit) return hit; }
    const m = norm(make), n = norm(model); if (n.length < 3) return null;
    return list.find(x => {
      const xn = norm(x.name), xm = norm(x.make);
      return xn.length >= 3 && (!xm || !m || m.includes(xm) || xm.includes(m)) && n.includes(xn);
    }) || null;
  }

  /* where each reading lives on the form being shown */
  function context() {
    if (typeof ui === 'undefined' || ui.view !== 'form' || !ui.rec) return null;
    const r = ui.rec, t = typeOf(r);
    if (t === 'service') {
      const make = r.make === 'Other' ? r.makeOther : r.make;
      return { mp: 'model', make, worc: /worcester/i.test(make || ''), res: { fpValue: 'fpResult', bpValue: 'bpResult', fgCoMin: 'fgResult', fgCoMax: 'fgResult', fgCo2Min: 'fgResult', fgCo2Max: 'fgResult', fgRatioMin: 'fgResult', fgRatioMax: 'fgResult' }, boiler: find(make, r.model, r.gc), p: { model: ['model'], fan: ['fpValue'], inlet: ['bpValue'], hi: ['grValue'], co: ['fgCoMin', 'fgCoMax'], co2Min: ['fgCo2Min'], co2Max: ['fgCo2Max'], ratio: ['fgRatioMin', 'fgRatioMax'] } };
    }
    if (t === 'gas') {
      const i = Math.min(ui.appTab || 0, (+r.applianceCount || 1) - 1), a = (r.appliances || [])[i]; if (!a) return null;
      const P = k => 'appliances.' + i + '.' + k;
      return { mp: P('model'), make: a.manufacturer, worc: /worcester/i.test(a.manufacturer || ''), boiler: find(a.manufacturer, a.model, a.gc), p: { model: [P('model')], fan: [P('fanPress')], inlet: [P('op')], hi: [P('hi')], co: [P('coMin'), P('coMax')], co2Min: [P('co2Min')], co2Max: [P('co2Max')], ratio: [P('ratioMin'), P('ratioMax')] } };
    }
    return null;
  }

  /* is a reading inside the manufacturer's figure? true / false, or null when it cannot be judged */
  function judge(key, v, x) {
    const n = num(v); if (n === null) return null;
    const lim = k => num(val(x, k));
    if (key === 'co' || key === 'ratio') { const l = lim(key); return l === null ? null : n <= l; }
    if (key === 'inlet') { const l = lim('inlet'); return l === null ? null : n >= l; }
    if (key === 'co2Max' || key === 'co2Min') { const l = lim(key), tol = lim('co2Tol'); return l === null || tol === null ? null : n >= l - tol - 1e-9 && n <= l + tol + 1e-9; }
    return null;   // heat input and fan pressure are shown only
  }
  const LABEL = { model: 'this boiler', fan: 'Fan pressure', inlet: 'Gas inlet working pressure', hi: 'Gas rate / heat input', co: 'CO', co2Min: 'CO2', co2Max: 'CO2', ratio: 'CO/CO2 ratio' };
  const infoKey = k => (k === 'co2Min' || k === 'co2Max') ? 'co2' : k;

  /* each line of the data sheet is tagged with the reading it belongs to, so a reading's (i) can show just what that test needs */
  function lines(x) {
    const f = k => val(x, k), out = [], tol = f('co2Tol') ? ' ( +/- ' + f('co2Tol') + ' )' : '';
    if (f('flue')) out.push(['Flue Type', f('flue'), 'model']);
    if (f('hi')) out.push(['CH Max Heat Input (Kw Net)', f('hi'), 'hi']);
    out.push(['CH Min Heat Input (Kw Net)', f('hiMin') || 'N/A', 'hi']);
    if (f('co2Max')) out.push(['Max CO2 %', f('co2Max') + tol, 'co2']);
    if (f('co2Min')) out.push(['Min CO2 %', f('co2Min') + tol, 'co2']);
    if (f('ratio')) out.push(['Maximum Ratio', f('ratio'), 'ratio']);
    if (f('co')) out.push(['Maximum CO (ppm)', f('co'), 'co']);
    if (f('fan')) out.push(['Fan Pressure (Pressure will read negative and be greater than) (mb)', '- ' + String(f('fan')).replace(/^[-−]\s*/, ''), 'fan']);
    if (f('inlet')) out.push(['Min Gas Inlet Working Pressure (mb)', f('inlet'), 'inlet']);
    return out;
  }

  /* put the (i) buttons beside the readings and colour them. Safe to run any number of times. */
  function paint() { if (watcher) watcher.disconnect(); try { paint1(); } finally { watch(); } }
  function paint1() {
    const c = context();
    document.querySelectorAll('.tolI').forEach(b => b.remove());
    document.querySelectorAll('.f.tolok,.f.tolbad').forEach(e => e.classList.remove('tolok', 'tolbad'));
    if (!c) return;
    if (typeof qSeed === 'function' && typeof settings !== 'undefined' && !settings.btSeed) qSeed();
    if (!c.boiler) return;
    Object.keys(c.p).forEach(key => c.p[key].forEach(path => {
      const lab = document.querySelector('.f[data-f="' + path + '"]'); if (!lab) return;
      const sp = lab.querySelector('span'); if (sp) { const b = document.createElement('button'); b.type = 'button'; b.className = 'tolI'; b.setAttribute('aria-label', 'Manufacturer figures for ' + (LABEL[key] || 'this reading')); b.dataset.btk = infoKey(key); b.textContent = 'i'; sp.appendChild(b); }
      const inp = lab.querySelector('input'), j = inp && c.boiler ? judge(key, inp.value, c.boiler) : null;
      if (j === true) lab.classList.add('tolok'); else if (j === false) lab.classList.add('tolbad');
    }));
  }


  function openInfo(focus) {
    const c = context(); if (!c) return;
    const old0 = document.getElementById('btSheet'); if (old0) old0.remove();
    if (!c.boiler) return;
    const x = c.boiler, old = document.getElementById('btSheet'); if (old) old.remove();
    const all = lines(x), part = focus && focus !== 'model' ? all.filter(r => r[2] === focus) : all;
    const rows = part.map(([k, v]) => `<tr><th scope="row">${esc2(k)}</th><td>${esc2(v)}</td></tr>`).join('');
    const biz = (typeof settings !== 'undefined' && settings.businessName) || '';
    const d = document.createElement('div'); d.id = 'btSheet'; d.className = 'sheetbg';
    d.innerHTML = `<div class="sheet" role="dialog" aria-label="Manufacturer data sheet"><div class="grab"></div>
      <div class="dsheet"><div class="dshead"><span class="dskick">${focus && focus !== 'model' ? 'Manufacturer figure for this check' : 'Manufacturer data sheet · check this is the right boiler'}</span><div class="dsmake">${esc2(x.make || '')}</div><h2>${esc2(x.name || '')}</h2>${val(x, 'gc') ? `<span class="dsgc">GC ${esc2(val(x, 'gc'))}</span>` : ''}</div>
        <table class="dstable"><tbody>${rows}</tbody></table>
        <p class="dsfoot">${biz ? esc2(biz) + ' · ' : ''}Figures saved in your Price list. Green or red on a reading is only a guide, so always check against the manufacturer's data sheet.</p></div>
      <button type="button" class="btn block" id="btX" style="margin-top:12px">Close</button></div>`;
    document.body.appendChild(d);
    d.addEventListener('click', ev => { if (ev.target === d || ev.target.id === 'btX') d.remove(); });
  }

  /* a reading outside the manufacturer's figure asks what the engineer wants to record (service form: Pass or Fail for that check) */
  const said = {};
  function outText(key, n, x) {
    const f = k => val(x, k);
    if (key === 'co') return 'CO reading ' + n + ' ppm is over the manufacturer\'s maximum of ' + f('co') + ' ppm.';
    if (key === 'ratio') return 'CO/CO2 ratio ' + n + ' is over the manufacturer\'s maximum of ' + f('ratio') + '.';
    if (key === 'inlet') return 'Gas inlet working pressure ' + n + ' mbar is below the manufacturer\'s minimum of ' + f('inlet') + ' mbar.';
    const lim = key === 'co2Max' ? f('co2Max') : f('co2Min'), tol = f('co2Tol');
    return 'CO2 reading ' + n + ' % is outside the manufacturer\'s ' + lim + ' % (plus or minus ' + tol + ').';
  }
  function checkOut(path, value) {
    const c = context(); if (!c || !c.boiler) return;
    const key = Object.keys(c.p).find(k => c.p[k].includes(path)); if (!key) return;
    if (judge(key, value, c.boiler) !== false) { delete said[path]; return; }
    if (said[path] === value) return; said[path] = value;
    const res = c.res && c.res[path], old = document.getElementById('btOut'); if (old) old.remove();
    const d = document.createElement('div'); d.id = 'btOut'; d.className = 'sheetbg';
    d.innerHTML = `<div class="sheet" role="dialog" aria-label="Out of range"><div class="grab"></div><h2 style="color:var(--bad)">Out of range</h2>
      <p>${esc2(outText(key, num(value), c.boiler))}</p>
      ${res ? '<p class="small muted">Choose the result for this check. You can change it later.</p><div class="row"><button type="button" class="btn danger grow" data-bt="FAIL">Fail</button><button type="button" class="btn grow" data-bt="PASS">Pass</button></div><button type="button" class="btn ghost block" data-bt="" style="margin-top:10px">Decide later</button>'
          : '<p class="small muted">This is a guide from the manufacturer\'s figures. Check the reading again and the data sheet.</p><button type="button" class="btn block" data-bt="">OK</button>'}</div>`;
    document.body.appendChild(d);
    d.addEventListener('click', ev => {
      const b = ev.target.closest('[data-bt]');
      if (!b && ev.target !== d) return;
      if (b && b.dataset.bt && res) { setP(ui.rec, res, b.dataset.bt); ui.pdf = null; persistRecSoon(); render(); }
      d.remove();
    });
  }


  /* when the model typed on the form matches a saved boiler and the GC number is still empty, fill the GC number in */
  /* the GC number follows the model. It is replaced only while it is empty or still the number filled in automatically, so a number typed by hand is never overwritten */
  function fillGc(path) {
    if (typeof ui === 'undefined' || !ui.rec || ui.view !== 'form') return;
    const r = ui.rec, t = typeOf(r); let make, model, gcPath, holder, cur;
    if (t === 'service' && path === 'model') { make = r.make === 'Other' ? r.makeOther : r.make; model = r.model; gcPath = 'gc'; holder = r; }
    else if (t === 'gas' && /^appliances\.\d+\.model$/.test(path)) { const a = (r.appliances || [])[path.split('.')[1]]; if (!a) return; make = a.manufacturer; model = a.model; gcPath = 'appliances.' + path.split('.')[1] + '.gc'; holder = a; }
    else return;
    cur = String(holder.gc || '');
    if (cur && cur !== holder.gcAuto) return;   // typed by hand
    const x = find(make, model, ''), g = x ? val(x, 'gc') : '';
    if (g === cur) return;
    if (!g && !cur) return;
    holder.gc = g; holder.gcAuto = g; ui.pdf = null; persistRecSoon();
    const inp = document.querySelector('.f[data-f="' + gcPath + '"] input'); if (inp) inp.value = g;
    if (g && typeof toast === 'function') toast('GC number filled in');
    later();
  }

  /* the boxes shown on a boiler in the Price list */
  function editHtml(x) {
    const i = ([k, l, m]) => `<label class="f"><span>${l}</span><input data-pi="t_${k}" data-id="${x.id}" value="${esc2(x['t_' + k] || '')}" ${m ? `inputmode="${m}"` : ''} autocomplete="off"></label>`;
    return `<h3 style="margin:14px 0 4px">Manufacturer figures</h3><p class="small muted" style="margin:0 0 10px">From the boiler's data sheet. When this boiler is chosen on a service or check, the figures show beside each reading. Leave out any you don't have.</p>
      ${FIELDS.map(i).join('')}`;
  }

  /* the Greenstar 24Ri from the engineer's data sheet, added once so there is an example to copy */
  function seed() {
    if (typeof settings === 'undefined' || !settings.qList || settings.btSeed) return;
    settings.btSeed = 1;
    if (settings.qList.some(x => x.type === 'Boiler' && norm(x.make).includes('worcester') && /24ri/i.test(x.name))) { saveSettings(); return; }
    settings.qList.push({ id: QUO.newId(), type: 'Boiler', make: 'Worcester Bosch', name: 'Greenstar 24Ri', kind: 'Combination', kw: '24', warranty: '', unit: '', cost: '', markup: '', price: '',
      t_gc: '41-311-65', t_flue: 'Room Sealed', t_hiMin: 'N/A', t_hi: '24.62', t_co2Max: '9.8', t_co2Min: '9.2', t_co2Tol: '0.5', t_ratio: '0.0020', t_co: '200', t_fan: '3.1', t_inlet: '16.5' });
    saveSettings();
  }


  /* typing in the model box suggests boilers from the Price list; tapping one fills the model (and the GC number if it is empty) */
  const modelPath = path => { const r = ui.rec; if (!r || ui.view !== 'form') return false; const t = typeOf(r); return (t === 'service' && path === 'model') || (t === 'gas' && /^appliances\.\d+\.model$/.test(path)); };
  function suggest(inp) {
    const path = inp.dataset.k, lab = inp.closest('.f'); if (!lab) return;
    if (typeof qSeed === 'function') qSeed();   // makes sure the starter boilers (and the Greenstar 24Ri figures) are in the Price list
    let box = document.getElementById('btSug'); if (box) box.remove();
    const toks = norm(inp.value) ? String(inp.value).toLowerCase().split(/\s+/).map(norm).filter(Boolean) : [];
    if (!toks.length) return;
    const r = ui.rec, mk = norm(typeOf(r) === 'service' ? (r.make === 'Other' ? r.makeOther : r.make) : ((r.appliances || [])[+path.split('.')[1]] || {}).manufacturer);
    const hits = (settings.qList || []).filter(x => x.type === 'Boiler' && x.name && (!mk || !norm(x.make) || norm(x.make).includes(mk) || mk.includes(norm(x.make))) && toks.every(t => norm((x.make || '') + ' ' + x.name).includes(t))).slice(0, 6);
    if (!hits.length || (hits.length === 1 && norm(hits[0].name) === norm(inp.value))) return;
    box = document.createElement('div'); box.id = 'btSug'; box.style.margin = '-4px 0 12px';
    box.innerHTML = hits.map(x => `<button type="button" class="item cpick" data-bts="${esc2(x.id)}"><div class="t">${esc2(x.name)}</div><div class="s">${esc2([x.make, x.kind, x.t_gc ? 'GC ' + x.t_gc : ''].filter(Boolean).join(' · '))}</div></button>`).join('');
    lab.after(box);
    box.addEventListener('click', ev => {
      const b = ev.target.closest('[data-bts]'); if (!b) return;
      const x = (settings.qList || []).find(y => y.id === b.dataset.bts); if (!x) return;
      setP(ui.rec, path, x.name); inp.value = x.name; ui.pdf = null; persistRecSoon(); box.remove();
      fillGc(path); later();
    });
  }
  document.addEventListener('input', e => { const t = e.target; if (t && t.tagName === 'INPUT' && t.dataset && t.dataset.k && modelPath(t.dataset.k)) suggest(t); });

  let timer = 0; const later = () => { clearTimeout(timer); timer = setTimeout(paint, 30); };
  /* watch the screen for redraws; stop watching while painting, or painting itself would trigger another paint, forever, and the buttons would be rebuilt under a finger */
  let watcher = null;
  const watch = () => { const v = document.getElementById('view'); if (v && watcher) watcher.observe(v, { childList: true, subtree: true }); };
  const start = () => { watcher = new MutationObserver(later); watch(); later(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  document.addEventListener('change', e => { const t = e.target; if (t && t.dataset && t.dataset.k && t.tagName === 'INPUT') setTimeout(() => { fillGc(t.dataset.k); checkOut(t.dataset.k, t.value); }, 60); });
  document.addEventListener('input', e => { if (e.target && e.target.dataset && e.target.dataset.k) later(); });
  /* the (i) sits inside a box's label, so a tap would also focus the box and open the keyboard, which can swallow the tap: stop that, and open on touch-end as well as click */
  let touched = 0;
  const tapInfo = e => { const b = e.target.closest && e.target.closest('.tolI'); if (!b) return; e.preventDefault(); e.stopPropagation();
    if (e.type === 'click' && Date.now() - touched < 600) return;   // the click that follows a touch we already handled
    if (e.type === 'touchend') touched = Date.now();
    openInfo(b.dataset.btk); };
  document.addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('.tolI')) e.preventDefault(); }, true);
  document.addEventListener('touchend', tapInfo, true);
  document.addEventListener('click', tapInfo, true);
  return { find, judge, paint, editHtml, seed, FIELDS };
})();
