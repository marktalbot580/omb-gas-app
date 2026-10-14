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
function todayHtml() { setTimeout(nextDrive, 0); return todayHtml0(); }
function todayHtml0() {
  const t = localISO(), td = calOn() && settings.calHome !== 'off' ? nextBookings() : [], nx = todayNext(td), rest = td.filter(b => b !== nx);
  const soon = dueSoon(), late = overdueInvs(), nJobs = bkOn(t).length;
  const parts = []; if (calOn()) parts.push(nJobs + (nJobs === 1 ? ' job today' : ' jobs today')); if (soon.length) parts.push(soon.length + ' due this week'); if (late.length) parts.push(money(owedLate()) + ' overdue');
  const phone = b => String(b.phone || '').replace(/[^\d+]/g, '');
  const stops = td.filter(b => String(b.address || '').trim().length >= 4);
  return `<h1 style="margin-bottom:4px">${esc(dayLong(t))}</h1>
    <div class="muted" style="margin-bottom:16px">${esc(parts.join(' · ') || 'Nothing on today')}</div>
    <button type="button" class="btn gold newbtn" data-act="newSheet"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>New</button>
    ${calOn() && bkOn(addDays(t, 1)).length ? `<button type="button" class="btn block" style="margin-top:10px" data-act="routeOpen" data-day="1">Tomorrow: ${bkOn(addDays(t, 1)).length} job${bkOn(addDays(t, 1)).length === 1 ? '' : 's'}, text arrival times</button>` : ''}
    ${nx ? `<div class="nextjob"><div class="row sp"><span class="tag gold"><i></i>Next job · ${esc(minsText(nx))}</span><span class="when">${esc(nx.time)}</span></div>
      <div><div class="big">${esc(nx.name || 'No name')}</div>${nx.address ? `<div class="muted">${esc(addrLine(nx.address))}</div>` : ''}<div style="margin-top:6px;font-weight:600">${esc(bkLabel(nx))}</div><div id="nextDrive" class="muted" style="margin-top:4px"></div><div id="nextSetOff" style="margin-top:2px;font-weight:600"></div></div>
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

/* ---------- chasing overdue invoices: one sheet, you pick Text, WhatsApp or Email, and nothing goes until you tap send ---------- */
const invPhone = i => String((customers.find(c => c.id === i.customerId) || {}).phone || (i.customer || {}).phone || '').replace(/[^\d+]/g, '');
function chaseMark(i) { i.chases = (i.chases || 0) + 1; i.remindedAt = todayISO(); i.snooze = addDays(todayISO(), 7); persistInv(i); if (ui.view === 'home' || ui.view === 'invoices') render(); }
function showChase(id) {
  const old = document.getElementById('chaseSheet'); if (old) old.remove();
  const i = invoices.find(x => x.id === id); if (!i) return;
  const ph = invPhone(i), em = (i.customer || {}).email, late = daysLate(i);
  const d = document.createElement('div'); d.id = 'chaseSheet'; d.className = 'sheetbg';
  d.innerHTML = `<div class="sheet" role="dialog" aria-label="Chase invoice"><div class="grab"></div>
    <h2>${esc((i.customer || {}).name || 'Customer')} · ${money(invTotals(i).total)}</h2>
    <p class="muted" style="margin:0 0 10px">${esc(i.number)} · ${late} day${late === 1 ? '' : 's'} late${i.chases ? ' · chased ' + i.chases + '×' : ''}${i.remindedAt ? ', last ' + esc(ukDate(i.remindedAt)) : ''}</p>
    <div class="card small" style="white-space:pre-wrap;max-height:30vh;overflow:auto">${esc(invRemText(i))}</div>
    ${ph ? `<button type="button" class="btn gold block" data-act="chaseGo" data-how="sms" data-id="${i.id}">Text</button><div style="height:8px"></div><button type="button" class="btn block" data-act="chaseGo" data-how="wa" data-id="${i.id}">WhatsApp</button><div style="height:8px"></div>` : ''}
    ${em ? `<button type="button" class="btn ${ph ? '' : 'gold '}block" data-act="chaseGo" data-how="mail" data-id="${i.id}">Email, with the invoice attached</button><div style="height:8px"></div>` : ''}
    ${!ph && !em ? '<p class="small muted">No phone or email saved for this customer. Add one on their customer page.</p>' : ''}
    <button type="button" class="btn block" data-act="chaseGo" data-how="paid" data-id="${i.id}">Mark as paid</button>
    <button type="button" class="btn block ghost" data-act="chaseClose" style="margin-top:6px">Close</button></div>`;
  document.body.appendChild(d);
}
document.addEventListener('click', async e => {
  const bg = document.getElementById('chaseSheet');
  if (bg && e.target === bg) { bg.remove(); return; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'chaseOpen') { if (CLOUD.locked()) { lockedMsg(); return; } showChase(b.dataset.id); return; }
  if (a === 'chaseClose') { if (bg) bg.remove(); return; }
  if (a === 'chaseAll') { const n = overdueInvs().filter(i => !(i.snooze && i.snooze > todayISO())); if (n.length) showChase(n[0].id); else toast('Everything overdue has been chased this week'); return; }
  if (a !== 'chaseGo') return;
  const i = invoices.find(x => x.id === b.dataset.id); if (!i) return;
  const how = b.dataset.how, text = invRemText(i), ph = invPhone(i);
  if (how === 'paid') { i.paid = true; i.paidDate = todayISO(); persistInv(i); if (bg) bg.remove(); toast('Marked as paid'); if (ui.view === 'home' || ui.view === 'invoices') render(); return; }
  if (how === 'mail') { if (bg) bg.remove(); if (await invRemind(i)) { i.chases = (i.chases || 0) + 1; persistInv(i); if (ui.view === 'home' || ui.view === 'invoices') render(); } return; }
  const url = how === 'sms' ? 'sms:' + ph + '?&body=' + encodeURIComponent(text) : 'https://wa.me/' + ph.replace(/^\+/, '').replace(/^0/, '44') + '?text=' + encodeURIComponent(text);
  chaseMark(i); if (bg) bg.remove();
  const el = document.createElement('a'); el.href = url; if (how === 'wa') el.target = '_blank'; el.rel = 'noopener'; document.body.appendChild(el); el.click(); el.remove();
}, true);

/* an accepted quote becomes the invoice: same customer, address and priced lines, no retyping */
function invoiceFromQuote(q) {
  const inv = newInvoice(null), cu = customers.find(c => c.id === q.customerId), c = q.customer || {};
  inv.lines = QUO.rows(q).map(x => ({ d: x.d, q: String(x.q), p: String(x.p) }));
  if (!inv.lines.length) inv.lines = [{ d: q.general ? (q.title || 'Quoted work') : 'Boiler installation', q: '1', p: '' }];
  inv.customerId = q.customerId || ''; inv.customer = { name: (cu && cu.name) || c.name || '', phone: (cu && cu.phone) || c.phone || '', email: (cu && cu.email) || c.email || '', billing: c.billing || (cu && cu.billing) || '' };
  inv.jobAddress = q.jobAddress || ''; inv.workDate = todayISO(); inv.fromQuote = q.id; inv.notes = inv.notes || ('Quote ' + (q.ref || ''));
  persistInv(inv); q.qInv = inv.id; persistRec(q);
  return inv;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act="quoInvoice"]'); if (!b) return;
  if (CLOUD.locked()) { lockedMsg(); return; }
  const q = records.find(x => x.id === b.dataset.id); if (!q) return;
  e.stopImmediatePropagation();
  const inv = (q.qInv && invoices.find(x => x.id === q.qInv)) || invoiceFromQuote(q);
  ui.invTab = 'quotes'; invGo(inv, 'quotes'); window.scrollTo(0, 0);
}, true);

