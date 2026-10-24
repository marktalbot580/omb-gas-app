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
    const list = ((typeof settings !== 'undefined' && settings.qList) || []).filter(x => x.type === 'Boiler' && hasFigures(x));
    if (!list.length) return null;
    const g = digits(gc);
    if (g.length >= 6) { const hit = list.find(x => digits(val(x, 'gc')) === g); if (hit) return hit; }
    const m = norm(make), n = norm(model); if (n.length < 3) return null;
    return list.find(x => {
      const xn = norm(x.name), xm = norm(x.make);
      return xn.length >= 3 && (!xm || !m || m.includes(xm) || xm.includes(m)) && (n.includes(xn) || xn.includes(n));
    }) || null;
  }

  /* where each reading lives on the form being shown */
  function context() {
    if (typeof ui === 'undefined' || ui.view !== 'form' || !ui.rec) return null;
    const r = ui.rec, t = typeOf(r);
    if (t === 'service') {
      const make = r.make === 'Other' ? r.makeOther : r.make;
      return { boiler: find(make, r.model, r.gc), p: { fan: ['fpValue'], inlet: ['bpValue'], hi: ['grValue'], co: ['fgCoMin', 'fgCoMax'], co2Min: ['fgCo2Min'], co2Max: ['fgCo2Max'], ratio: ['fgRatioMin', 'fgRatioMax'] } };
    }
    if (t === 'gas') {
      const i = Math.min(ui.appTab || 0, (+r.applianceCount || 1) - 1), a = (r.appliances || [])[i]; if (!a) return null;
      const P = k => 'appliances.' + i + '.' + k;
      return { boiler: find(a.manufacturer, a.model, a.gc), p: { fan: [P('fanPress')], inlet: [P('op')], hi: [P('hi')], co: [P('coMin'), P('coMax')], co2Min: [P('co2Min')], co2Max: [P('co2Max')], ratio: [P('ratioMin'), P('ratioMax')] } };
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
  const LABEL = { fan: 'Fan pressure', inlet: 'Gas inlet working pressure', hi: 'Gas rate / heat input', co: 'CO', co2Min: 'CO2', co2Max: 'CO2', ratio: 'CO/CO2 ratio' };
  const infoKey = k => (k === 'co2Min' || k === 'co2Max') ? 'co2' : k;

  function lines(x) {
    const f = k => val(x, k), out = [];
    if (f('flue')) out.push(['Flue type', f('flue')]);
    if (f('hi')) out.push(['CH max heat input', f('hi') + ' kW net']);
    out.push(['CH min heat input', f('hiMin') || 'N/A']);
    if (f('co2Max')) out.push(['CO2 at maximum rate', f('co2Max') + ' %' + (f('co2Tol') ? ' (±' + f('co2Tol') + ')' : '')]);
    if (f('co2Min')) out.push(['CO2 at minimum rate', f('co2Min') + ' %' + (f('co2Tol') ? ' (±' + f('co2Tol') + ')' : '')]);
    if (f('ratio')) out.push(['Max CO/CO2 ratio', f('ratio')]);
    if (f('co')) out.push(['Max CO', f('co') + ' ppm']);
    if (f('fan')) out.push(['Fan pressure (pressure will read negative and be greater than)', '-' + String(f('fan')).replace(/^[-−]/, '') + ' mbar']);
    if (f('inlet')) out.push(['Min gas inlet working pressure', f('inlet') + ' mbar']);
    return out;
  }

  /* put the (i) buttons beside the readings and colour them. Safe to run any number of times. */
  function paint() {
    const c = context();
    document.querySelectorAll('.tolI').forEach(b => b.remove());
    document.querySelectorAll('.f.tolok,.f.tolbad').forEach(e => e.classList.remove('tolok', 'tolbad'));
    if (!c || !c.boiler) return;
    Object.keys(c.p).forEach(key => c.p[key].forEach(path => {
      const lab = document.querySelector('.f[data-f="' + path + '"]'); if (!lab) return;
      const sp = lab.querySelector('span'); if (sp) { const b = document.createElement('button'); b.type = 'button'; b.className = 'tolI'; b.setAttribute('aria-label', 'Manufacturer figures for ' + (LABEL[key] || 'this reading')); b.dataset.btk = infoKey(key); b.textContent = 'i'; sp.appendChild(b); }
      const inp = lab.querySelector('input'), j = inp ? judge(key, inp.value, c.boiler) : null;
      if (j === true) lab.classList.add('tolok'); else if (j === false) lab.classList.add('tolbad');
    }));
  }

  function openInfo(focus) {
    const c = context(); if (!c || !c.boiler) return;
    const x = c.boiler, old = document.getElementById('btSheet'); if (old) old.remove();
    const rows = lines(x).map(([k, v]) => `<div class="line"><span class="main"><b>${esc2(k)}</b><span>${esc2(v)}</span></span></div>`).join('');
    const d = document.createElement('div'); d.id = 'btSheet'; d.className = 'sheetbg';
    d.innerHTML = `<div class="sheet" role="dialog" aria-label="Manufacturer figures"><div class="grab"></div><h2>${esc2(((x.make || '') + ' ' + (x.name || '')).trim())}</h2>
      <p class="small muted" style="margin-top:0">Manufacturer figures${val(x, 'gc') ? ' · GC ' + esc2(val(x, 'gc')) : ''}. Green or red on a reading is only a guide, so always check against the data sheet.</p>${rows}
      <button type="button" class="btn block" id="btX" style="margin-top:10px">Close</button></div>`;
    document.body.appendChild(d);
    d.addEventListener('click', ev => { if (ev.target === d || ev.target.id === 'btX') d.remove(); });
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

  let timer = 0; const later = () => { clearTimeout(timer); timer = setTimeout(paint, 30); };
  const start = () => { const v = document.getElementById('view'); if (v) new MutationObserver(later).observe(v, { childList: true, subtree: true }); later(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  document.addEventListener('input', e => { if (e.target && e.target.dataset && e.target.dataset.k) later(); });
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.tolI'); if (b) { e.preventDefault(); e.stopPropagation(); openInfo(b.dataset.btk); } }, true);
  return { find, judge, paint, editHtml, seed, FIELDS };
})();
