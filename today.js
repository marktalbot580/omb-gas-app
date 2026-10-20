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
    <button type="button" class="btn block" data-act="chaseGo" data-how="paid" data-id="${i.id}">Paid today</button><div style="height:8px"></div>
    <button type="button" class="btn block" data-act="chaseGo" data-how="paidEarlier" data-id="${i.id}">Paid earlier – choose the date</button>
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
  if (how === 'paidEarlier') { i.paid = true; i.paidDate = todayISO(); persistInv(i); if (bg) bg.remove(); if (typeof invGo === 'function') invGo(i, 'invoices'); toast('Marked as paid – set the date paid under Dates'); return; }
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
  if (settings.mapApp === 'apple' || settings.mapApp === 'waze') return mapsUrl(list[0].address);   // these apps take one stop at a time
  const a = list.map(b => String(b.address).replace(/\s*\n\s*/g, ', ').trim()), last = a[a.length - 1], via = a.slice(0, -1).slice(0, 9);
  return 'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=' + encodeURIComponent(last) + (via.length ? '&waypoints=' + encodeURIComponent(via.join('|')) : '');
}
/* "9am", "9:30am", "2pm" from the booked time */
function timeWords(t) { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); if (!m) return t || ''; const h = +m[1], mi = m[2], h12 = h % 12 || 12; return h12 + (mi === '00' ? '' : ':' + mi) + (h < 12 ? 'am' : 'pm'); }
function etaText(b, off) {
  const addr = String(b.address || '').replace(/\s*\n+\s*/g, ', ').trim();
  return `Hi ${greetName(b.name)}, just to let you know I will be with you around ${timeWords(b.time)} ${off ? 'tomorrow' : 'today'}${addr ? ' at ' + addr : ''}.\n${settings.businessName || ''}`.trim();
}
let routeDayDate = '';
function showRoute(off) {
  off = off ? 1 : 0; routeDayDate = off ? addDays(localISO(), 1) : localISO();
  const old = document.getElementById('routeSheet'); if (old) old.remove();
  const all = routeDay(off), list = routeStops(off);
  const d = document.createElement('div'); d.id = 'routeSheet'; d.className = 'sheetbg';
  const seg = `<div class="seg" style="margin-bottom:10px"><button type="button" class="${off ? '' : 'on'}" data-act="routeOpen" data-day="0">Today</button><button type="button" class="${off ? 'on' : ''}" data-act="routeOpen" data-day="1">Tomorrow</button></div>`;
  d.innerHTML = `<div class="sheet" role="dialog" aria-label="Route"><div class="grab"></div><h2>Route</h2>${seg}
    ${all.length ? `<p class="muted" style="margin:0 0 10px">${all.length} job${all.length === 1 ? '' : 's'}, in appointment order.${off ? ' Plan tonight and text each customer when you will arrive.' : ''}</p>` : `<p class="muted">Nothing booked ${off ? 'tomorrow' : 'for the rest of today'}.</p>`}
    ${all.length && hasPostcode(all[0].address) ? '<div id="routeHere" class="small muted" style="margin:-4px 0 10px"></div>' : ''}
    ${all.map((b, k) => `<div class="line" style="flex-wrap:wrap"><b style="width:28px;height:28px;border-radius:50%;background:var(--gold);color:var(--btn-ink,#1a1405);display:flex;align-items:center;justify-content:center;flex:none">${k + 1}</b><span class="main" role="button" tabindex="0" data-act="routeJob" data-id="${b.id}" style="cursor:pointer"><b>${esc(b.time)} ${esc(b.name || 'No name')}</b><span>${esc(addrFirst(b.address || '') || 'No address')} · ${esc(bkLabel(b))}</span></span>${String(b.address || '').trim().length >= 4 ? `<a class="btn" href="${esc(mapsUrl(b.address))}" target="_blank" rel="noopener">Go</a>` : ''}${isMobileNo(b.phone) ? `<button type="button" class="btn" data-act="etaText" data-id="${b.id}" data-day="${off}">Text ETA${b.etaAt ? ' (sent)' : ''}</button>` : ''}</div>${k < all.length - 1 ? `<div class="small muted" data-leg="${k}" style="margin:2px 0 2px 40px"></div>` : ''}`).join('')}
    ${list.length >= 2 && all.some(b => hasPostcode(b.address)) ? `<button type="button" class="btn gold block" data-act="planDay" data-day="${off}" style="margin-top:10px">Plan my day</button><p class="small muted" style="margin:6px 0 0">Puts the jobs nearest to your start first and the furthest last, gives each its time slot and adds the drive between jobs. You check it before anything changes.</p>` : ''}
    ${all.filter(b => isMobileNo(b.phone) && !b.etaAt).length > 1 ? '<button type="button" class="btn block" data-act="etaNext" style="margin-top:10px">Text the next customer (' + all.filter(b => isMobileNo(b.phone) && !b.etaAt).length + ' left)</button>' : ''}
    ${list.length >= 2 ? `<button type="button" class="btn block" data-act="routeTimes" data-day="${off}" style="margin-top:10px">Show drive times</button><div id="routeTot" class="small muted" style="margin-top:6px"></div>` : ''}
    ${list.length >= 2 ? `<a class="btn gold block" style="text-align:center;text-decoration:none;margin-top:10px" href="${esc(routeUrl(list))}" target="_blank" rel="noopener">${settings.mapApp === 'apple' || settings.mapApp === 'waze' ? 'Navigate to the first job' : 'Start route'}</a>` : ''}
    <button type="button" class="btn block" data-act="routeClose" style="margin-top:8px">Close</button></div>`;
  document.body.appendChild(d);
  if (list.length >= 2) routeTimes(off, null);
  routeHere(all[0], off);
}
/* the drive to the first job: from your phone's location today, or from the postcode of your address in Settings (your base or home) when planning tomorrow or when the phone location is not available */
async function routeHere(b, off) {
  const el = document.getElementById('routeHere'); if (!el || !b || !hasPostcode(b.address) || !CLOUD.signedIn()) return;
  const toPc = pcOf(b.address), me = off ? null : await whereAmI();
  let hit, label;
  if (me) {
    label = 'From here to the first job';
    const k = [me.lat.toFixed(3), me.lng.toFixed(3), toPc, Math.floor(Date.now() / 600000)].join('_');
    hit = driveMem[k];
    if (!hit) { el.textContent = 'Working out the drive to the first job...'; try { const r = await CLOUD.post('route-times', { from: me, stops: [toPc + ', UK'] }); hit = r && r.legs && r.legs[0]; if (hit) driveMem[k] = hit; } catch (e) { hit = null; } }
  } else {
    const basePc = routeBasePc(); label = 'From your base (' + basePc + ') to the first job';
    if (!basePc) { el.textContent = 'Add a start postcode in Settings, under Calendar, to see the drive to the first job.'; return; }
    if (basePc === toPc) { el.textContent = 'The first job is at the same postcode as your base.'; return; }
    const k = 'omb_drv_base_' + basePc + '_' + toPc;
    hit = routeCache[k] || pairGet(basePc, toPc);
    if (!hit) { el.textContent = 'Working out the drive to the first job...'; try { const r = await CLOUD.post('route-times', { stops: [basePc + ', UK', toPc + ', UK'] }); hit = r && r.legs && r.legs[0]; if (hit) { routeCache[k] = hit; pairSet(basePc, toPc, hit); } } catch (e) { hit = null; } }
  }
  const e2 = document.getElementById('routeHere'); if (!e2) return;
  if (!hit) { e2.textContent = ''; return; }
  routeAgg.here = hit; paintTot();
  const txt = label + ': about ' + mn(hit.mins) + ' (' + hit.miles + ' miles)';
  if (me) { driveNow[b.id] = { mins: hit.mins, t: Date.now() }; paintDrive(e2, b, hit, txt); return; }
  e2.textContent = txt;
  if (off && /^\d\d:\d\d$/.test(b.time || '')) {   // tomorrow: when to leave to arrive on time
    const [h, m] = b.time.split(':').map(Number), at = h * 60 + m - hit.mins, hh = Math.floor((((at % 1440) + 1440) % 1440) / 60), mm = ((at % 60) + 60) % 60;
    e2.textContent = txt + '. Leave by ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + ' to be there for ' + b.time + '.';
  }
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
  else if (b.dataset.act === 'routeJob') {
    const x = bookings.find(z => z.id === b.dataset.id); if (!x) return;
    e.stopImmediatePropagation(); if (bg) bg.remove();
    ui.book = { ...x, types: [...(x.types || [])] }; ui.bookFrom = 'home'; ui.view = 'book'; render(); window.scrollTo(0, 0);
  }
  else if (b.dataset.act === 'etaNext') {
    const nx = [...document.querySelectorAll('#routeSheet [data-act=etaText]')].find(z => !/sent/.test(z.textContent)); if (nx) nx.click();
    const left = bookings.filter(z => z.date === (routeDayDate || localISO()) && isMobileNo(z.phone) && !z.etaAt && z.status !== 'done').length;
    b.textContent = left > 1 ? 'Text the next customer (' + (left - 1) + ' left)' : 'Text the next customer'; if (left <= 1) b.hidden = true;
  }
  else if (b.dataset.act === 'planDay') planDay(+b.dataset.day);
  else if (b.dataset.act === 'routeClose' && bg) bg.remove();
  else if (b.dataset.act === 'routeTimes') routeTimes(+b.dataset.day, b);
}, true);