/* ---------- route for the day: today's jobs in appointment order, a Go link for each and one tap to start the whole run in your maps app ---------- */
const routeDay = off => { const d = off ? addDays(localISO(), off) : localISO(); return off ? bkOn(d).filter(b => b.status !== 'done') : nextBookings(); };
const routeStops = off => routeDay(off).filter(b => String(b.address || '').trim().length >= 4);
function routeUrl(list) {
  const a = list.map(b => String(b.address).replace(/\s*\n\s*/g, ', ').trim()), last = a[a.length - 1], via = a.slice(0, -1).slice(0, 9);
  return 'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=' + encodeURIComponent(last) + (via.length ? '&waypoints=' + encodeURIComponent(via.join('|')) : '');
}
/* "9am", "9:30am", "2pm" from the booked time */
function timeWords(t) { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); if (!m) return t || ''; const h = +m[1], mi = m[2], h12 = h % 12 || 12; return h12 + (mi === '00' ? '' : ':' + mi) + (h < 12 ? 'am' : 'pm'); }
function etaText(b, off) {
  const addr = String(b.address || '').replace(/\s*\n+\s*/g, ', ').trim();
  return `Hi ${greetName(b.name)}, just to let you know I will be with you around ${timeWords(b.time)} ${off ? 'tomorrow' : 'today'}${addr ? ' at ' + addr : ''}.\n${settings.businessName || ''}`.trim();
}
function showRoute(off) {
  off = off ? 1 : 0;
  const old = document.getElementById('routeSheet'); if (old) old.remove();
  const all = routeDay(off), list = routeStops(off);
  const d = document.createElement('div'); d.id = 'routeSheet'; d.className = 'sheetbg';
  const seg = `<div class="seg" style="margin-bottom:10px"><button type="button" class="${off ? '' : 'on'}" data-act="routeOpen" data-day="0">Today</button><button type="button" class="${off ? 'on' : ''}" data-act="routeOpen" data-day="1">Tomorrow</button></div>`;
  d.innerHTML = `<div class="sheet" role="dialog" aria-label="Route"><div class="grab"></div><h2>Route</h2>${seg}
    ${all.length ? `<p class="muted" style="margin:0 0 10px">${all.length} job${all.length === 1 ? '' : 's'}, in appointment order.${off ? ' Plan tonight and text each customer when you will arrive.' : ''}</p>` : `<p class="muted">Nothing booked ${off ? 'tomorrow' : 'for the rest of today'}.</p>`}
    ${!off && all.length && hasPostcode(all[0].address) ? '<div id="routeHere" class="small muted" style="margin:-4px 0 10px"></div>' : ''}
    ${all.map((b, k) => `<div class="line" style="flex-wrap:wrap"><b style="width:28px;height:28px;border-radius:50%;background:var(--gold);color:var(--btn-ink,#1a1405);display:flex;align-items:center;justify-content:center;flex:none">${k + 1}</b><span class="main"><b>${esc(b.time)} ${esc(b.name || 'No name')}</b><span>${esc(addrFirst(b.address || '') || 'No address')} · ${esc(bkLabel(b))}</span></span>${String(b.address || '').trim().length >= 4 ? `<a class="btn" href="${esc(mapsUrl(b.address))}" target="_blank" rel="noopener">Go</a>` : ''}${isMobileNo(b.phone) ? `<button type="button" class="btn" data-act="etaText" data-id="${b.id}" data-day="${off}">Text ETA${b.etaAt ? ' (sent)' : ''}</button>` : ''}</div>${k < all.length - 1 ? `<div class="small muted" data-leg="${k}" style="margin:2px 0 2px 40px"></div>` : ''}`).join('')}
    ${list.length >= 2 ? `<button type="button" class="btn block" data-act="routeTimes" data-day="${off}" style="margin-top:10px">Show drive times</button><div id="routeTot" class="small muted" style="margin-top:6px"></div>` : ''}
    ${list.length >= 2 ? `<a class="btn gold block" style="text-align:center;text-decoration:none;margin-top:10px" href="${esc(routeUrl(list))}" target="_blank" rel="noopener">Start route</a>` : ''}
    <button type="button" class="btn block" data-act="routeClose" style="margin-top:8px">Close</button></div>`;
  document.body.appendChild(d);
  if (list.length >= 2) routeTimes(off, null);
  if (!off) routeHere(all[0]);
}
/* the drive from where you are now (phone location) to the first job of the list, shown under the job count */
async function routeHere(b) {
  const el = document.getElementById('routeHere'); if (!el || !b || !hasPostcode(b.address) || !CLOUD.signedIn()) return;
  const me = await whereAmI(); if (!me) return;
  const toPc = pcOf(b.address), k = [me.lat.toFixed(3), me.lng.toFixed(3), toPc, Math.floor(Date.now() / 600000)].join('_');
  let hit = driveMem[k];
  if (!hit) { el.textContent = 'Working out the drive to the first job...'; try { const r = await CLOUD.post('route-times', { from: me, stops: [toPc + ', UK'] }); hit = r && r.legs && r.legs[0]; if (hit) driveMem[k] = hit; } catch (e) { hit = null; } }
  const e2 = document.getElementById('routeHere'); if (!e2) return;
  if (!hit) { e2.textContent = ''; return; }
  driveNow[b.id] = { mins: hit.mins, t: Date.now() };
  routeAgg.here = hit; paintTot();
  paintDrive(e2, b, hit, 'From here to the first job: about ' + mn(hit.mins) + ' (' + hit.miles + ' miles)');
}
document.addEventListener('click', e => {
  const bg = document.getElementById('routeSheet');
  if (bg && e.target === bg) { bg.remove(); return; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.act === 'routeOpen') showRoute(+b.dataset.day);
  else if (b.dataset.act === 'etaText') {
    const x = bookings.find(z => z.id === b.dataset.id); if (!x) return;
    const body = etaText(x, +b.dataset.day), ph = String(x.phone || '').replace(/[^\d+]/g, '');
    x.etaAt = Date.now(); x.updated = Date.now(); saveBookings(); if (typeof syncAll === 'function') syncAll();
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) { const el = document.createElement('a'); el.href = 'sms:' + ph + '?&body=' + encodeURIComponent(body); document.body.appendChild(el); el.click(); el.remove(); }
    else { try { navigator.clipboard.writeText(body); toast('Message copied. Paste it into a text to ' + x.phone); } catch (err) { toast('Texts open on a phone.'); } }
    b.textContent = 'Text ETA (sent)';
  }
  else if (b.dataset.act === 'routeClose' && bg) bg.remove();
  else if (b.dataset.act === 'routeTimes') routeTimes(+b.dataset.day, b);
}, true);

