/* Annual check reminders: lists gas safety checks, boiler services and Legionella assessments that are due soon,
   and builds a ready-to-send message (text, WhatsApp or email) from the engineer's own phone.
   Nothing is sent automatically. What has been reminded / booked is kept on this phone only. */
const REM_KEY = 'omb_rem';
const REM_DEFAULT = 'Hi {name}, it\'s {business}. The annual {what} at {address} is due on {date}. Reply to let me know a good time to book it in. Thanks';
const remGet = () => { try { const o = JSON.parse(localStorage.getItem(REM_KEY)) || {}; return { s: o.s || {}, d: o.d || {}, stop: o.stop || {} }; } catch (e) { return { s: {}, d: {}, stop: {} }; } };
const remSet = o => { try { localStorage.setItem(REM_KEY, JSON.stringify(o)); } catch (e) { } };
const remNorm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const remAdd = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const remWindow = () => { const n = parseInt(settings.remDays, 10); return n >= 7 && n <= 365 ? n : 56; };
const remLong = iso => { const [y, m, d] = String(iso).split('-').map(Number); return `${d} ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1]} ${y}`; };
const REM_WHAT = { gas: 'gas safety check', service: 'boiler service', legionella: 'Legionella risk assessment' };

/* the newest completed gas check / service for each customer + property, if due within the window (or overdue) */
function remItems(allDays) {
  const st = remGet(), today = todayISO(), limit = remAdd(today, remWindow()), best = {};
  records.forEach(r => {
    const t = typeOf(r);
    if ((t !== 'gas' && t !== 'service' && t !== 'legionella') || r.status !== 'complete' || !r.renewal) return;
    const who = r.customerId || remNorm(r.customer && r.customer.name), key = [who, remNorm(r.jobAddress), t].join('|');
    const c = best[key];
    if (!c || String(r.inspectionDate) > String(c.inspectionDate) || (r.inspectionDate === c.inspectionDate && (r.updated || 0) > (c.updated || 0))) best[key] = r;
  });
  return Object.keys(best).map(key => {
    const r = best[key], cu = customers.find(c => c.id === r.customerId) || {}, cd = r.customer || {};
    return { key, r, t: typeOf(r), due: r.renewal, days: Math.round((Date.parse(r.renewal) - Date.parse(today)) / 864e5),
      name: cu.name || cd.name || '', phone: cu.phone || cd.phone || '', email: cu.email || cd.email || '' };
  }).filter(x => !st.stop[x.key] && !st.d[x.r.id] && !remStateOf(x.r) && (allDays || x.due <= limit)).sort((a, b) => a.due.localeCompare(b.due));
}
/* Booked / Not needed / Stop are saved on the customer (so they sync and the automatic emails skip them); a record with no customer keeps it on itself */
const remStateOf = r => { const cu = customers.find(c => c.id === r.customerId); return (cu && cu.remSt && cu.remSt[r.id]) || r.remState || ''; };
function remSetState(r, v) {
  const cu = customers.find(c => c.id === r.customerId);
  if (cu) { cu.remSt = Object.assign({}, cu.remSt, { [r.id]: v }); cu.updated = Date.now(); cu._dirty = true; saveCustomers(); syncAll(); }
  else { r.remState = v; persistRec(r); }
}
async function remTest() {
  if (!CLOUD.on || !CLOUD.signedIn || !CLOUD.signedIn()) { toast('Sign in first, then try again'); return; }
  toast('Sending a sample…');
  try { const j = await CLOUD.call('reminders', '?action=test'); if (j && j.error) throw new Error(j.error); toast('Sample sent to ' + (j.to || 'your sign-in email')); }
  catch (e) { toast('Could not send: ' + (e.message || e)); }
}
const remCount = () => { try { return remItems().length; } catch (e) { return 0; } };

