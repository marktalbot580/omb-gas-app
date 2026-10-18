/* Appliance history: for one appliance at one property, every visit we have recorded – readings, failed checks and defects –
   newest first, with a warning when the same check has failed on several visits running. Opened from the Appliances list on a customer. */
'use strict';
const HIST = (() => {
  const nm = s => String(s || '').trim().toLowerCase();
  const oth = (v, o) => (v === 'Other' ? o : v) || '';
  const GAS_CHK = { vent: 'Ventilation', terminal: 'Flue and terminal', flueOp: 'Flue operation', safety: 'Safety devices' };
  const same = (a, b) => nm(a) === nm(b);

  function visitsFor(x, c) {
    const out = [];
    records.forEach(r => {
      if (typeOf(r) !== x.t || !(r.customerId === c.id || (!r.customerId && same(r.customer && r.customer.name, c.name)))) return;
      if (addrKey(r.jobAddress) !== addrKey(x.addr)) return;
      const v = { id: r.id, rec: r, date: r.inspectionDate || '', status: r.status, readings: [], fails: [], defects: [], safe: '' };
      if (x.t === 'gas') {
        const list = (r.appliances || []).slice(0, +r.applianceCount || 1);
        const idx = list.findIndex(a => same(a.manufacturer, x.make) && same(a.model, x.model));
        if (idx < 0) return;
        const a = list[idx], add = (l, val, u) => { if (String(val || '').trim()) v.readings.push([l, val + (u || '')]); };
        add('Operating pressure', a.op, ' mbar'); add('Heat input', a.hi, ''); add('Ratio', [a.ratioMin, a.ratioMax].filter(Boolean).join(' / '));
        add('CO', [a.coMin, a.coMax].filter(Boolean).join(' / '), ' ppm'); add('CO₂', [a.co2Min, a.co2Max].filter(Boolean).join(' / '), '%');
        Object.entries(GAS_CHK).forEach(([k, l]) => { if (/^fail$/i.test(a[k] || '')) v.fails.push({ label: l, text: '' }); });
        v.safe = a.safe || '';
        (r.defects || []).slice(0, +r.defectCount || 0).forEach((d, k) => { if (d.app === idx || (d.app === undefined && list.length === 1)) v.defects.push({ text: d.text, cls: d.cls, action: d.action, key: 'g' + k }); });
      } else {
        if (!same(oth(r.make, r.makeOther), x.make) || !same(r.model, x.model)) return;
        const add = (l, val, u) => { if (String(val || '').trim()) v.readings.push([l, val + (u || '')]); };
        const cfg = x.t === 'oil' ? OIL : SVC;
        (cfg.ALL || [...cfg.APP, ...cfg.SAFE]).forEach(ch => { if (r.chk && r.chk[ch.k] === 'FAIL') v.fails.push({ label: ch.label, text: (r.fault || {})[ch.k] || '' }); });
        if (x.t === 'service') {
          if (r.tightResult === 'FAIL') v.fails.push({ label: 'Tightness test', text: '' });
          add('Operating pressure', r.bpValue, ' mbar'); add('Gas rate', r.grValue, ' kW');
        } else {
          add('Pump pressure', r.pumpPressure, ' bar'); add('Nozzle', r.nozzleSize, ''); add('Flue gas CO₂', r.fgCo2, '%'); add('Flue gas CO', r.fgCo, ' ppm'); add('Flue temp', r.fgTemp, '°C'); add('Efficiency', r.fgEff, '%');
          if (r.defectClass && r.defectClass !== 'None' && r.defects) v.defects.push({ text: r.defects, cls: r.defectClass, action: '', key: 'oil' });
        }
        v.safe = r.safe || '';
      }
      out.push(v);
    });
    return out.sort((p, q) => String(q.date).localeCompare(String(p.date)));
  }

  /* checks that failed on the most recent visits in a row (2 or more) */
  function repeats(visits) {
    const labels = new Set(); visits.forEach(v => v.fails.forEach(f => labels.add(f.label)));
    const out = [];
    labels.forEach(l => {
      let n = 0; for (const v of visits) { if (v.fails.some(f => f.label === l)) n++; else break; }
      const total = visits.filter(v => v.fails.some(f => f.label === l)).length;
      if (n >= 2 || total >= 3) out.push({ label: l, run: n, total, of: visits.length });
    });
    return out;
  }

  /* what happened to a serious defect afterwards: fixed, or the customer was told and chose not to have it fixed */
  function resHtml(v, d) {
    const st = d.key && (d.cls === 'ID' || d.cls === 'AR' || d.cls === 'At risk' || d.cls === 'Immediately dangerous') ? FU.status(v.rec, d.key) : null;
    if (!st) return '';
    const line = st.st === 'ack' ? `Customer acknowledged on ${esc(ukDate(st.d))} and chose not to have it fixed${st.note ? ': ' + esc(st.note) : ''}` : `Fixed on ${esc(ukDate(st.d))}`;
    return `<br><span style="color:${st.st === 'ack' ? 'var(--bad)' : 'var(--ok, #2e7d32)'}"><b>${line}</b></span> <button type="button" class="btn ghost" style="min-height:28px;padding:0 8px" data-act="fuReopen" data-id="${v.id}" data-k="${d.key}">Reopen</button>`;
  }
  function html(x, c) {
    const vs = visitsFor(x, c), rp = repeats(vs);
    const title = [x.make, x.model].filter(Boolean).join(' ') || x.title;
    const clsName = k => ({ ID: 'Immediately dangerous', AR: 'At risk', NCS: 'Not to current standards' }[k] || k);
    return `<div class="sheet"><div class="grab"></div>
      <h2>${esc(title)}</h2>
      <p class="small muted" style="margin:0 0 10px">${esc([x.loc, addrFirst(x.addr)].filter(Boolean).join(' · '))} · ${vs.length} visit${vs.length === 1 ? '' : 's'} on record</p>
      ${rp.map(p => `<div class="notice err" style="margin-bottom:8px"><b>${esc(p.label)}</b> has failed on ${p.run >= 2 ? 'the last ' + p.run + ' visits running' : p.total + ' of ' + p.of + ' visits'}.</div>`).join('')}
      ${vs.map(v => `<div class="card" style="margin:0 0 10px"><div class="row sp"><b>${esc(ukDate(v.date))}</b><span class="small muted">${esc(v.status === 'complete' ? '' : 'Draft')}${v.safe ? (v.status === 'complete' ? '' : ' · ') + 'Safe to use: ' + esc(v.safe) : ''}</span></div>
        ${v.readings.length ? `<div class="small" style="margin-top:6px">${v.readings.map(r => `<span class="muted">${esc(r[0])}</span> <b>${esc(r[1])}</b>`).join(' &nbsp;·&nbsp; ')}</div>` : ''}
        ${v.fails.length ? `<div class="small" style="margin-top:6px;color:var(--bad)"><b>Failed:</b> ${v.fails.map(f => esc(f.label) + (f.text ? ' (' + esc(f.text) + ')' : '')).join(', ')}</div>` : ''}
        ${v.defects.map(d => `<div class="small" style="margin-top:6px"><b>${esc(clsName(d.cls))}:</b> ${esc(d.text)}${d.action ? '<br><span class="muted">Action: ' + esc(d.action) + '</span>' : ''}${resHtml(v, d)}</div>`).join('')}
        ${!v.readings.length && !v.fails.length && !v.defects.length ? '<div class="small muted" style="margin-top:6px">No readings, failed checks or defects recorded.</div>' : ''}
        <button type="button" class="btn ghost" style="margin-top:8px;min-height:36px" data-act="histOpen" data-id="${v.id}">Open this record</button></div>`).join('') || '<div class="empty">No visits found for this appliance.</div>'}
      <button type="button" class="btn block" data-act="histClose" style="margin-top:6px">Close</button></div>`;
  }
  function open(recId) {
    const src = records.find(r => r.id === recId); if (!src) return;
    const c = customers.find(z => z.id === src.customerId) || (ui.cust && ui.cust.id ? customers.find(z => z.id === ui.cust.id) : null) || { id: '', name: (src.customer || {}).name };
    const x = registerItems(c).find(i => i.id === recId) || registerItems(c).find(i => addrKey(i.addr) === addrKey(src.jobAddress) && i.t === typeOf(src));
    if (!x) return;
    const old = document.getElementById('histSheet'); if (old) old.remove();
    const d = document.createElement('div'); d.id = 'histSheet'; d.className = 'sheetbg'; d.innerHTML = html(x, c); document.body.appendChild(d);
  }
  const close = () => { const d = document.getElementById('histSheet'); if (d) d.remove(); };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'), bg = e.target.id === 'histSheet';
    if (bg) { close(); return; }
    if (!b) return;
    const a = b.dataset.act;
    if (a === 'apHist') { e.stopImmediatePropagation(); open(b.dataset.id); }
    else if (a === 'histClose') { e.stopImmediatePropagation(); close(); }
    else if (a === 'histOpen') { e.stopImmediatePropagation(); const r = records.find(z => z.id === b.dataset.id); close(); if (r) { ui.rec = r; ui.job = null; ui.step = 0; ui.pdfs = {}; ui.view = 'form'; render(); window.scrollTo(0, 0); } }
  }, true);
  return { visitsFor, repeats, html, open };
})();