/* drive times between the stops (Google, through our server so the key stays secret). Asked for only when you tap, in the same order as the list. */
const routeCache = {};
const routeAgg = { ok: false, mins: 0, miles: 0, note: '', here: null };   // the legs between stops, plus the drive from where you are to the first job
function paintTot() {
  const t2 = document.getElementById('routeTot'); if (!t2 || !routeAgg.ok) return;
  const h = routeAgg.here, m = routeAgg.mins + (h ? h.mins : 0), mi = routeAgg.miles + (h ? h.miles : 0);
  t2.innerHTML = 'Driving about ' + mn(m) + ', ' + Math.round(mi * 10) / 10 + ' miles in total' + (h ? ' (including ' + mn(h.mins) + ' from here to the first job)' : '') + '. Estimates without live traffic.' + routeAgg.note;
}   // remembered for this visit, so reopening the sheet does not ask Google again
const pcOf = a => { const m = String(a || '').match(/\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i); return m ? (m[1] + ' ' + m[2]).toUpperCase() : ''; };
const hasPostcode = a => /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i.test(String(a || ''));
async function routeTimes(off, btn) {
  if (!btn) { routeAgg.ok = false; routeAgg.here = null; }
  const all = routeDay(off), usable = all.filter(b => hasPostcode(b.address)), lacking = all.filter(b => String(b.address || '').trim().length >= 4 && !hasPostcode(b.address));
  const note = lacking.length ? ' Tap to add a postcode for accurate times: ' + lacking.map(b => `<button type="button" class="btn" style="min-height:36px;padding:0 10px" data-act="routeFixPc" data-id="${b.id}">${esc(b.name || addrFirst(b.address))}</button>`).join(' ') : '';
  const tot = document.getElementById('routeTot');
  if (usable.length < 2) { if (tot && lacking.length) tot.innerHTML = note.trim(); return; }
  if (!CLOUD.signedIn()) { if (btn) toast('Sign in to see drive times'); return; }
  const stops = usable.map(b => pcOf(b.address) + ', UK'), ck = stops.join('|');
  const t0 = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Working it out...'; }
  if (tot && !btn) tot.textContent = 'Working out drive times...';
  try {
    const legs = routeCache[ck] || ((await CLOUD.post('route-times', { stops })) || {}).legs || [];
    if (!legs.length) throw new Error('No route found');
    routeCache[ck] = legs;
    let mins = 0, miles = 0;
    usable.forEach((b, i) => {
      const l = legs[i]; if (!l || i === usable.length - 1) return;
      const el = document.querySelector(`#routeSheet [data-leg="${all.indexOf(b)}"]`); if (!el) return;
      mins += l.mins; miles += l.miles;
      el.textContent = '\u2193 about ' + mn(l.mins) + ' \u00b7 ' + l.miles + ' miles' + (all[all.indexOf(b) + 1] === usable[i + 1] ? '' : ' to the next stop with a postcode');
    });
    routeAgg.mins = mins; routeAgg.miles = miles; routeAgg.note = note; routeAgg.ok = true; paintTot();
    const b2 = btn || document.querySelector('#routeSheet [data-act=routeTimes]'); if (b2) b2.remove();
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = t0; toast(e.status === 429 ? String(e.message) : 'Could not get drive times just now'); }
    else { const t2 = document.getElementById('routeTot'); if (t2) t2.textContent = e.status === 429 ? String(e.message) : 'Drive times are not available just now.'; }
  }
}

