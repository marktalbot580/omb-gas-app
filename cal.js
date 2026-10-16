/* OMB Gas Service - calendar: appointments (bookings) kept on the phone and synced with the account.
   Loaded before app.js; uses its globals (ui, settings, customers, bookings, esc, toast, saveFile ...) when called. */
'use strict';

/* ---------- calendar: appointments kept on this phone ---------- */
const BK_TYPES = [['gas', 'Gas safety check'], ['service', 'Boiler service'], ['legionella', 'Legionella risk assessment'], ['aircon', 'Air conditioning'], ['oil', 'Oil boiler service'], ['oiltank', 'Oil tank check'], ['oilcomp', 'Oil installation'], ['oillord', 'Landlord oil check'], ['quote', 'Boiler quote'], ['other', 'Other job']];
const calOn = () => settings.calOn !== 'off';
/* a UK mobile number (07… or +44 7…): only these get the on my way text */
const isMobileNo = p => /^(?:\+?44|0)7\d{9}$/.test(String(p || '').replace(/\(0\)/, '').replace(/[^\d+]/g, ''));
/* the "on my way" text: {name} {time} {address} {business} are filled in (wording editable in Settings → Calendar) */
const OTW_DEFAULT = 'Hi {name}, just to let you know I am on my way for your {time} appointment at {address}. {eta}\n{business}';
/* travel time sentence for the on my way text, from the phone-location drive time remembered for this booking */
function otwEta(b) {
  if (settings.calOtwEta === 'off' || settings.gpsDrive === 'off' || typeof driveNow === 'undefined') return '';
  const d = driveNow[b.id]; if (!d || Date.now() - d.t > 15 * 60000) return '';
  const mins = Math.max(1, d.mins - Math.round((Date.now() - d.t) / 60000)), a = arriveInfo(b, mins);
  const w = mins < 60 ? mins + ' minute' + (mins === 1 ? '' : 's') : Math.floor(mins / 60) + ' hour' + (mins >= 120 ? 's' : '') + (mins % 60 ? ' ' + (mins % 60) + ' minutes' : '');
  return a && a.lateBy > 0 ? 'I will be with you in about ' + w + ', sorry I am running behind schedule.' : 'I will be with you in about ' + w + '.';
}
function otwText(b) {
  const first = greetName(b.name), map = { name: first, time: b.time || '', address: String(b.address || '').replace(/\s*\n+\s*/g, ', '), business: settings.businessName || '' };
  const eta = otwEta(b), tpl = String(settings.calOtw || OTW_DEFAULT);
  if (tpl.includes('{eta}')) map.eta = eta || (settings.calOtw ? '' : 'See you shortly.');
  else { map.eta = ''; if (eta) { const i = tpl.indexOf('\n'); return otwText0(b, i < 0 ? tpl + ' ' + eta : tpl.slice(0, i) + ' ' + eta + tpl.slice(i), map); } }
  return otwText0(b, tpl, map);
}
function otwText0(b, tpl, map) {
  return String(tpl).replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m)).replace(/\s+at\s*([.,])/g, '$1').replace(/ {2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();   // no address: drop the dangling "at"
}
/* day-before reminder: tap-to-send text / email for tomorrow's appointments (nothing is sent automatically) */
const CALREM_DEFAULT = 'Hi {name}, just a reminder that I am booked in to see you tomorrow at {time} for your {job}.\n{business}';
function remindText(b) {
  const first = greetName(b.name), map = { name: first, time: b.time || '', job: bkLabel(b).toLowerCase(), address: String(b.address || '').replace(/\s*\n+\s*/g, ', '), business: settings.businessName || '' };
  return String(settings.calRemText || CALREM_DEFAULT).replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m)).replace(/\n{3,}/g, '\n\n').trim();
}
const remPending = () => bkOn(addDays(localISO(), 1)).filter(b => b.status !== 'done' && !b.remindedAt && isMobileNo(b.phone));
function tomorrowHtml() {
  if (settings.calRemOn === 'off') return '';
  const list = bkOn(addDays(localISO(), 1)).filter(b => b.status !== 'done'); if (!list.length) return '';
  const left = remPending().length;
  return `<h2>Tomorrow: remind customers</h2>` + (left ? `<button class="btn gold block" data-act="calRemAll" style="margin-bottom:10px">Text next customer (${left} left)</button>` : '') + list.map(b => {
    const body = encodeURIComponent(remindText(b)), sms = isMobileNo(b.phone), ph = String(b.phone || '').replace(/[^\d+]/g, '');
    const ways = [sms ? `<a class="btn" data-act="calRemSent" data-id="${b.id}" href="sms:${ph}?&body=${body}">Text</a>` : '', b.email ? `<a class="btn" data-act="calRemSent" data-id="${b.id}" href="mailto:${encodeURIComponent(b.email)}?subject=${encodeURIComponent((settings.businessName || 'Appointment') + ': your appointment tomorrow')}&body=${body}">Email</a>` : ''].join('');
    return `<div class="card remc"><div class="row sp"><span class="t">${esc(b.time)} · ${esc(b.name || 'No name')}</span>${b.remindedAt ? '<span class="badge complete">reminded</span>' : ''}</div><div class="s">${esc(bkLabel(b))}</div>
      ${ways ? `<div class="remways">${ways}</div>` : '<p class="small muted" style="margin:8px 0 0">No mobile number or email saved.</p>'}</div>`;
  }).join('');
}
const calJobs = () => (Array.isArray(settings.calJobs) ? settings.calJobs : ['Bathroom install', 'Radiator install']);
const bkLabel = b => (b.types || []).map(t => t === 'other' ? (String(b.other || '').trim() || 'Other job') : (BK_TYPES.find(x => x[0] === t) || [0, t])[1]).join(' + ') || 'Appointment';
const localISO = d => { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const toMin = t => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? (+m[1]) * 60 + (+m[2]) : 0; };
const fromMin = n => String(Math.floor(n / 60) % 24).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
const bkEnd = b => fromMin(toMin(b.time) + (+b.mins || 60));
const dayLong = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const dayShort = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const monthLong = m => new Date(m + '-01T12:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const mondayOf = iso => addDays(iso, -((new Date(iso + 'T12:00:00').getDay() + 6) % 7));
const calState = () => (ui.cal = ui.cal || { m: localISO().slice(0, 7), d: localISO() });
const bkOn = date => bookings.filter(b => b.date === date).sort((a, b) => toMin(a.time) - toMin(b.time) || String(a.id).localeCompare(String(b.id)));   // by start time, as a number so 9:00 comes before 10:00
/* another appointment that overlaps this one (two devices can book the same slot while offline or at the same moment) */
const bkClash = b => b.status !== 'done' ? bookings.find(x => x.id !== b.id && x.status !== 'done' && x.date === b.date && toMin(x.time) < toMin(b.time) + (+b.mins || 60) && toMin(b.time) < toMin(x.time) + (+x.mins || 60)) : null;
function bkItem(b, withDate) {
  const cl = bkClash(b);
  return `<button type="button" class="item" data-act="bookOpen" data-id="${b.id}"><div class="row sp"><span class="t">${withDate ? esc(dayShort(b.date)) + ' · ' : ''}${esc(b.time)}–${esc(bkEnd(b))} · ${esc(b.name || 'No name')}</span>${b.status === 'done' ? '<span class="badge complete">done</span>' : cl ? '<span class="badge overdue">clash</span>' : ''}</div>
    <div class="s">${esc(bkLabel(b))}</div>${cl ? `<div class="s" style="color:var(--bad);font-weight:700">Clashes with ${esc(cl.name || 'another appointment')} at ${esc(cl.time)}</div>` : ''}${b.address ? `<div class="s">${esc(addrFirst(b.address))}</div>` : ''}</button>`;
}
function calGrid(sel, month) {
  const [y, m] = month.split('-').map(Number), lead = (new Date(y, m - 1, 1).getDay() + 6) % 7, dim = new Date(y, m, 0).getDate(), t = localISO();
  let h = '<div class="calg">' + ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => `<div class="dn">${d}</div>`).join('');
  for (let i = 0; i < lead; i++) h += '<span></span>';
  for (let d = 1; d <= dim; d++) { const iso = month + '-' + String(d).padStart(2, '0'); h += `<button type="button" data-act="calDay" data-d="${iso}" class="${iso === t ? 'today ' : ''}${iso === sel ? 'sel' : ''}">${d}${bkOn(iso).length ? '<i></i>' : ''}</button>`; }
  return h + '</div>';
}
const calHead = month => `<div class="calhd"><button type="button" data-act="calMonth" data-n="-1" aria-label="Previous month">‹</button><b>${monthLong(month)}</b><button type="button" data-act="calMonth" data-n="1" aria-label="Next month">›</button></div>`;
const calSeg = mode => `<div class="seg cals" style="margin-bottom:14px">${[['today', 'Today'], ['week', 'Week'], ['month', 'Month']].map(([k, l]) => `<button type="button" data-act="calMode" data-m="${k}" class="${mode === k ? 'on' : ''}">${l}</button>`).join('')}<button type="button" data-act="remOpen" class="${mode === 'due' ? 'on' : ''}">Due${remCount() ? ' (' + remCount() + ')' : ''}</button></div>`;
function calHomeHtml() {
  if (!calOn() || settings.calHome === 'off') return '';
  const t = localISO(), td = bkOn(t), s = calState();
  return `${tomorrowHtml()}<h2>Today</h2>
    ${td.length ? td.map(b => bkItem(b)).join('') : '<div class="empty" style="padding:14px">Nothing booked in today.</div>'}
    <button class="btn block" data-act="bookNew" data-d="${t}">+ Schedule an appointment</button>
    ${remCount() ? `<button class="btn block sec" data-act="remOpen" style="margin-top:10px">Annual checks due (${remCount()})</button>` : ''}`;
}
function renderCal(v) {
  const s = calState(), t = localISO(), mode = ui.calMode || 'today';
  let body;
  if (mode === 'today') {
    const up = bookings.filter(b => b.date > t && b.date <= addDays(t, 7)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const td = bkOn(t);
    body = `<h2 style="margin-top:0">${dayLong(t)}</h2>
      ${td.length ? td.map(b => bkItem(b)).join('') : '<div class="empty" style="padding:14px">Nothing booked in today.</div>'}
      <button class="btn gold block" data-act="bookNew" data-d="${t}">+ Appointment today</button>
      ${tomorrowHtml()}
      ${up.length ? '<h2>Coming up this week</h2>' + up.map(b => bkItem(b, true)).join('') : ''}`;
  } else if (mode === 'week') {
    const w = s.w || (s.w = mondayOf(localISO())), days = Array.from({ length: 7 }, (_, i) => addDays(w, i));
    body = `<div class="calhd"><button type="button" data-act="calWeek" data-n="-1" aria-label="Previous week">‹</button><b>${esc(dayShort(w))} – ${esc(dayShort(addDays(w, 6)))}</b><button type="button" data-act="calWeek" data-n="1" aria-label="Next week">›</button></div>`
      + days.map(d => { const l = bkOn(d); return `<div class="row sp wkd"><h2 style="margin:14px 0 6px${d === t ? ';color:var(--gold2)' : ''}">${esc(dayShort(d))}</h2><button type="button" class="btn ghost" data-act="bookNew" data-d="${d}" style="min-height:36px;padding:4px 12px" aria-label="Add on ${esc(dayShort(d))}">+ Add</button></div>` + (l.length ? l.map(b => bkItem(b)).join('') : '<p class="small muted" style="margin:0 0 4px">Nothing booked.</p>'); }).join('');
  } else {
    const day = bkOn(s.d);
    body = `${calHead(s.m)}${calGrid(s.d, s.m)}
      <h2 style="margin-top:0">${dayLong(s.d)}</h2>
      ${day.length ? day.map(b => bkItem(b)).join('') : '<div class="empty" style="padding:14px">Nothing booked this day.</div>'}
      <button class="btn gold block" data-act="bookNew" data-d="${s.d}">+ Appointment on this day</button>`;
  }
  v.innerHTML = `<h1>Calendar</h1>
    ${calSeg(mode)}
    ${body}
    <div style="height:10px"></div><button class="btn block" data-act="syncNow">Sync now</button>
    <div style="height:10px"></div><button class="btn ghost block" data-nav="home">Back to services</button>`;
}
function newBook(o) {
  const c = o.customer || null;
  return Object.assign({ id: uid(), date: localISO(), time: '09:00', mins: String(settings.calMins || '60'), types: [], customerId: c ? c.id : '', name: c ? c.name : '', phone: c ? c.phone || '' : '', email: c ? c.email || '' : '', address: c && (c.properties || []).length === 1 ? c.properties[0] : '', notes: '', status: 'booked' }, o.base || {});
}
/* the forms made for an appointment: the ones it started, or (older appointments) forms for the same customer on the same day */
function bkForms(B) {
  const ids = new Set(B.recIds || []); if (B.fromQuote) ids.add(B.fromQuote);
  let list = records.filter(r => ids.has(r.id));
  if (!list.length && B.date && (B.customerId || B.name)) {
    const nm = String(B.name || '').trim().toLowerCase(), want = (B.types || []).filter(t => t !== 'other');
    list = records.filter(r => r.inspectionDate === B.date && (B.customerId ? r.customerId === B.customerId : String((r.customer || {}).name || '').trim().toLowerCase() === nm) && (!want.length || want.includes(typeOf(r))));
  }
  return list;
}
function openRecFromBook(id) {
  const q = records.find(x => x.id === id); if (!q) return;
  const m = mates(q), done = m.every(x => x.status === 'complete');
  ui.formFrom = { view: 'book', book: ui.book }; ui.book = null; ui.job = m.length > 1 ? m.map(x => x.id) : null; ui.rec = done ? m[m.length - 1] : m[0];
  ui.step = done ? stepsOf(ui.rec).length - 1 : 0; ui.appTab = 0; ui.showErr = false; ui.pdfs = {}; ui.view = 'form'; render(); window.scrollTo(0, 0);
}
function renderBook(v) {
  const B = ui.book, isNew = !bookings.some(x => x.id === B.id), c = customers.find(x => x.id === B.customerId);
  const props = c ? (c.properties || []).filter(Boolean) : [], inList = props.includes(B.address);
  const f = (k, l, o = {}) => `<label class="f"><span>${l}</span>${o.area ? `<textarea data-bk="${k}" rows="2">${esc(B[k])}</textarea>` : `<input data-bk="${k}" value="${esc(B[k])}" ${o.type ? `type="${o.type}"` : ''} autocomplete="off">`}</label>`;
  const late = !isNew && typeof bkLate === 'function' && bkLate(B);
  const top = isNew ? '' : (settings.calOtwOn === 'off' ? '' : `<button class="btn gold block" id="bkOtw" data-act="bookOtw" style="margin-bottom:10px" ${isMobileNo(B.phone) ? '' : 'hidden'}>Text: I’m on my way</button>`) + (late ? `<button class="btn block" data-act="bookResched" style="margin-bottom:10px;border-color:#d9a200">Running late? Reschedule</button>` : '') + (String(B.address || '').trim() ? `<a class="btn block" style="text-align:center;text-decoration:none;margin-bottom:10px" href="${esc(mapsUrl(B.address))}" target="_blank" rel="noopener">Navigate to ${esc(addrFirst(B.address))}</a>` : '');
  v.innerHTML = `<h1>${isNew ? 'Schedule in' : 'Appointment'}</h1>
    ${top}
    <h2 style="margin-top:${top ? '14px' : '0'}">What is the job?</h2>
    ${BK_TYPES.filter(([k]) => k === 'other' || recOn(k) || B.types.includes(k)).map(([k, l]) => `<button type="button" class="item tog ${B.types.includes(k) ? 'on' : ''}" data-act="bookType" data-t="${k}"><span class="box"></span><span class="t">${l}</span></button>`).join('')}
    ${B.types.includes('other') ? `<div class="card"><label class="f"><span>What is the other job?</span><input data-bk="other" value="${esc(B.other || '')}" placeholder="For example: bathroom install" autocomplete="off"></label>
      ${calJobs().length ? `<div class="seg wrap">${calJobs().map((j, i) => `<button type="button" data-act="bookOther" data-i="${i}" class="${(B.other || '') === j ? 'on' : ''}">${esc(j)}</button>`).join('')}</div>` : ''}</div>` : ''}
    <h2>When</h2>
    <div class="card">${f('date', 'Date', { type: 'date' })}${f('time', 'Start time', { type: 'time' })}
      <button type="button" class="item tog ${B.auto ? 'on' : ''}" data-act="bookAuto" style="margin-top:2px"><span class="box"></span><span><span class="t">Auto schedule</span><span class="s" style="display:block">Let Plan my day choose the time for this job. Leave it unticked if the customer has agreed a fixed time.</span></span></button>
      <label class="f"><span>How long</span><select data-bk="mins">${[['30', '30 minutes'], ['45', '45 minutes'], ['60', '1 hour'], ['90', '1½ hours'], ['120', '2 hours'], ['180', '3 hours'], ['240', '4 hours'], ['480', 'All day']].map(([m, l]) => `<option value="${m}" ${String(B.mins) === m ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
    <h2>Customer</h2>
    <div class="card">
      ${f('name', 'Customer name')}<div id="bkNameSug"></div>${c ? '<p class="small muted" style="margin:-4px 0 12px">Saved customer. Change the name to book someone new.</p>' : '<p class="small muted" style="margin:-4px 0 12px">Start typing to find a saved customer, or fill in the details for a new one.</p>'}${f('phone', 'Phone', { type: 'tel' })}${f('email', 'Email', { type: 'email' })}
      ${props.length ? `<label class="f"><span>Address of the job</span><select data-bk="propPick">${B.addrNew || inList ? '' : '<option value="">Choose an address</option>'}${props.map((p, i) => `<option value="${i}" ${!B.addrNew && p === B.address ? 'selected' : ''}>${esc(addrFirst(p) + (p.split('\n')[1] ? ', ' + p.split('\n')[1] : ''))}</option>`).join('')}<option value="__new" ${B.addrNew ? 'selected' : ''}>+ Add a new address</option></select></label>` : ''}
      ${!props.length || B.addrNew || (B.address && !inList) ? (() => { const sp = splitAddr(B.address || ''); return `<div class="f addrw"><span>${props.length ? 'New address' : 'Address of the job'}</span><textarea data-bk="address" rows="3" autocapitalize="words">${esc(sp.addr)}</textarea><input class="pc" data-bk="addrpc" type="text" placeholder="Postcode" maxlength="9" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Postcode" value="${esc(sp.pc)}"></div>`; })() : ''}
    </div>
    <h2>Notes</h2><div class="card">${f('notes', 'Anything to remember', { area: 1 })}</div>
    <button class="btn gold block" data-act="bookSave">${isNew ? 'Add to calendar' : 'Save changes'}</button>
    ${!isNew && bkForms(B).length ? `<h2>Forms for this job</h2>${bkForms(B).map(r => `<button type="button" class="item" data-act="bookForm" data-id="${r.id}"><div class="row sp"><span class="t">${esc(formName(r))}</span><span class="badge ${r.status}">${r.status}</span></div><div class="s">${esc(r.ref)} · ${ukDate(r.inspectionDate)}</div></button>`).join('')}` : ''}
    ${isNew ? '' : `<div style="height:10px"></div><button class="btn block" data-act="bookStart">Start the forms for this job</button>
      <div style="height:10px"></div><button class="btn block" data-act="bookDone">${B.status === 'done' ? 'Mark as not done' : 'Mark as done'}</button>
      <div style="height:10px"></div><button class="btn block" data-act="bookIcs">Add to my phone’s calendar</button>
      <div style="height:10px"></div><button class="btn block ghost" data-act="bookDel">Delete appointment</button>`}
    <div style="height:10px"></div><button class="btn ghost block" data-act="bookBack">${isNew ? 'Cancel' : 'Back'}</button>`;
}
function bkBack() { ui.book = null; if (ui.bookFrom === 'quotes') { ui.view = 'invoices'; ui.invTab = 'quotes'; } else if (ui.bookFrom === 'form' && ui.rec) ui.view = 'form'; else if (ui.bookFrom === 'due') ui.view = 'due'; else if (ui.bookFrom === 'pick' && ui.pick) ui.view = 'pick'; else ui.view = ui.bookFrom === 'home' ? 'home' : 'cal'; render(); }
function bkFill(B, c) { if (!c) return; B.addrNew = false; B.customerId = c.id; B.name = c.name || ''; B.phone = c.phone || ''; B.email = c.email || ''; const ps = (c.properties || []).filter(Boolean); B.address = ps.length === 1 ? ps[0] : (ps.includes(B.address) ? B.address : ''); }
function bkValid(B) {
  if (!B.types.length) { toast('Choose what the job is'); return false; }
  if (B.types.includes('other') && !String(B.other || '').trim()) { toast('Type what the other job is'); return false; }
  if (!B.date || !B.time) { toast('Set the date and time'); return false; }
  if (!String(B.name || '').trim()) { toast('Add the customer’s name'); return false; }
  const s = toMin(B.time), e = s + (+B.mins || 60);
  const ov = bookings.find(x => x.id !== B.id && x.date === B.date && toMin(x.time) < e && s < toMin(x.time) + (+x.mins || 60));
  if (ov && !confirm('You already have ' + (ov.name || 'an appointment') + ' at ' + ov.time + '. Book this one anyway?')) return false;
  return true;
}
function bkSave() {
  const B = ui.book; if (!bkValid(B)) return false;
  { const cu = customers.find(x => x.id === B.customerId), ad = String(B.address || '').trim(); if (cu && ad && !(cu.properties || []).includes(ad)) { (cu.properties = (cu.properties || []).filter(Boolean)).push(ad); cu.updated = Date.now(); cu._dirty = true; saveCustomers(); } }
  B.updated = Date.now(); const i = bookings.findIndex(x => x.id === B.id);
  if (i >= 0) bookings[i] = { ...B }; else bookings.push({ ...B });
  saveBookings(); syncAll(); return true;
}
function icsDT(date, min) { const [y, m, d] = date.split('-').map(Number), dt = new Date(y, m - 1, d, Math.floor(min / 60), min % 60), p = n => String(n).padStart(2, '0'); return dt.getFullYear() + p(dt.getMonth() + 1) + p(dt.getDate()) + 'T' + p(dt.getHours()) + p(dt.getMinutes()) + '00'; }
function icsFor(list) {
  const esc2 = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'), stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//OMB Gas Service//Calendar//EN', 'CALSCALE:GREGORIAN'];
  list.forEach(b => {
    const s = toMin(b.time), desc = [b.phone && 'Phone: ' + b.phone, b.email && 'Email: ' + b.email, b.notes].filter(Boolean).join('\n');
    L.push('BEGIN:VEVENT', 'UID:' + b.id + '@ombgas.com', 'DTSTAMP:' + stamp, 'DTSTART:' + icsDT(b.date, s), 'DTEND:' + icsDT(b.date, s + (+b.mins || 60)),
      'SUMMARY:' + esc2(bkLabel(b) + ' – ' + (b.name || '')), 'LOCATION:' + esc2(String(b.address || '').replace(/\s*\n+\s*/g, ', ')), 'DESCRIPTION:' + esc2(desc), 'END:VEVENT');
  });
  L.push('END:VCALENDAR'); return L.join('\r\n');
}
function bkCsv() {
  const q = v => '"' + String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ', ') + '"';
  const rows = [['Date', 'Start', 'End', 'Customer', 'Phone', 'Email', 'Address', 'Job', 'Status', 'Notes']].concat([...bookings].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map(b => [ukDate(b.date), b.time, bkEnd(b), b.name, b.phone, b.email, b.address, bkLabel(b), b.status === 'done' ? 'Done' : 'Booked', b.notes]));
  return '\ufeff' + rows.map(r => r.map(q).join(',')).join('\r\n');
}
function bkStart() {
  const B = ui.book, types = B.types.filter(t => t !== 'other');
  if (!types.length) { toast('There is no form for “Other job”'); return; }
  if (!bkSave()) return;
  let cu = customers.find(x => x.id === B.customerId);
  if (!cu) { cu = { id: uid(), name: B.name.trim(), phone: B.phone, email: B.email, billing: '', properties: [], updated: Date.now(), _dirty: true }; customers.unshift(cu); }
  const a = String(B.address || '').trim();
  if (a && !(cu.properties || []).includes(a)) (cu.properties = cu.properties || []).push(a);
  saveCustomers();
  const bk = bookings.find(x => x.id === B.id); if (bk) { bk.customerId = cu.id; bk.status = 'done'; bk.updated = Date.now(); saveBookings(); syncAll(); }
  ui.pick = { types: Object.fromEntries(types.map(t => [t, true])), customer: cu }; ui.formFrom = { view: 'book', book: { ...B } }; ui.book = null; startJob();
  { const bk2 = bookings.find(x => x.id === B.id); if (bk2) { bk2.recIds = (jobRecs() || [ui.rec]).map(r => r.id); saveBookings(); } }   // remember which forms this appointment made
  if (a) { (jobRecs() || [ui.rec]).forEach(r => { r.jobAddress = a; persistRec(r); autoPrev(r); }); render(); }
}
async function calAct(a, b) {
  switch (a) {
    case 'calOpen': syncAll(); ui.cal = null; calState(); ui.calMode = ['today', 'week', 'month'].includes(settings.calView) ? settings.calView : 'today'; ui.view = 'cal'; render(); return true;
    case 'calMode': ui.calMode = b.dataset.m; if (b.dataset.m === 'today') ui.cal = null; render(); return true;
    case 'calWeek': { const s = calState(); s.w = addDays(s.w || mondayOf(localISO()), 7 * (+b.dataset.n)); const y = window.scrollY; render(); window.scrollTo(0, y); return true; }
    case 'calMonth': { const s = calState(), [y, m] = s.m.split('-').map(Number), d = new Date(y, m - 1 + (+b.dataset.n), 1); s.m = localISO(d).slice(0, 7); render(); return true; }
    case 'calDay': { const s = calState(); s.d = b.dataset.d; s.m = s.d.slice(0, 7); ui.calMode = 'month'; if (ui.view === 'home') ui.view = 'cal'; render(); window.scrollTo(0, 0); return true; }
    case 'bookNew': ui.book = newBook({ base: { date: b.dataset.d || localISO() } }); ui.bookFrom = ui.view === 'home' ? 'home' : 'cal'; ui.view = 'book'; render(); return true;
    case 'bookForm': case 'bookQuote': openRecFromBook(b.dataset.id || (ui.book || {}).fromQuote); return true;
    case 'quoBook': {
      const r = records.find(x => x.id === b.dataset.id); if (!r) return true;
      const cu = customers.find(c => c.id === r.customerId) || null, cd = r.customer || {};
      ui.book = newBook({ customer: cu, base: { types: ['other'], other: r.general ? (r.title || 'Quoted job') : 'Boiler installation', date: localISO(), address: r.jobAddress || '', name: (cu && cu.name) || cd.name || '', phone: (cu && cu.phone) || cd.phone || '', email: (cu && cu.email) || cd.email || '', notes: 'Quote ' + (r.ref || ''), fromQuote: r.id } });
      ui.bookFrom = ui.view === 'invoices' ? 'quotes' : 'form'; ui.view = 'book'; render(); window.scrollTo(0, 0); return true;
    }
    case 'remBook': {
      const r = records.find(x => x.id === b.dataset.id); if (!r) return true;
      const cu = customers.find(c => c.id === r.customerId) || null, cd = r.customer || {}, t = typeOf(r);
      ui.book = newBook({ customer: cu, base: { types: [t], date: r.renewal && r.renewal >= localISO() ? r.renewal : localISO(), address: r.jobAddress || '', name: (cu && cu.name) || cd.name || '', phone: (cu && cu.phone) || cd.phone || '', email: (cu && cu.email) || cd.email || '', fromRem: r.id } });
      ui.bookFrom = 'due'; ui.view = 'book'; render(); window.scrollTo(0, 0); return true;
    }
    case 'bookFromPick': { const pk = ui.pick; ui.book = newBook({ customer: pk.customer, base: { types: Object.keys(pk.types).filter(k => pk.types[k]) } }); ui.bookFrom = 'pick'; ui.view = 'book'; render(); return true; }
    case 'bookPickCust': { const c = customers.find(x => x.id === b.dataset.id); if (c) { const y = window.scrollY; bkFill(ui.book, c); render(); window.scrollTo(0, y); } return true; }
    case 'bookOtw': {
      const B = ui.book, ph = String(B.phone || '').replace(/[^\d+]/g, '');
      if (!isMobileNo(B.phone)) { toast('Add a mobile number for this customer first'); return true; }
      const body = otwText(B);
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) { const el = document.createElement('a'); el.href = 'sms:' + ph + '?&body=' + encodeURIComponent(body); document.body.appendChild(el); el.click(); el.remove(); }
      else { try { await navigator.clipboard.writeText(body); toast('Message copied. Paste it into a text to ' + B.phone); } catch (e) { toast('Texts open on a phone. Use this on your phone to send it.'); } }
      return true;
    }
    case 'calRemSent': { const id = b.dataset.id; setTimeout(() => { const x = bookings.find(z => z.id === id); if (x) { x.remindedAt = Date.now(); x.updated = Date.now(); saveBookings(); syncAll(); const y = window.scrollY; render(); window.scrollTo(0, y); } }, 600); return true; }
    case 'calRemAll': {
      const x = remPending()[0]; if (!x) { toast('Everyone with a mobile number has been reminded'); return true; }
      x.remindedAt = Date.now(); x.updated = Date.now(); saveBookings(); syncAll();
      const body = remindText(x), y = window.scrollY;
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) { const el = document.createElement('a'); el.href = 'sms:' + String(x.phone).replace(/[^\d+]/g, '') + '?&body=' + encodeURIComponent(body); document.body.appendChild(el); el.click(); el.remove(); }
      else { try { await navigator.clipboard.writeText(body); toast('Message for ' + (x.name || 'customer') + ' copied. Paste it into a text to ' + x.phone); } catch (e) { toast('Texts open on a phone. Use this on your phone.'); } }
      render(); window.scrollTo(0, y); return true;
    }
    case 'calRemReset': settings.calRemText = ''; saveSettings(); { const y = window.scrollY; render(); window.scrollTo(0, y); } return true;
    case 'calOtwReset': settings.calOtw = ''; saveSettings(); { const y = window.scrollY; render(); window.scrollTo(0, y); } return true;
    case 'bookOther': { ui.book.other = calJobs()[+b.dataset.i] || ''; const y = window.scrollY; render(); window.scrollTo(0, y); return true; }
    case 'calJobAdd': { const el = document.getElementById('calJobNew'), v = el ? el.value.trim() : ''; if (!v) { toast('Type the job first'); return true; } const l = [...calJobs()]; if (!l.some(x => x.toLowerCase() === v.toLowerCase())) l.push(v); settings.calJobs = l; saveSettings(); const y = window.scrollY; render(); window.scrollTo(0, y); return true; }
    case 'calJobRm': { settings.calJobs = calJobs().filter((_, i) => i !== +b.dataset.i); saveSettings(); const y = window.scrollY; render(); window.scrollTo(0, y); return true; }
    case 'bookType': { const T = ui.book.types, i = T.indexOf(b.dataset.t); if (i >= 0) T.splice(i, 1); else T.push(b.dataset.t); const y = window.scrollY; render(); window.scrollTo(0, y); return true; }
    case 'bookAuto': { ui.book.auto = !ui.book.auto; const y = window.scrollY; render(); window.scrollTo(0, y); return true; }
    case 'bookOpen': { const x = bookings.find(z => z.id === b.dataset.id); if (x) { ui.book = { ...x, types: [...(x.types || [])] }; ui.bookFrom = ui.view === 'home' ? 'home' : 'cal'; ui.view = 'book'; render(); } return true; }
    case 'bookSave': { if (!bkSave()) return true; const B0 = ui.book, d = ui.book.date, t = ui.book.time; ui.pick = ui.bookFrom === 'pick' ? null : ui.pick; ui.cal = { m: d.slice(0, 7), d }; ui.calMode = 'month'; ui.book = null; ui.view = ui.bookFrom === 'due' ? 'due' : ui.bookFrom === 'home' ? 'home' : 'cal'; if (B0.fromQuote) { const qq = records.find(x => x.id === B0.fromQuote); if (qq) { qq.qBooked = d; persistRec(qq); } if (ui.bookFrom === 'quotes') { ui.view = 'invoices'; ui.invTab = 'quotes'; } else if (ui.bookFrom === 'form' && ui.rec) ui.view = 'form'; } if (ui.bookFrom === 'due' && B0.fromRem) { const rr = records.find(x => x.id === B0.fromRem); if (rr) remSetState(rr, 'booked'); } ui.bookFrom = ''; toast('Booked in for ' + dayShort(d) + ' at ' + t); render(); return true; }
    case 'bookDone': { ui.book.status = ui.book.status === 'done' ? 'booked' : 'done'; if (bkSave()) { toast(ui.book.status === 'done' ? 'Marked as done' : 'Marked as not done'); render(); } return true; }
    case 'bookDel': if (confirm('Delete this appointment?')) { deleteRemote('booking', ui.book.id); const fq = ui.book.fromQuote; bookings = bookings.filter(x => x.id !== ui.book.id); saveBookings(); if (fq && !bookings.some(x => x.fromQuote === fq)) { const qq = records.find(x => x.id === fq); if (qq && qq.qBooked) { qq.qBooked = ''; persistRec(qq); } } syncAll(); toast('Appointment deleted'); bkBack(); } return true;
    case 'bookBack': bkBack(); return true;
    case 'bookStart': bkStart(); return true;
    case 'bookIcs': if (bkValid(ui.book)) saveFile(icsFor([ui.book]), 'Appointment ' + ui.book.date + '.ics', 'text/calendar'); return true;
    case 'calExport': if (!bookings.length) { toast('No appointments to export yet'); return true; } saveFile(icsFor(bookings), 'Appointments ' + localISO() + '.ics', 'text/calendar'); return true;
    case 'calExportCsv': if (!bookings.length) { toast('No appointments to export yet'); return true; } saveFile(bkCsv(), 'Appointments ' + localISO() + '.csv', 'text/csv'); return true;
  }
  return false;
}
document.addEventListener('input', e => {
  const t = e.target, k = t && t.dataset && t.dataset.bk; if (!k || !ui.book || t.tagName === 'SELECT') return;
  if (k === 'address' || k === 'addrpc') { if (k === 'addrpc') t.value = t.value.toUpperCase(); const w = t.closest('.addrw'); ui.book.address = joinAddr(w.querySelector('textarea').value, w.querySelector('.pc').value); return; }
  ui.book[k] = t.value;
  if (k === 'phone') { const ob = document.getElementById('bkOtw'); if (ob) ob.hidden = !isMobileNo(t.value); }
  if (k === 'name') { if (ui.book.customerId) { const c = customers.find(x => x.id === ui.book.customerId); if (!c || c.name !== t.value) { ui.book.customerId = ''; ui.book.addrNew = false; } } const el = document.getElementById('bkNameSug'); if (el) el.innerHTML = nameSugHtml(ui.book, t.value, 'bookPickCust'); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t && t.dataset && t.dataset.s === 'calOn') { settings.calOn = t.value; saveSettings(); const y = window.scrollY; render(); window.scrollTo(0, y); return; }
  const k = t && t.dataset && t.dataset.bk; if (!k || !ui.book) return;
  const B = ui.book, y = window.scrollY;
  if (k === 'propPick') { const c = customers.find(x => x.id === B.customerId), ps = c ? (c.properties || []).filter(Boolean) : []; if (t.value === '__new') { B.addrNew = true; B.address = ''; } else if (t.value !== '') { B.addrNew = false; B.address = ps[+t.value] || ''; } render(); window.scrollTo(0, y); }
  else if (k === 'address' || k === 'addrpc') { const w = t.closest('.addrw'); B.address = joinAddr(w.querySelector('textarea').value, w.querySelector('.pc').value); }
  else B[k] = t.value;
});