/* drive times between the stops (Google, through our server so the key stays secret). Asked for only when you tap, in the same order as the list. */
const routeCache = {};
/* drive times between two postcodes are remembered on the phone for 45 days (estimates without live traffic hardly change), so a regular pair of customers never costs a second lookup */
const pairMem = (() => { try { return LS.get('omb_pairs', {}) || {}; } catch (e) { return {}; } })();
const pairGet = (a, b2) => { const h = pairMem[a + '>' + b2]; return h && Date.now() - h.t < 45 * 864e5 ? { mins: h.mins, miles: h.miles } : null; };
function pairSet(a, b2, hit) {
  if (!hit || a === b2) return; pairMem[a + '>' + b2] = { mins: hit.mins, miles: hit.miles, t: Date.now() };
  const ks = Object.keys(pairMem); if (ks.length > 400) ks.sort((x, y) => pairMem[x].t - pairMem[y].t).slice(0, ks.length - 300).forEach(k => delete pairMem[k]);
  try { LS.set('omb_pairs', pairMem); } catch (e) { }
}
const routeAgg = { ok: false, mins: 0, miles: 0, note: '', here: null };   // the legs between stops, plus the drive from where you are to the first job
function paintTot() {
  const t2 = document.getElementById('routeTot'); if (!t2 || !routeAgg.ok) return;
  const h = routeAgg.here, m = routeAgg.mins + (h ? h.mins : 0), mi = routeAgg.miles + (h ? h.miles : 0);
  t2.innerHTML = 'Driving about ' + mn(m) + ', ' + Math.round(mi * 10) / 10 + ' miles in total' + (h ? ' (including ' + mn(h.mins) + ' from here to the first job)' : '') + '. Estimates without live traffic.' + routeAgg.note;
}   // remembered for this visit, so reopening the sheet does not ask Google again
const pcOf = a => { const m = String(a || '').match(/\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i); return m ? (m[1] + ' ' + m[2]).toUpperCase() : ''; };
/* where the day starts: the route start postcode in Settings, otherwise the postcode of the business address */
const routeBasePc = () => pcOf(settings.routeStart) || pcOf(settings.address);
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
    const pcs = usable.map(b => pcOf(b.address)), cached = pcs.slice(0, -1).map((p, i) => (p === pcs[i + 1] ? { mins: 0, miles: 0 } : pairGet(p, pcs[i + 1])));
    const legs = routeCache[ck] || (cached.every(Boolean) ? cached : ((await CLOUD.post('route-times', { stops })) || {}).legs || []);
    if (!legs.length) throw new Error('No route found');
    routeCache[ck] = legs; legs.forEach((l, i) => { if (pcs[i + 1]) pairSet(pcs[i], pcs[i + 1], l); });
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
/* why a drive time could not be shown (so it is no longer a silent blank) */
function driveWhy(e) {
  const m = String((e && e.message) || ''), st = e && e.status;
  if (st === 402 || /subscription/i.test(m)) return 'hide';   // trial/free-pass check on the server: show nothing rather than a confusing message
  if (st === 429 || /limit|busy/i.test(m)) return m || 'daily limit reached';
  if (st === 502 || /google/i.test(m)) return 'Google could not work out that route (check the postcode)';
  if (st === 401 || /not signed in/i.test(m)) return 'you need to sign in again';
  if (!navigator.onLine || /failed to fetch|network/i.test(m)) return 'no signal';
  return m || 'unknown problem';
}
async function nextDrive() {
  const el = document.getElementById('nextDrive'); if (!el) return;
  const td = nextBookings(), nx = todayNext(td); if (!nx || !hasPostcode(nx.address)) return;
  const toPc = pcOf(nx.address), show = (hit, who) => { const e2 = document.getElementById('nextDrive'); if (!e2 || !hit) return; const txt = 'About ' + mn(hit.mins) + ' drive (' + hit.miles + ' miles) from ' + who; if (who === 'here') { driveNow[nx.id] = { mins: hit.mins, t: Date.now() }; paintDrive(e2, nx, hit, txt); } else e2.textContent = txt; };
  let whyNot = ''; const me = CLOUD.signedIn() ? await whereAmI() : null;
  if (me) {
    const k = [me.lat.toFixed(3), me.lng.toFixed(3), toPc, Math.floor(Date.now() / 600000)].join('_');
    let hit = driveMem[k];
    if (!hit) { try { const r = await CLOUD.post('route-times', { from: me, stops: [toPc + ', UK'] }); hit = r && r.legs && r.legs[0]; if (hit) driveMem[k] = hit; } catch (e) { hit = null; whyNot = driveWhy(e); } }
    if (hit) return show(hit, 'here');
  }
  const i = td.indexOf(nx), prev = td.slice(0, i).reverse().find(b => hasPostcode(b.address));
  const fromPc = prev ? pcOf(prev.address) : routeBasePc(); if (!fromPc) { const e4 = document.getElementById('nextDrive'); if (e4) e4.textContent = whyNot === 'hide' ? '' : whyNot ? 'Drive time not available: ' + whyNot + '.' : 'Drive time not available: allow this app to use your location, or set a start postcode in Settings \u2192 Calendar.'; return; }
  if (fromPc === toPc) { el.textContent = 'Same postcode as ' + (prev ? 'the last job' : 'your base'); return; }
  const key = 'omb_drv_' + localISO() + '_' + fromPc + '_' + toPc, who = prev ? 'the last job' : 'your base';
  let hit = LS.get(key, null) || pairGet(fromPc, toPc);
  if (!hit) {
    if (!CLOUD.signedIn()) return;
    try { const r = await CLOUD.post('route-times', { stops: [fromPc + ', UK', toPc + ', UK'] }); hit = r && r.legs && r.legs[0]; if (hit) { LS.set(key, hit); pairSet(fromPc, toPc, hit); } } catch (e) { whyNot = whyNot || driveWhy(e); }
  }
  if (!hit) { const e3 = document.getElementById('nextDrive'); if (e3) { e3.textContent = whyNot === 'hide' ? '' : 'Drive time not available: ' + (whyNot || 'no route came back for this address') + '.'; e3.style.color = ''; } return; }
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

/* Settings: copy the postcode from the business address into the route start box */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act="routeStartCopy"]'); if (!b) return;
  e.stopImmediatePropagation();
  const pc = pcOf(settings.address);
  if (!pc) { toast('Add a postcode to your business address first'); return; }
  settings.routeStart = pc; saveSettings(); const y = window.scrollY; render(); window.scrollTo(0, y); toast('Start postcode set to ' + pc);
}, true);