function remMsg(it) {
  const tpl = String(settings.remText || '').trim() || REM_DEFAULT;
  return tpl.replace(/\{name\}/g, it.name || 'there').replace(/\{business\}/g, settings.businessName || 'your engineer')
    .replace(/\{what\}/g, REM_WHAT[it.t]).replace(/\{address\}/g, addrLine(it.r.jobAddress || '') || 'your property').replace(/\{date\}/g, remLong(it.due));
}
const remDigits = p => String(p || '').replace(/[^\d+]/g, '');
function remWa(p) { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); else if (d.startsWith('0')) d = '44' + d.slice(1); return d; }
const remHasMobile = p => String(p || '').replace(/\D/g, '').length >= 10;

function remBadge(it) {
  if (it.days < 0) return `<span class="badge overdue">Overdue ${-it.days} day${it.days === -1 ? '' : 's'}</span>`;
  if (it.days === 0) return '<span class="badge overdue">Due today</span>';
  return `<span class="badge ${it.days <= 14 ? 'unpaid' : 'draft'}">Due in ${it.days} day${it.days === 1 ? '' : 's'}</span>`;
}
function remCard(it, st) {
  const body = encodeURIComponent(remMsg(it)), id = it.r.id, sent = st.s[id];
  const sub = encodeURIComponent((settings.businessName || 'Annual check') + ': your ' + REM_WHAT[it.t] + ' is due');
  const act = (cls, href, label) => `<a class="btn ${cls}" data-act="remSent" data-id="${id}" href="${href}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${label}</a>`;
  const ways = [
    remHasMobile(it.phone) ? act('', `sms:${remDigits(it.phone)}?&body=${body}`, 'Text') : '',
    remHasMobile(it.phone) ? act('', `https://wa.me/${remWa(it.phone)}?text=${body}`, 'WhatsApp') : '',
    it.email ? act('', `mailto:${encodeURIComponent(it.email)}?subject=${sub}&body=${body}`, 'Email') : ''
  ].filter(Boolean).join('');
  return `<div class="card remc">
    <div class="row sp"><span class="t">${esc(it.name || 'No name')}</span>${remBadge(it)}</div>
    <div class="s">${esc(addrFirst(it.r.jobAddress || '') || 'No address')}</div>
    <div class="s">${FORM_SHORT[it.t]} due ${ukDate(it.due)}${sent ? ' · reminder sent ' + ukDate(sent) : ''}</div>
    ${ways ? `<div class="remways">${ways}</div>` : `<p class="small muted" style="margin:8px 0 0">No mobile number or email saved for this customer.</p>`}
    <div class="remways">
      <button class="btn ghost" data-act="remDone" data-id="${id}" data-v="booked">Booked in</button>
      <button class="btn ghost" data-act="remDone" data-id="${id}" data-v="skip">Not needed</button>
      <button class="btn ghost" data-act="remStop" data-id="${id}" data-key="${esc(it.key)}">Stop for this property</button>
    </div>
  </div>`;
}
function renderDue(v) {
  const items = remItems(), st = remGet(), n = remWindow();
  v.innerHTML = `
    <h1>Annual checks due</h1>
    <p class="small muted" style="margin-top:0">Gas safety checks, boiler services and Legionella assessments due in the next ${Math.round(n / 7)} weeks, or already overdue. Tap <b>Text</b>, <b>WhatsApp</b> or <b>Email</b> and your phone opens the message ready to send. Nothing is sent until you press send. You can change the wording in Settings.</p>
    ${items.length ? items.map(it => remCard(it, st)).join('') : '<div class="empty">Nothing due soon.<br>Completed gas checks, boiler services and Legionella assessments show up here as their next due date gets close.</div>'}
    <div style="height:10px"></div><button class="btn ghost block" data-nav="home">Back</button>`;
}
function remHomeBtn() {
  const n = remCount();
  return `<button class="btn gold block" data-act="remOpen">Annual checks due${n ? ` (${n})` : ''}</button><div style="height:10px"></div>`;
}
