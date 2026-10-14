/* The Today screen: next job, later today, due this week, overdue invoices, the New sheet and the first-run checklist.
   Uses what the app already keeps: bookings (cal.js), annual checks due (reminders.js) and invoices. */
const NEW_SUB = { gas: 'Landlord or homeowner', service: 'Service or repair of a gas boiler', legionella: 'Hot and cold water system checks', aircon: 'Install and commissioning report', oil: 'Service, commissioning or repair', oiltank: 'Tank, bund and oil supply pipework', quote: 'A quotation for a new boiler', gquote: 'Bathrooms, radiators, repairs and other work' };
const newName = l => String(l).replace(/^\+\s*New\s*/i, '').replace(/^./, c => c.toUpperCase());
function showNewSheet() {
  const old = document.getElementById('newSheet'); if (old) old.remove();
  const rec = REC_HOME.filter(([t]) => recOn(t) && t !== 'quote' && t !== 'gquote'), quo = REC_HOME.filter(([t]) => recOn(t) && (t === 'quote' || t === 'gquote'));
  const opt = ([t, l]) => `<button type="button" class="opt" data-act="newRec" data-type="${t}"><span>${esc(newName(l))}${NEW_SUB[t] ? `<small>${esc(NEW_SUB[t])}</small>` : ''}</span></button>`;
  const d = document.createElement('div'); d.id = 'newSheet'; d.className = 'sheetbg';
  d.innerHTML = `<div class="sheet" role="dialog" aria-label="New"><div class="grab"></div><h2>What are you doing?</h2>
    <div class="lab">Certificates and records</div>${rec.map(opt).join('')}
    ${rec.length > 1 ? `<button type="button" class="opt" data-act="pickAll2"><span>Several forms at one visit<small>Tick everything you are doing at this property</small></span></button>` : ''}
    <div class="lab">Quotes and invoices</div>${quo.map(opt).join('')}
    <button type="button" class="opt" data-act="newInvBlank"><span>Invoice</span></button>
    <button type="button" class="btn block" data-act="sheetClose" style="margin-top:6px">Cancel</button></div>`;
  document.body.appendChild(d);
}
const nextBookings = () => bkOn(localISO()).filter(b => b.status !== 'done');
function todayNext(list) {
  const now = new Date(), nm = now.getHours() * 60 + now.getMinutes();
  return list.find(b => toMin(b.time) + (+b.mins || 60) > nm) || list[0] || null;
}
function minsText(b) {
  const now = new Date(), d = toMin(b.time) - (now.getHours() * 60 + now.getMinutes());
  if (d > 90) return 'in ' + Math.round(d / 60) + ' hours'; if (d > 1) return 'in ' + d + ' min'; if (d >= -(+b.mins || 60)) return 'now'; return 'earlier today';
}
const daysLate = i => Math.max(0, Math.round((Date.parse(todayISO()) - Date.parse(i.due)) / 864e5));
const overdueInvs = () => invoices.filter(i => !i.paid && i.due && i.due < todayISO()).sort((a, b) => a.due.localeCompare(b.due));
const owedLate = () => overdueInvs().reduce((a, i) => a + invTotals(i).total, 0);
const dueSoon = () => { try { return remItems().filter(x => x.days <= 7); } catch (e) { return []; } };
function setupItems() {
  const oil = workType() === 'oil', regOk = oil ? !!(settings.oftecReg && settings.engineerName) : !!(settings.gasSafeReg && settings.gasSafeId && settings.engineerName);
  return [
    { ok: !!(settings.businessName && settings.address), t: 'Business name and address', s: 'On every certificate, quote and invoice', go: 'settings' },
    { ok: !!settings.logo, t: 'Your logo', s: 'Shows at the top of your paperwork', go: 'settings' },
    { ok: regOk, t: oil ? 'OFTEC number and your name' : 'Gas Safe number and your ID', s: 'Needed before you issue a certificate', go: 'settings' },
    { ok: !!(settings.qList || []).some(i => +i.cost > 0), t: 'Your price list', s: 'For boiler quotes. Import a spreadsheet or add as you go.', go: 'prices', optional: true }
  ];
}
function setupHtml() {
  const it = setupItems(), core = it.filter(x => !x.optional);
  if (core.every(x => x.ok)) return '';
  const done = it.filter(x => x.ok).length;
  return `<div class="checklist"><h2 style="margin-top:4px">Welcome. A few things first.</h2><p class="muted" style="margin:0 0 6px">These go on every certificate, quote and invoice, so it is worth doing once.</p>
    <div class="prog"><div style="width:${Math.round(done / it.length * 100)}%"></div></div>
    ${it.map(x => `<div class="ci ${x.ok ? 'done' : ''}"><span class="ck">${x.ok ? '&#10003;' : ''}</span><div class="tx"><b>${esc(x.t)}</b><span>${esc(x.ok ? 'Done' : x.s)}</span></div>${x.ok ? '' : `<button type="button" class="btn ${x.go === 'settings' && x === it.find(y => !y.ok) ? 'gold' : ''}" style="min-height:44px;padding:8px 14px" ${x.go === 'prices' ? 'data-act="pricesOpen"' : 'data-nav="settings"'}>Add</button>`}</div>`).join('')}</div>`;
}
function tagFor(b) {
  if (b.status === 'done') return '<span class="tag ok"><i></i>Done</span>';
  if (typeof bkClash === 'function' && bkClash(b)) return '<span class="tag bad"><i></i>Clash</span>';
  return '<span class="tag mut"><i></i>Booked</span>';
}
function todayHtml() {
  const t = localISO(), td = calOn() && settings.calHome !== 'off' ? nextBookings() : [], nx = todayNext(td), rest = td.filter(b => b !== nx);
  const soon = dueSoon(), late = overdueInvs(), nJobs = bkOn(t).length;
  const parts = []; if (calOn()) parts.push(nJobs + (nJobs === 1 ? ' job today' : ' jobs today')); if (soon.length) parts.push(soon.length + ' due this week'); if (late.length) parts.push(money(owedLate()) + ' overdue');
  const phone = b => String(b.phone || '').replace(/[^\d+]/g, '');
  const stops = td.filter(b => String(b.address || '').trim().length >= 4);
  return `<h1 style="margin-bottom:4px">${esc(dayLong(t))}</h1>
    <div class="muted" style="margin-bottom:16px">${esc(parts.join(' · ') || 'Nothing on today')}</div>
    <button type="button" class="btn gold newbtn" data-act="newSheet"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>New</button>
    ${nx ? `<div class="nextjob"><div class="row sp"><span class="tag gold"><i></i>Next job · ${esc(minsText(nx))}</span><span class="when">${esc(nx.time)}</span></div>
      <div><div class="big">${esc(nx.name || 'No name')}</div>${nx.address ? `<div class="muted">${esc(addrLine(nx.address))}</div>` : ''}<div style="margin-top:6px;font-weight:600">${esc(bkLabel(nx))}</div></div>
      <div class="acts">${phone(nx).length >= 5 ? `<a class="btn" href="tel:${esc(phone(nx))}">Call</a>` : ''}${isMobileNo(nx.phone) ? `<button type="button" class="btn" data-act="todayOtw" data-id="${nx.id}">On my way</button>` : ''}${String(nx.address || '').trim().length >= 4 ? `<a class="btn" href="${esc(mapsUrl(nx.address))}" target="_blank" rel="noopener">Navigate</a>` : ''}</div>
      <button type="button" class="btn gold block" data-act="bookOpen" data-id="${nx.id}">Open the job</button></div>` : (calOn() && settings.calHome !== 'off' ? `<div class="line" style="justify-content:space-between"><span class="muted">Nothing booked in today.</span><button type="button" class="btn" data-act="bookNew" data-d="${t}">+ Appointment</button></div>` : '')}
    ${rest.length ? `<div class="sechead"><h2>Later today</h2>${stops.length >= 2 ? `<button type="button" class="btn" data-act="routeOpen">Route · ${stops.length} stops</button>` : ''}</div>
      ${rest.map(b => `<button type="button" class="line" data-act="bookOpen" data-id="${b.id}"><b style="width:48px;flex:none">${esc(b.time)}</b><span class="main"><b>${esc(b.name || 'No name')}</b><span>${esc(bkLabel(b))}</span></span>${tagFor(b)}</button>`).join('')}` : (stops.length >= 2 ? `<div class="sechead"><h2>Today</h2><button type="button" class="btn" data-act="routeOpen">Route · ${stops.length} stops</button></div>` : '')}
    ${soon.length ? `<div class="sechead"><h2>Due this week</h2>${remCount() > soon.length ? `<button type="button" class="btn" data-act="remOpen">See all (${remCount()})</button>` : ''}</div>
      ${soon.slice(0, 3).map(x => `<button type="button" class="line" data-act="remOpen"><span class="main"><b>${esc(x.name || 'No name')}</b><span>${esc(REM_WHAT[x.t] || '')}</span></span><span class="tag ${x.days <= 0 ? 'bad' : 'warn'}"><i></i>${x.days < 0 ? -x.days + ' days late' : x.days === 0 ? 'Today' : x.days + (x.days === 1 ? ' day' : ' days')}</span></button>`).join('')}` : ''}
    ${!soon.length && remCount() ? `<button type="button" class="btn block" data-act="remOpen" style="margin-top:12px">Annual checks due (${remCount()})</button>` : ''}
    ${late.length ? `<div class="sechead"><h2>Overdue invoices</h2><button type="button" class="btn" data-act="invOverdueView">${money(owedLate())}</button></div>
      ${late.slice(0, 3).map(i => `<div class="line"><span class="main"><b>${esc(i.customer.name || 'No customer')} · ${money(invTotals(i).total)}</b><span>${esc(i.number)} · ${daysLate(i)} day${daysLate(i) === 1 ? '' : 's'} late${i.chases ? ' · chased ' + i.chases + '×' : ''}</span></span><button type="button" class="btn" data-act="chaseOpen" data-id="${i.id}">Chase</button></div>`).join('')}
      ${late.length > 3 ? `<button type="button" class="btn block" data-act="invOverdueView">See all ${late.length} overdue</button>` : ''}` : ''}`;
}
document.addEventListener('click', e => {
  const sh = document.getElementById('newSheet');
  if (sh && (e.target === sh || e.target.closest('#newSheet .opt'))) { setTimeout(() => { const s = document.getElementById('newSheet'); if (s) s.remove(); }, 0); }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'newSheet') { if (CLOUD.locked()) { lockedMsg(); return; } showNewSheet(); }
  else if (a === 'sheetClose') { const s = document.getElementById('newSheet'); if (s) s.remove(); }
  else if (a === 'pickAll2') { ui.formFrom = null; ui.pick = { types: {}, customer: null }; ui.view = 'pick'; render(); window.scrollTo(0, 0); }
  else if (a === 'todayOtw') {
    const x = bookings.find(z => z.id === b.dataset.id); if (!x) return;
    const body = otwText(x), ph = String(x.phone || '').replace(/[^\d+]/g, '');
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) { const el = document.createElement('a'); el.href = 'sms:' + ph + '?&body=' + encodeURIComponent(body); document.body.appendChild(el); el.click(); el.remove(); }
    else { try { navigator.clipboard.writeText(body); toast('Message copied. Paste it into a text to ' + x.phone); } catch (err) { toast('Texts open on a phone.'); } }
  }
  else if (a === 'invOverdueView') { ui.view = 'invoices'; ui.invTab = 'inv'; ui.invFilter = 'overdue'; render(); window.scrollTo(0, 0); }
}, true);