/* the drive to the next job: from your phone's location when allowed, otherwise from the job before it today or your business address.
   Your location is sent for that one lookup only and is not saved. Remembered for 10 minutes so reopening the app does not ask again. */
const hereMem = { t: 0, lat: 0, lng: 0 };
function whereAmI() {
  return new Promise(res => {
    if (Date.now() - hereMem.t < 600000 && hereMem.lat) return res({ lat: hereMem.lat, lng: hereMem.lng });
    if (!navigator.geolocation || settings.gpsDrive === 'off') return res(null);
    const go = () => navigator.geolocation.getCurrentPosition(p => { hereMem.t = Date.now(); hereMem.lat = p.coords.latitude; hereMem.lng = p.coords.longitude; res({ lat: hereMem.lat, lng: hereMem.lng }); }, () => res(null), { timeout: 8000, maximumAge: 300000 });
    if (navigator.permissions && navigator.permissions.query) navigator.permissions.query({ name: 'geolocation' }).then(q => (q.state === 'denied' ? res(null) : go()), go); else go();
  });
}
const driveMem = {};
const mn = n => n + (n === 1 ? ' min' : ' mins');
/* drive times measured from the phone's location, remembered per booking so the On my way text and the colours can use them */
const driveNow = {};
function arriveInfo(b, mins) {
  if (!b || b.date !== localISO() || !/^\d\d:\d\d$/.test(b.time || '')) return null;
  const [h, m] = b.time.split(':').map(Number), now = new Date(), appt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
  const lateBy = Math.round((now.getTime() + mins * 60000 - appt.getTime()) / 60000);
  return { lateBy, cls: lateBy <= 0 ? 'green' : lateBy <= 15 ? 'amber' : 'red', color: lateBy <= 0 ? '#2ea043' : lateBy <= 15 ? '#d9a200' : '#e5484d' };
}
function paintDrive(el, b, hit, text) {
  el.textContent = text; el.style.color = ''; el.style.fontWeight = '';
  const a = arriveInfo(b, hit.mins); if (!a) return;
  el.style.color = a.color; el.style.fontWeight = '600'; el.dataset.arrive = a.cls;
  el.textContent = text + (a.lateBy > 0 ? ' \u00b7 about ' + mn(a.lateBy) + ' late' : '');
  const so = el.id === 'nextDrive' ? document.getElementById('nextSetOff') : null;
  if (so) { const slack = -a.lateBy; so.textContent = a.lateBy > 0 ? '' : slack < 1 ? 'Set off now to arrive on time' : 'Set off in ' + mn(slack) + ' to arrive on time'; so.style.color = a.color; }
}
async function nextDrive() {
  const el = document.getElementById('nextDrive'); if (!el) return;
  const td = nextBookings(), nx = todayNext(td); if (!nx || !hasPostcode(nx.address)) return;
  const toPc = pcOf(nx.address), show = (hit, who) => { const e2 = document.getElementById('nextDrive'); if (!e2 || !hit) return; const txt = 'About ' + mn(hit.mins) + ' drive (' + hit.miles + ' miles) from ' + who; if (who === 'here') { driveNow[nx.id] = { mins: hit.mins, t: Date.now() }; paintDrive(e2, nx, hit, txt); } else e2.textContent = txt; };
  const me = CLOUD.signedIn() ? await whereAmI() : null;
  if (me) {
    const k = [me.lat.toFixed(3), me.lng.toFixed(3), toPc, Math.floor(Date.now() / 600000)].join('_');
    let hit = driveMem[k];
    if (!hit) { try { const r = await CLOUD.post('route-times', { from: me, stops: [toPc + ', UK'] }); hit = r && r.legs && r.legs[0]; if (hit) driveMem[k] = hit; } catch (e) { hit = null; } }
    if (hit) return show(hit, 'here');
  }
  const i = td.indexOf(nx), prev = td.slice(0, i).reverse().find(b => hasPostcode(b.address));
  const fromPc = prev ? pcOf(prev.address) : pcOf(settings.address); if (!fromPc) return;
  if (fromPc === toPc) { el.textContent = 'Same postcode as ' + (prev ? 'the last job' : 'your base'); return; }
  const key = 'omb_drv_' + localISO() + '_' + fromPc + '_' + toPc, who = prev ? 'the last job' : 'your base';
  let hit = LS.get(key, null);
  if (!hit) {
    if (!CLOUD.signedIn()) return;
    try { const r = await CLOUD.post('route-times', { stops: [fromPc + ', UK', toPc + ', UK'] }); hit = r && r.legs && r.legs[0]; if (hit) LS.set(key, hit); } catch (e) { return; }
  }
  show(hit, who);
}

/* tap a name in the "add a postcode" note: opens that job with the cursor in its postcode box */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act="routeFixPc"]'); if (!b) return;
  const x = bookings.find(z => z.id === b.dataset.id); if (!x) return;
  e.stopImmediatePropagation();
  const rs = document.getElementById('routeSheet'); if (rs) rs.remove();
  ui.book = { ...x, types: [...(x.types || [])], addrNew: true }; ui.bookFrom = 'home'; ui.view = 'book'; render(); window.scrollTo(0, 0);   // addrNew shows the address box even when it came from a saved property
  setTimeout(() => { const a = document.querySelector('#view input[data-bk="addrpc"]') || document.querySelector('#view textarea[data-bk="address"]'); if (a) { a.scrollIntoView({ block: 'center' }); a.focus(); try { a.setSelectionRange(a.value.length, a.value.length); } catch (e) { } } }, 60);
}, true);
