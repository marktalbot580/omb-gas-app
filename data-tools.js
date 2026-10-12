/* OMB Gas Service - customer import from a spreadsheet (CSV) and the yearly summary with an accounts export.
   Loaded before app.js; uses its globals (ui, customers, records, invoices, esc, toast, saveFile ...) when called. */
'use strict';

/* ---------- CSV reading ---------- */
function csvParse(text) {
  text = String(text || '').replace(/^﻿/, '');
  const first = text.split(/\r?\n/, 1)[0], delim = [',', ';', '\t'].map(d => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => String(x).trim()));
}

/* ---------- customers from a spreadsheet ---------- */
const IMP_COLS = {
  name: ['name', 'customer', 'customername', 'fullname', 'contactname', 'displayname', 'client', 'clientname'],
  company: ['company', 'companyname', 'business', 'organisation', 'organization'],
  first: ['firstname', 'first', 'givenname', 'forename'],
  last: ['lastname', 'last', 'surname', 'familyname'],
  mobile: ['mobile', 'mobilephone', 'mobilenumber', 'cell', 'cellphone', 'mobileno'],
  phone: ['phone', 'phonenumber', 'telephone', 'tel', 'phone1', 'homephone', 'contactnumber', 'workphone'],
  email: ['email', 'emailaddress', 'e-mail', 'mail', 'email1'],
  street: ['address', 'address1', 'addressline1', 'street', 'streetaddress', 'billingaddress', 'siteaddress', 'jobaddress', 'line1'],
  street2: ['address2', 'addressline2', 'line2', 'addressline'],
  city: ['city', 'town', 'suburb', 'locality'],
  county: ['county', 'state', 'region'],
  post: ['postcode', 'postalcode', 'zip', 'zipcode', 'postcode1']
};
const impKey = s => String(s || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
const impDigits = p => String(p || '').replace(/\D/g, '').replace(/^44/, '0').slice(-10);
const impNorm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
function impBuild(text) {
  const rows = csvParse(text); if (rows.length < 2) return { fresh: [], dupes: 0, blank: 0, total: 0, found: [] };
  const head = rows[0].map(impKey), col = {};
  Object.keys(IMP_COLS).forEach(k => { const i = head.findIndex(h => IMP_COLS[k].includes(h)); if (i >= 0) col[k] = i; });
  const get = (r, k) => (col[k] === undefined ? '' : String(r[col[k]] || '').trim());
  const known = customers.map(c => ({ n: impNorm(c.name), p: impDigits(c.phone), e: String(c.email || '').toLowerCase() })), seen = [], fresh = [];
  let dupes = 0, blank = 0;
  rows.slice(1).forEach(r => {
    const name = get(r, 'name') || [get(r, 'first'), get(r, 'last')].filter(Boolean).join(' ') || get(r, 'company');
    if (!name) { blank++; return; }
    const phone = get(r, 'mobile') || get(r, 'phone'), email = get(r, 'email'), n = impNorm(name), p = impDigits(phone), e = email.toLowerCase();
    const same = x => x.n === n && ((p && x.p === p) || (e && x.e === e) || (!p && !e) || (!x.p && !x.e));
    if (known.some(same) || seen.some(same)) { dupes++; return; }
    seen.push({ n, p, e });
    const addr = [get(r, 'street'), get(r, 'street2'), get(r, 'city'), get(r, 'county'), get(r, 'post')].filter(Boolean).join('\n');
    fresh.push({ id: uid(), name, phone, email, billing: '', properties: addr ? [addr] : [], updated: Date.now(), _dirty: true });
  });
  return { fresh, dupes, blank, total: rows.length - 1, found: Object.keys(col) };
}
function renderImport(v) {
  const I = ui.imp;
  v.innerHTML = `<h1>Import customers</h1>
    <div class="card"><p class="small" style="margin-top:0">Bring your customers across from another system, such as ServiceM8, Excel or Google Sheets. Export them as a <b>CSV</b> file, then choose the file here. The first row must be the column names (name, phone, email, address, postcode and so on).</p>
    <label class="btn gold block" style="text-align:center">Choose the CSV file<input id="impFile" type="file" accept=".csv,text/csv,text/plain" hidden></label></div>
    ${I ? `<h2>${esc(I.file)}</h2><div class="card">
      <div class="row sp"><span>Ready to add</span><b>${I.fresh.length}</b></div>
      <div class="row sp"><span>Already saved (skipped)</span><b>${I.dupes}</b></div>
      ${I.blank ? `<div class="row sp"><span>Rows with no name (skipped)</span><b>${I.blank}</b></div>` : ''}
      ${I.fresh.length ? `<p class="small muted">For example: ${I.fresh.slice(0, 3).map(c => esc(c.name)).join(', ')}${I.fresh.length > 3 ? '…' : ''}</p>` : '<p class="small muted">Nothing new to add. Check the file has a column called name (or first name and last name).</p>'}
      ${I.fresh.length ? `<button class="btn gold block" data-act="impGo">Add ${I.fresh.length} customer${I.fresh.length === 1 ? '' : 's'}</button>` : ''}</div>` : ''}
    <div style="height:10px"></div><button class="btn ghost block" data-nav="customers">Back to customers</button>`;
}

/* ---------- yearly summary ---------- */
const sumMoney = n => '£' + (Math.round((+n || 0) * 100) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sumYears = () => { const y = new Set([todayISO().slice(0, 4)]); invoices.forEach(i => i.date && y.add(i.date.slice(0, 4))); records.forEach(r => r.status === 'complete' && r.inspectionDate && y.add(r.inspectionDate.slice(0, 4))); return [...y].sort().reverse(); };
function sumData(y) {
  const inv = invoices.filter(i => (i.date || '').startsWith(y)), months = Array.from({ length: 12 }, () => ({ n: 0, net: 0, vat: 0, total: 0, paid: 0 }));
  const tot = { n: 0, net: 0, vat: 0, total: 0, paid: 0 };
  inv.forEach(i => { const T = invTotals(i), m = months[+i.date.slice(5, 7) - 1]; [m, tot].forEach(o => { o.n++; o.net += T.net; o.vat += T.vat; o.total += T.total; if (i.paid) o.paid += T.total; }); });
  const jobs = {}; records.filter(r => r.status === 'complete' && (r.inspectionDate || '').startsWith(y)).forEach(r => { const k = FORM_SHORT[typeOf(r)] || typeOf(r); jobs[k] = (jobs[k] || 0) + 1; });
  return { inv, months, tot, jobs };
}
function sumCsv(y) {
  const q = v => '"' + String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ', ') + '"';
  const rows = [['Invoice date', 'Invoice number', 'Customer', 'Net', 'VAT', 'Gross', 'Paid', 'Date paid', 'Paid by']].concat(sumData(y).inv.sort((a, b) => (a.date + a.number).localeCompare(b.date + b.number)).map(i => { const T = invTotals(i); return [ukDate(i.date), i.number, (i.customer || {}).name, T.net.toFixed(2), T.vat.toFixed(2), T.total.toFixed(2), i.paid ? 'Yes' : 'No', ukDate(i.paidDate), i.payMethod]; }));
  return '﻿' + rows.map(r => r.map(q).join(',')).join('\r\n');
}
function renderSummary(v) {
  const ys = sumYears(); if (!ui.sumYear || !ys.includes(ui.sumYear)) ui.sumYear = ys[0];
  const y = ui.sumYear, D = sumData(y), MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], T = D.tot;
  v.innerHTML = `<h1>Yearly summary</h1>
    <div class="seg wrap" style="margin-bottom:14px">${ys.map(x => `<button type="button" data-act="sumYear" data-y="${x}" class="${x === y ? 'on' : ''}">${x}</button>`).join('')}</div>
    <div class="card"><div class="small muted">Invoiced in ${y} (before VAT)</div><div style="font-size:26px;font-weight:700;color:var(--gold2)">${sumMoney(T.net)}</div>
      <div class="row sp" style="margin-top:8px"><span>VAT</span><b>${sumMoney(T.vat)}</b></div>
      <div class="row sp"><span>Total with VAT</span><b>${sumMoney(T.total)}</b></div>
      <div class="row sp"><span>Paid</span><b>${sumMoney(T.paid)}</b></div>
      <div class="row sp"><span>Still owed</span><b>${sumMoney(T.total - T.paid)}</b></div>
      <div class="row sp"><span>Invoices</span><b>${T.n}</b></div></div>
    <h2>Jobs completed</h2>
    <div class="card">${Object.keys(D.jobs).length ? Object.keys(D.jobs).sort().map(k => `<div class="row sp"><span>${esc(k)}</span><b>${D.jobs[k]}</b></div>`).join('') : '<p class="small muted" style="margin:0">No completed jobs in ' + y + '.</p>'}</div>
    <h2>Month by month</h2>
    <div class="card">${D.months.map((m, i) => m.n ? `<div class="row sp"><span>${MN[i]} <span class="small muted">(${m.n})</span></span><b>${sumMoney(m.net)}</b></div>` : '').join('') || '<p class="small muted" style="margin:0">No invoices in ' + y + '.</p>'}</div>
    <button class="btn gold block" data-act="sumCsv" ${T.n ? '' : 'disabled'}>Download for my accountant (CSV)</button>
    <p class="small muted">Opens in Excel, Google Sheets and most accounting software.</p>
    <button class="btn ghost block" data-nav="invoices">Back to invoices</button>`;
}