/* running late: move today's appointment to a new time and (optionally) text the customer */
function bkLate(b) {
  if (!b || b.date !== localISO() || b.status === 'done' || !/^\d\d:\d\d$/.test(b.time || '')) return false;
  const [h, m] = b.time.split(':').map(Number), n = new Date();
  if (n.getHours() * 60 + n.getMinutes() > h * 60 + m) return true;
  const d = driveNow[b.id], a = d && Date.now() - d.t < 15 * 60000 ? arriveInfo(b, d.mins) : null;
  return !!(a && a.lateBy > 0);
}
const reschedPhone = b => String(b.phone || '').replace(/[^\d+]/g, '');
function reschedText(b, d, t) {
  const first = typeof greetName === 'function' ? greetName(b.name) : '';
  return 'Hi ' + first + ', sorry, I am running behind and need to move your appointment to ' + dayShort(d) + ' at ' + t + '. Is that OK? Let me know if another time suits you better.' + (settings.businessName ? '\n' + settings.businessName : '');
}
document.addEventListener('click', e => {
  const bg = document.getElementById('reschedSheet');
  if (bg && e.target === bg) { bg.remove(); return; }
  const b = e.target.closest('[data-act^="resched"], [data-act="bookResched"]'); if (!b) return;
  const act = b.dataset.act; e.stopImmediatePropagation();
  if (act === 'bookResched') {
    const B = ui.book; if (!B) return;
    const n = new Date(Date.now() + 30 * 60000), r = Math.ceil((n.getHours() * 60 + n.getMinutes()) / 15) * 15, hh = String(Math.floor(r / 60) % 24).padStart(2, '0'), mm = String(r % 60).padStart(2, '0');
    const d = document.createElement('div'); d.id = 'reschedSheet'; d.className = 'sheetbg';
    d.innerHTML = `<div class="sheet" role="dialog" aria-label="Reschedule"><div class="grab"></div><h2>Reschedule</h2>
      <p class="muted" style="margin:0 0 10px">${esc(B.name || 'This customer')} is booked for ${esc(B.time)} today. Pick a new day and time.</p>
      <label class="f"><span>New date</span><input id="rsDate" type="date" value="${localISO()}"></label>
      <label class="f"><span>New start time</span><input id="rsTime" type="time" value="${hh}:${mm}"></label>
      ${isMobileNo(B.phone) ? '<button type="button" class="btn gold block" data-act="reschedText">Move it and text the customer</button>' : ''}
      <button type="button" class="btn ${isMobileNo(B.phone) ? '' : 'gold '}block" data-act="reschedSave" style="margin-top:8px">Move it, no text</button>
      <button type="button" class="btn block" data-act="reschedClose" style="margin-top:8px">Cancel</button></div>`;
    document.body.appendChild(d); return;
  }
  if (act === 'reschedClose') { if (bg) bg.remove(); return; }
  const B = ui.book, d = (document.getElementById('rsDate') || {}).value, t = (document.getElementById('rsTime') || {}).value;
  if (!B || !d || !t) { toast('Pick a date and time'); return; }
  const x = bookings.find(z => z.id === B.id);
  if (x) { x.date = d; x.time = t; x.etaAt = 0; x.remindedAt = 0; x.updated = Date.now(); saveBookings(); if (typeof syncAll === 'function') syncAll(); }
  B.date = d; B.time = t;
  if (B.fromQuote) { const q = records.find(z => z.id === B.fromQuote); if (q) { q.qBooked = d; persistRec(q); } }
  if (act === 'reschedText' && isMobileNo(B.phone)) {
    const body = reschedText(B, d, t);
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) { const el = document.createElement('a'); el.href = 'sms:' + reschedPhone(B) + '?&body=' + encodeURIComponent(body); document.body.appendChild(el); el.click(); el.remove(); }
    else { try { navigator.clipboard.writeText(body); toast('Message copied. Paste it into a text to ' + B.phone); } catch (err) { toast('Texts open on a phone.'); } }
  } else toast('Moved to ' + dayShort(d) + ' at ' + t);
  if (bg) bg.remove(); render();
}, true);

