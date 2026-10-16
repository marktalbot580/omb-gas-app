/* Defect follow-up: any "immediately dangerous" or "at risk" defect on a finished record stays on a list until you mark it fixed.
   Home shows how many are open; the list has a text to the customer, a return visit booking and a Mark fixed button.
   A defect's fixed state is kept on its own record (rec.dfRes) so it syncs and backs up with everything else. */
'use strict';
const FU = (() => {
  const GAS_OPEN = { ID: 'Immediately dangerous', AR: 'At risk' };
  const OIL_OPEN = ['At risk', 'Immediately dangerous'];
  const days = d => Math.max(0, Math.round((Date.parse(todayISO()) - Date.parse(d)) / 864e5));
  function items() {
    const out = [];
    records.forEach(r => {
      if (r.sample || r.status !== 'complete') return;
      const t = typeOf(r), res = r.dfRes || {};
      const push = (key, cls, text, action) => { if (!res[key]) out.push({ r, key, cls, text: String(text || '').trim(), action: String(action || '').trim(), date: r.inspectionDate || '' }); };
      if (t === 'gas') (r.defects || []).slice(0, +r.defectCount || 0).forEach((d, i) => { if (GAS_OPEN[d.cls]) push('g' + i, GAS_OPEN[d.cls], d.text, d.action); });
      else if (t === 'oil' && OIL_OPEN.includes(r.defectClass)) push('oil', r.defectClass, r.defects, '');
    });
    return out.sort((a, b) => (a.cls === b.cls ? 0 : a.cls === 'Immediately dangerous' ? -1 : 1) || a.date.localeCompare(b.date));
  }
  function banner() {
    const it = items(); if (!it.length) return '';
    const old = it.filter(x => days(x.date) >= 7).length, id = it.filter(x => x.cls === 'Immediately dangerous').length;
    return `<button type="button" class="notice ${old || id ? 'err' : ''}" style="display:block;width:100%;text-align:left" data-act="fuOpen"><b>${it.length} safety defect${it.length > 1 ? 's' : ''} still open.</b>${old ? ` ${old} ${old > 1 ? 'are' : 'is'} over a week old.` : ''} Tap to follow up.</button>`;
  }
  const wording = x => {
    const c = x.r.customer || {}, who = String(c.name || '').split(' ')[0] || 'there', biz = settings.businessName || settings.engineerName || 'your gas engineer';
    return `Hi ${who}, it's ${biz}. Following my visit on ${ukDate(x.date)}${x.r.jobAddress ? ' at ' + addrFirst(x.r.jobAddress) : ''}, there is still a safety issue outstanding: ${x.text || 'a defect on the appliance'} (${x.cls.toLowerCase()}). Please get in touch so we can arrange to put it right.${settings.phone ? ' ' + settings.phone : ''}`;
  };
  function html() {
    const it = items();
    return `<div class="sheet"><div class="grab"></div><h2>Safety defects to follow up</h2>
      <p class="small muted" style="margin:0 0 10px">Immediately dangerous and at risk defects stay here until you mark them fixed.</p>
      ${it.map(x => `<div class="card" style="margin:0 0 10px"><div class="row sp"><b>${esc(x.r.customer.name || 'Customer')}</b><span class="tag ${x.cls === 'Immediately dangerous' ? 'bad' : 'warn'}"><i></i>${esc(x.cls)}</span></div>
        <div class="small muted">${esc(addrFirst(x.r.jobAddress) || '')} · found ${esc(ukDate(x.date))} (${days(x.date)} day${days(x.date) === 1 ? '' : 's'} ago)</div>
        <div style="margin:6px 0">${esc(x.text || 'No description')}</div>${x.action ? `<div class="small muted">Action taken: ${esc(x.action)}</div>` : ''}
        <div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap">
          ${x.r.customer.phone ? `<button type="button" class="btn grow" data-act="fuText" data-id="${x.r.id}" data-k="${x.key}">Text customer</button>` : ''}
          <button type="button" class="btn grow" data-act="fuBook" data-id="${x.r.id}" data-k="${x.key}">Book return visit</button></div>
        <div class="row" style="gap:8px;margin-top:8px">
          <button type="button" class="btn grow gold" data-act="fuFixed" data-id="${x.r.id}" data-k="${x.key}">Mark fixed</button>
          <button type="button" class="btn grow ghost" data-act="fuRec" data-id="${x.r.id}">Open record</button></div></div>`).join('') || '<div class="empty">Nothing outstanding. Defects you record as at risk or immediately dangerous will appear here.</div>'}
      <button type="button" class="btn block" data-act="fuClose" style="margin-top:6px">Close</button></div>`;
  }
  const repaint = () => { const d = document.getElementById('fuSheet'); if (d) d.innerHTML = html(); if (ui.view === 'home') { const y = window.scrollY; render(); window.scrollTo(0, y); } };
  const close = () => { const d = document.getElementById('fuSheet'); if (d) d.remove(); };
  const find = b => items().find(x => x.r.id === b.dataset.id && x.key === b.dataset.k);
  document.addEventListener('click', e => {
    if (e.target.id === 'fuSheet') { close(); return; }
    const b = e.target.closest('[data-act]'); if (!b || !/^fu[A-Z]/.test(b.dataset.act)) return;
    e.stopImmediatePropagation();
    if (CLOUD.locked() && (b.dataset.act === 'fuFixed' || b.dataset.act === 'fuBook')) { lockedMsg(); return; }
    switch (b.dataset.act) {
      case 'fuOpen': { close(); const d = document.createElement('div'); d.id = 'fuSheet'; d.className = 'sheetbg'; d.innerHTML = html(); document.body.appendChild(d); break; }
      case 'fuClose': close(); break;
      case 'fuFixed': { const x = find(b); if (!x) break; x.r.dfRes = { ...(x.r.dfRes || {}), [x.key]: { d: todayISO() } }; persistRec(x.r); syncAll(); toast('Marked fixed'); repaint(); break; }
      case 'fuText': { const x = find(b); if (!x) break; const ph = String(x.r.customer.phone || '').replace(/[^\d+]/g, ''), body = wording(x);
        const a = document.createElement('a'); a.href = 'sms:' + ph + '?&body=' + encodeURIComponent(body); document.body.appendChild(a); a.click(); a.remove(); break; }
      case 'fuBook': { const x = find(b); if (!x) break; const c = customers.find(z => z.id === x.r.customerId) || null, cd = x.r.customer || {};
        close(); ui.book = newBook({ customer: c, base: { types: ['other'], other: 'Return visit: ' + (x.text || 'safety defect').slice(0, 60), date: localISO(), address: x.r.jobAddress || '', name: (c && c.name) || cd.name || '', phone: (c && c.phone) || cd.phone || '', email: (c && c.email) || cd.email || '', notes: 'Follow-up on ' + (x.r.ref || 'record') + ': ' + x.cls } });
        ui.bookFrom = 'home'; ui.view = 'book'; render(); window.scrollTo(0, 0); break; }
      case 'fuRec': { const r = records.find(z => z.id === b.dataset.id); close(); if (r) { ui.rec = r; ui.job = null; ui.step = 0; ui.pdfs = {}; ui.view = 'form'; render(); window.scrollTo(0, 0); } break; }
    }
  }, true);
  return { items, banner, html, wording };
})();
