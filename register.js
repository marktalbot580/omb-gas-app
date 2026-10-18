/* Appliance register: for each customer and property, the appliances seen on their past records (make, model, GC number, serial,
   where it is, last visit and when it is next due). Built from the records, so it fills itself in. Starting a new record from here
   copies the details across (the same copy the "You were here before" button on a form does). */
function registerItems(c) {
  const nm = String(c.name || '').trim().toLowerCase();
  const mine = records.filter(r => (r.customerId === c.id || (!r.customerId && nm && String((r.customer || {}).name || '').trim().toLowerCase() === nm)) && ['gas', 'service', 'oil'].includes(typeOf(r)))
    .sort((a, b) => String(b.inspectionDate).localeCompare(String(a.inspectionDate)) || (b.updated || 0) - (a.updated || 0));
  const out = [], seen = new Set(), oth = (v, o) => (v === 'Other' ? o : v) || '';
  const add = x => { const k = [addrKey(x.addr), x.t, (x.make + '|' + x.model).toLowerCase(), (x.loc || '').toLowerCase()].join('|'); if (seen.has(k)) return; seen.add(k); out.push(x); };
  mine.forEach(r => {
    const t = typeOf(r), base = { addr: r.jobAddress || '', t, id: r.id, last: r.inspectionDate, due: r.renewal || '' };
    if (t === 'gas') (r.appliances || []).slice(0, +r.applianceCount || 1).forEach(a => { if (a.model || a.manufacturer) add({ ...base, title: oth(a.type, a.typeOther) || 'Appliance', loc: oth(a.location, a.locationOther), make: a.manufacturer || '', model: a.model || '', gc: a.gc || '', serial: a.serial || '', flue: a.flue || '' }); });
    else if ((r.make || r.model)) add({ ...base, title: t === 'oil' ? 'Oil boiler' : 'Boiler', loc: oth(r.location, r.locationOther), make: oth(r.make, r.makeOther), model: r.model || '', gc: r.gc || '', serial: r.serial || '', flue: oth(r.flue, r.flueOther), kind: oth(r.systemType, r.systemOther), fuel: t === 'oil' ? oth(r.fuel, r.fuelOther) : '', age: r.age || '' });
  });
  return out;
}
function registerHtml(c) {
  const items = registerItems(c);
  if (!items.length) return '<div class="empty">No appliances yet.<br>They are added here automatically when you complete a gas safety, boiler service or oil boiler record for this customer.</div>';
  const groups = {}; items.forEach(x => { (groups[addrKey(x.addr)] = groups[addrKey(x.addr)] || { addr: x.addr, list: [] }).list.push(x); });
  const startLabel = { gas: 'Start gas safety record, pre-filled', service: 'Start service, pre-filled', oil: 'Start oil service, pre-filled' };
  const kv = (l, v) => v ? `<div><span class="muted small">${l}</span><b style="display:block;font-weight:600">${esc(v)}</b></div>` : '';
  return Object.values(groups).map(g => `<h2 style="margin-top:6px">${esc(addrFirst(g.addr) || 'No address')}</h2>${g.list.map(x => {
    const days = x.due ? Math.round((Date.parse(x.due) - Date.parse(todayISO())) / 864e5) : null;
    const tag = days === null ? '' : days < 0 ? `<span class="tag bad"><i></i>${-days} day${days === -1 ? '' : 's'} overdue</span>` : days <= 56 ? `<span class="tag warn"><i></i>Due in ${days} day${days === 1 ? '' : 's'}</span>` : `<span class="tag ok"><i></i>Due ${esc(ukDate(x.due))}</span>`;
    const ds = HIST.defectState(x, c), nOpen = ds.open.length;
    const alert = nOpen ? `<button type="button" data-act="apHist" data-id="${x.id}" data-focus="1" style="margin:8px 0 0;width:100%;text-align:left;background:var(--bad);color:#fff;border:0;border-radius:10px;padding:10px 12px;font-weight:700;font-size:14px;min-height:44px">\u26A0 ${nOpen} open safety defect${nOpen > 1 ? 's' : ''}${ds.open.some(d => d.cls === 'ID' || d.cls === 'Immediately dangerous') ? ' \u00B7 immediately dangerous' : ''} \u2013 tap to see</button>`
      : ds.informed.length ? `<button type="button" data-act="apHist" data-id="${x.id}" style="margin:8px 0 0;width:100%;text-align:left;background:transparent;color:var(--warn);border:1.5px solid var(--warn);border-radius:10px;padding:8px 12px;font-weight:600;font-size:13px;min-height:40px">Customer informed of ${ds.informed.length} defect${ds.informed.length > 1 ? 's' : ''} \u2013 tap to see</button>` : '';
    return `<div class="card"><div class="row sp" style="align-items:flex-start;gap:10px"><div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:18px">${esc(x.title)}${x.loc ? ' · ' + esc(x.loc) : ''}</div>${tag}</div>${alert}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 14px;margin:12px 0">
        ${kv('Make and model', [x.make, x.model].filter(Boolean).join(' '))}${kv('Type', x.kind)}${kv('GC number (Gas Council)', x.gc)}${kv('Serial number', x.serial)}${kv('Flue', x.flue)}${kv('Fuel', x.fuel)}${kv('Age', x.age)}${kv('Last visit', x.last ? ukDate(x.last) : '')}</div>
      <button type="button" class="btn gold block" data-act="regStart" data-id="${x.id}">${startLabel[x.t]}</button>
      <button type="button" class="btn block ghost" style="margin-top:8px" data-act="apHist" data-id="${x.id}">History: every visit, readings and defects</button></div>`;
  }).join('')}`).join('');
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act="regStart"]'); if (!b) return;
  if (CLOUD.locked()) { lockedMsg(); return; }
  const src = records.find(x => x.id === b.dataset.id); if (!src) return;
  const cu = customers.find(c => c.id === src.customerId) || (ui.cust && ui.cust.id ? customers.find(c => c.id === ui.cust.id) : null);
  ui.formFrom = null; ui.pick = { types: { [typeOf(src)]: true }, customer: cu }; startJob();
  const r = ui.rec; if (!r) return;
  r.jobAddress = src.jobAddress || ''; if (!r.customerId && cu) r.customerId = cu.id; persistRec(r);
  if (prevVisit(r)) applyPrev(r); render(); window.scrollTo(0, 0);
}, true);