/* ---------- invoice: add a line from the price list (at its sale price) ---------- */
function plResults(q) {
  q = String(q || '').toLowerCase().trim();
  const hit = qAll().filter(x => QUO.saleOf(x, settings) !== null && (!q || (x.make + ' ' + x.name + ' ' + x.type).toLowerCase().includes(q))).slice(0, 12);
  return hit.map(x => `<button type="button" class="item" data-act="invPlPick" data-id="${esc(x.id)}"><div class="row sp"><span class="t">${esc(QUO.label(x))}</span><b>${sumMoney(QUO.saleOf(x, settings))}</b></div><div class="s">${esc(x.type)}</div></button>`).join('') || '<p class="small muted">Nothing found in your price list.</p>';
}
const plPanel = () => (ui.invPl ? `<div class="card"><label class="f"><span>Search your price list</span><input id="invPlQ" placeholder="For example: thermostat, copper, labour" autocomplete="off" value="${esc(ui.invPl.q)}"></label><div id="invPlRes">${plResults(ui.invPl.q)}</div></div>` : '');
async function dataAct(a, b) {
  switch (a) {
    case 'invPl': ui.invPl = ui.invPl ? null : { q: '' }; { const y = window.scrollY; render(); window.scrollTo(0, y); } return true;
    case 'invPlPick': {
      const x = qAll().find(z => z.id === b.dataset.id), inv = ui.inv; if (!x || !inv) return true;
      const line = { d: QUO.label(x), q: '1', p: QUO.saleText(x, settings) }, L = inv.lines;
      if (L.length === 1 && !String(L[0].d).trim() && !String(L[0].p).trim()) L[0] = line; else L.push(line);
      ui.invPl = null; ui.invPdf = null; persistInv(inv); render(); toast('Added ' + line.d); return true;
    }
    default: break;
  }
  switch (a) {
    case 'impOpen': ui.imp = null; ui.view = 'import'; render(); window.scrollTo(0, 0); return true;
    case 'impGo': {
      const I = ui.imp; if (!I || !I.fresh.length) return true;
      customers.unshift(...I.fresh); saveCustomers(); syncAll(); toast(I.fresh.length + ' customer' + (I.fresh.length === 1 ? '' : 's') + ' added'); ui.imp = null; ui.view = 'customers'; render(); window.scrollTo(0, 0); return true;
    }
    case 'sumOpen': ui.view = 'summary'; render(); window.scrollTo(0, 0); return true;
    case 'sumYear': ui.sumYear = b.dataset.y; render(); return true;
    case 'sumCsv': saveFile(sumCsv(ui.sumYear), 'Invoices ' + ui.sumYear + '.csv', 'text/csv'); return true;
  }
  return false;
}
document.addEventListener('input', e => {
  const t = e.target; if (!t || t.id !== 'invPlQ' || !ui.invPl) return;
  ui.invPl.q = t.value; const el = document.getElementById('invPlRes'); if (el) el.innerHTML = plResults(t.value);
});
document.addEventListener('change', async e => {
  const t = e.target; if (!t || t.id !== 'impFile' || !t.files || !t.files[0]) return;
  const f = t.files[0]; t.value = '';
  try { const I = impBuild(await f.text()); I.file = f.name; ui.imp = I; render(); } catch (err) { toast('Could not read that file'); }
});