/* Plan my day: nearest job to your start first, furthest last; each gets its time slot with the drive between jobs added.
   Nothing changes until you tap Apply. Uses one drive lookup per job plus one per leg. */
const ceil5 = m => Math.ceil(m / 5) * 5, hhmm = m => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
async function planLeg(a, b2) {
  if (a === b2) return { mins: 0, miles: 0 };
  const c = pairGet(a, b2); if (c) return c;
  const r = await CLOUD.post('route-times', { stops: [a + ', UK', b2 + ', UK'] }), hit = r && r.legs && r.legs[0];
  if (!hit) throw new Error('No route found'); pairSet(a, b2, hit); return hit;
}
/* one lookup for a whole chain of stops when several legs are missing, instead of one lookup per leg */
async function planChain(pcs) {
  const chain = pcs.filter((p, i) => i === 0 || p !== pcs[i - 1]);
  if (chain.length < 3 || chain.length > 10) return;
  if (chain.slice(0, -1).every((p, i) => pairGet(p, chain[i + 1]))) return;
  try { const r = await CLOUD.post('route-times', { stops: chain.map(p => p + ', UK') }); ((r && r.legs) || []).forEach((l, i) => pairSet(chain[i], chain[i + 1], l)); } catch (e) { }
}
async function planDay(off) {
  off = off ? 1 : 0;
  const all = routeDay(off), withPc = all.filter(b => hasPostcode(b.address)), base = routeBasePc();
  if (!CLOUD.signedIn()) { toast('Sign in to plan the day'); return; }
  if (!base) { toast('Add a start postcode in Settings, under Calendar, first'); return; }
  const ticked = withPc.filter(b => b.auto), allFlex = !ticked.length, jobs = allFlex ? withPc : ticked;
  const fixed = all.filter(b => !jobs.includes(b)), lacking = all.filter(b => !hasPostcode(b.address) && !fixed.includes(b));
  if (jobs.length < 1 || (allFlex && jobs.length < 2)) { toast('Add a postcode to at least two jobs first'); return; }
  const rs = document.getElementById('routeSheet'); const btn = rs && rs.querySelector('[data-act=planDay]'); const t0 = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Working out the best order...'; }
  try {
    const from = await Promise.all(jobs.map(b => planLeg(base, pcOf(b.address))));
    const order = jobs.map((b, i) => ({ b, d: from[i].mins })).sort((x, y) => (settings.planOrder === 'far' ? y.d - x.d : x.d - y.d) || toMin(x.b.time) - toMin(y.b.time)).map(x => x.b);
    await planChain(order.map(b => pcOf(b.address)));
    const dayStart = toMin(settings.dayStart || '09:00'), now = new Date(), nowM = now.getHours() * 60 + now.getMinutes();
    let cur = off ? dayStart : Math.max(dayStart, ceil5(nowM)), prevPc = null; const rows = [];
    for (let i = 0; i < order.length; i++) {
      const job = order[i], len = +job.mins || 60, pc = pcOf(job.address); let leg = null, start = cur;
      for (let guard = 0; guard <= fixed.length; guard++) {
        leg = prevPc ? await planLeg(prevPc, pc) : null; start = prevPc ? ceil5(cur + leg.mins) : cur;
        const clash = fixed.find(F => toMin(F.time) < start + len && start < toMin(F.time) + (+F.mins || 60));
        if (!clash) break;
        cur = toMin(clash.time) + (+clash.mins || 60); if (hasPostcode(clash.address)) prevPc = pcOf(clash.address);
      }
      rows.push({ b: job, start, end: start + len, drive: leg ? leg.mins : from[jobs.indexOf(job)].mins, first: !leg }); cur = start + len; prevPc = pc;
    }
    const shown = rows.map(r => ({ ...r })).concat(fixed.map(F => ({ b: F, start: toMin(F.time), end: toMin(F.time) + (+F.mins || 60), fixed: true }))).sort((x, y) => x.start - y.start);
    window.__plan = { off, rows };
    const d = document.createElement('div'); d.id = 'planSheet'; d.className = 'sheetbg';
    d.innerHTML = `<div class="sheet" role="dialog" aria-label="Plan my day"><div class="grab"></div><h2>Plan my day</h2>
      <p class="muted" style="margin:0 0 10px">${allFlex ? 'No job is ticked Auto schedule, so every job here can move. ' : ''}${settings.planOrder === 'far' ? 'Furthest from' : 'Nearest to'} your start (${esc(base)}) first, ${settings.planOrder === 'far' ? 'closest' : 'furthest'} last, starting at ${esc(hhmm(rows[0].start))}. Each job keeps its usual length, with the drive added before the next.${fixed.length ? ' Jobs not ticked Auto schedule keep their time and the others are fitted around them.' : ''}</p>
      ${shown.map((r, i) => `<div class="line" style="flex-wrap:wrap"><b style="width:28px;height:28px;border-radius:50%;background:${r.fixed ? 'var(--line,#ccc)' : 'var(--gold)'};color:var(--btn-ink,#1a1405);display:flex;align-items:center;justify-content:center;flex:none">${i + 1}</b><span class="main"><b>${esc(hhmm(r.start))} to ${esc(hhmm(r.end))} ${esc(r.b.name || 'No name')}</b><span>${esc(addrFirst(r.b.address || ''))}${r.fixed ? ' \u00b7 fixed time' : r.b.time !== hhmm(r.start) ? ' \u00b7 was ' + esc(r.b.time) : ''}</span></span></div>${!r.fixed && !r.first && r.drive ? `<div class="small muted" style="margin:2px 0 2px 40px">\u2193 ${esc(mn(r.drive))} drive before this job</div>` : ''}`).join('')}
      ${lacking.length ? `<p class="small muted">Left as they are, with no postcode: ${lacking.map(b => esc(b.name || addrFirst(b.address))).join(', ')}.</p>` : ''}
      <p class="small muted">Drive times are estimates without live traffic. This changes the appointment times in your calendar. Nothing is texted until you tap send.</p>
      <button type="button" class="btn gold block" data-act="planApply">Put these times in my calendar</button>
      <button type="button" class="btn block" data-act="planClose" style="margin-top:8px">Cancel</button></div>`;
    document.body.appendChild(d);
  } catch (e) { toast(e.status === 429 ? String(e.message) : 'Could not plan the day just now'); }
  if (btn) { btn.disabled = false; btn.textContent = t0; }
}
document.addEventListener('click', e => {
  const bg = document.getElementById('planSheet');
  if (bg && e.target === bg) { bg.remove(); return; }
  const b = e.target.closest('[data-act="planApply"], [data-act="planClose"]'); if (!b) return;
  e.stopImmediatePropagation();
  if (b.dataset.act === 'planApply' && window.__plan) {
    const p = window.__plan; let n = 0;
    p.rows.forEach(r => { const x = bookings.find(z => z.id === r.b.id); if (x) { if (x.time !== hhmm(r.start)) n++; x.time = hhmm(r.start); x.etaAt = 0; x.remindedAt = 0; x.updated = Date.now(); } });
    saveBookings(); if (typeof syncAll === 'function') syncAll(); window.__plan = null;
    if (bg) bg.remove(); toast(n ? n + ' appointment' + (n === 1 ? '' : 's') + ' moved' : 'Times already match'); showRoute(p.off); return;
  }
  if (bg) bg.remove();
}, true);
