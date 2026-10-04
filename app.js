/* OMB Gas Service – white-label Gas Safe, Legionella and air-con records
   Phone-first web app. Data is saved on the phone first, then synced to a Google Sheet. */
'use strict';

/* ---------- tiny helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id' + Date.now() + Math.random().toString(16).slice(2));
const LS = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { toast('Storage full – sync and clear old records'); } }
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const plusYear = iso => { const d = new Date(iso + 'T12:00:00'); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10); };
const ukDate = iso => iso ? iso.split('-').reverse().join('/') : '';
const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const setP = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); const t = ks.reduce((a, k) => a[k], o); t[last] = v; };
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600); }

/* ---------- form definition (taken from the ServiceM8 Landlord Gas Safety Record) ---------- */
const OPT = {
  count: ['1', '2', '3', '4'],
  location: ['Kitchen', 'Bathroom', 'Airing cupboard', 'Utility', 'Bedroom', 'Garage', 'Loft', 'Compartment', 'Other'],
  type: ['Boiler', 'Fire', 'Range Cooker', 'Water Heater', 'Gas Meter', 'Cooker', 'Hob', 'Oven', 'Gas Pipework', 'Warm Air Unit'],
  ownership: ['Landlord', 'Homeowner', 'Tenant'],
  flue: ['Room Sealed', 'Open Flue', 'Flueless', 'Vertex'],
  test: ['Operating Pressure', 'Gas Rate', 'Both'],
  pfn: ['Pass', 'Fail', 'NA'],
  pf: ['Pass', 'Fail'],
  yn: ['Yes', 'No'],
  tight: ['PASS', 'FAIL', 'NA', 'No access to meter', 'No access to communal bank of meters'],
  defectCount: ['0', '1', '2', '3', '4'],
  cls: ['ID', 'AR', 'NCS']
};
const STEPS = ['Customer', 'Appliances', 'Gas installation', 'Alarms', 'Defects', 'Next check', 'Sign off', 'Review'];
const isLeg = r => !!r && r.type === 'legionella';
const isSvc = r => !!r && r.type === 'service';
const isWarn = r => !!r && r.type === 'warning';
const isAc = r => !!r && r.type === 'aircon';
const typeOf = r => (r && r.type) || 'gas';
const stepsOf = r => (isLeg(r) ? LEG.STEPS : isSvc(r) ? SVC.STEPS : isWarn(r) ? WARN.STEPS : isAc(r) ? AC.STEPS : STEPS);
const ORDER = { gas: 0, service: 1, legionella: 2, aircon: 3, warning: 4 };
const FORM_NAME = { gas: 'Gas safety record', service: 'Boiler service record', legionella: 'Legionella risk assessment', aircon: 'Air conditioning commissioning report', warning: 'Danger / Do Not Use warning notice' };
const FORM_SHORT = { gas: 'Gas check', service: 'Boiler service', legionella: 'Legionella', aircon: 'Air conditioning', warning: 'Warning notice' };
/* copy the customer's email address so it can be pasted into the To box (the iPhone share sheet can't fill it in) */
function copyEmail(email) {
  email = String(email || '').trim(); if (!email) return;
  try { navigator.clipboard.writeText(email).then(() => toast('Email address copied – paste it into To'), () => { }); } catch (e) { }
}
/* email sign-off: engineer name (if set), business name, phone – no repeats */
function signOff() {
  const out = [];
  [settings.engineerName, settings.businessName, settings.phone].forEach(x => { x = String(x || '').trim(); if (x && !out.includes(x)) out.push(x); });
  return out.join('\n');
}
/* "Mr Mark Talbot" / "Mr & Mrs Talbot" -> "Mr Talbot" / "Mr & Mrs Talbot"; a name with no title -> first name ("Mark Talbot" -> "Mark") */
function greetName(full) {
  const t = String(full || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!t.length) return 'there';
  const TITLE = /^(mr|mrs|ms|miss|mx|dr|prof|rev|sir|lady|lord)\.?$/i, JOIN = /^(&|and|\+)$/i;
  if (!TITLE.test(t[0])) return t[0];
  let i = 0; while (i < t.length && (TITLE.test(t[i]) || JOIN.test(t[i]))) i++;
  const titles = t.slice(0, i).map(x => JOIN.test(x) ? x : x[0].toUpperCase() + x.slice(1).toLowerCase().replace(/\.$/, '')).join(' ');
  const sn = t[t.length - 1];
  return i >= t.length ? 'there' : `${titles} ${sn[0].toUpperCase()}${sn.slice(1)}`;
}
/* wording used in email subjects: "<form> – <first line of the property address>" */
const SUBJ = { gas: 'Landlord Gas Safety Check', service: 'Boiler Service', legionella: 'Legionella Risk Assessment', aircon: 'Air Conditioning Commissioning', warning: 'Danger Do Not Use Warning Notice' };
const FORM_DOC = {
  gas: ['Gas Safety Record', 'Your next safety check is due by'],
  service: ['Gas Boiler Service Record', 'Your next boiler service is due by'],
  legionella: ['Legionella Risk Assessment', 'Your next assessment is due by'],
  aircon: ['Air Conditioning Commissioning Report', ''],
  warning: ['Danger Do Not Use Warning Notice', '']
};
/* one line per document in the emails; the warning notice has no due date */
const docLine = r => (FORM_DOC[typeOf(r)][1] ? `${FORM_DOC[typeOf(r)][0]} (${FORM_DOC[typeOf(r)][1].replace(/^Your /, '').replace(/ is due by$/, '')} due ${ukDate(r.renewal)})` : FORM_DOC[typeOf(r)][0]);
const billable = m => (m ? m.filter(r => typeOf(r) !== 'warning') : m);

const blankAppliance = () => ({
  location: '', locationOther: '', type: '', manufacturer: '', model: '', gc: '', ownership: 'Landlord', flue: '', serviced: '',
  test: '', op: '', hi: '', safety: '', vent: '', terminal: '', flueOp: '',
  ratioMin: '', coMin: '', co2Min: '', ratioMax: '', coMax: '', co2Max: '', safe: ''
});
const blankDefect = () => ({ text: '', cls: '', action: '' });

/* ---------- persistent state ---------- */
const DEFAULT_SETTINGS = {
  businessName: '', logo: '', accent: '#c9a24b', refPrefix: 'REC', updated: 0, address: '', phone: '', email: '',
  gasSafeReg: '', engineerName: '', gasSafeId: '', syncUrl: '', syncToken: '', gasSafeLogo: '', gasSafeLogoAR: 1,
  priceGas: '', priceSvc: '', priceLeg: '', priceAc: '', discType: '£', discValue: '',
  invPrefix: 'INV-', invNext: '1', invDigits: '3', payDays: '14', vatReg: 'Yes', vatRate: '20', vatNumber: '',
  bankName: '', accName: '', sortCode: '', accNo: '', invFooter: 'Thank you for your business.'
};
let settings = Object.assign({}, DEFAULT_SETTINGS, LS.get('omb_settings', {}));
let customers = LS.get('omb_customers', []);
let records = LS.get('omb_records', []);
let invoices = LS.get('omb_invoices', []);
records.forEach(r => (r.appliances || []).forEach(a => { if (a.test === 'Burner Pressure') a.test = 'Operating Pressure'; }));
/* 200109 or 20 01 09 -> 20-01-09 */
const fmtSort = v => (String(v || '').replace(/\D/g, '').slice(0, 6).match(/.{1,2}/g) || []).join('-');
const saveSettings = () => { settings.updated = Date.now(); LS.set('omb_settings', settings); applyBrand(); };
const saveCustomers = () => LS.set('omb_customers', customers);
const saveRecords = () => LS.set('omb_records', records);
const saveInvoices = () => LS.set('omb_invoices', invoices);

/* ---------- branding: each business's own logo, name and accent colour ---------- */
const cleanPrefix = p => String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
function placeholderLogo(name) {
  const w = String(name || '').trim().split(/\s+/).filter(Boolean), t = w.length ? ((w[0][0] || '') + ((w[1] || '')[0] || '')).toUpperCase().replace(/[^A-Z0-9&]/g, '') : 'OMB';
  const cv = document.createElement('canvas'); cv.width = cv.height = 200; const c = cv.getContext('2d');
  c.fillStyle = '#111'; c.fillRect(0, 0, 200, 200); c.fillStyle = settings.accent || '#c9a24b';
  c.font = 'bold 96px Helvetica,Arial,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, 100, 106);
  return cv.toDataURL('image/png');
}
function mixHex(h, to, k) { const n = x => parseInt(h.slice(x, x + 2), 16); return '#' + [1, 3, 5].map(i => Math.round(n(i) + (to - n(i)) * k).toString(16).padStart(2, '0')).join(''); }
let _brandKey = '';
function applyBrand() {
  const key = [settings.logo && settings.logo.length, settings.businessName, settings.accent].join('|');
  if (key === _brandKey) return; _brandKey = key;
  const name = settings.businessName || 'OMB Gas Service', img = document.querySelector('.bar-logo'), st = document.querySelector('.bar-title strong');
  if (img) img.src = settings.logo || placeholderLogo(settings.businessName);
  if (st) st.textContent = name;
  document.title = name;
  const a = /^#[0-9a-f]{6}$/i.test(settings.accent || '') ? settings.accent : '#c9a24b';
  document.documentElement.style.setProperty('--gold', a); document.documentElement.style.setProperty('--gold2', mixHex(a, 255, 0.3));
}

const ui = {
  view: 'home', step: 0, appTab: 0, rec: null, showErr: false, search: '',
  cust: null, syncState: '', job: null, pick: null, pdfs: {}, inv: null, invFilter: 'all', invPdf: null, invFrom: 'invoices', calc: {}
};
/* ui.pdf is the PDF of the record on screen; setting it to null forgets every PDF made so far (something was edited) */
Object.defineProperty(ui, 'pdf', {
  get() { return ui.rec ? (ui.pdfs[ui.rec.id] || null) : null; },
  set(v) { if (v === null) ui.pdfs = {}; else if (ui.rec) ui.pdfs[ui.rec.id] = v; }
});

/* ---------- records ---------- */
function newLegRecord(customer) {
  const d = todayISO();
  const n = records.filter(r => r.type === 'legionella' && r.inspectionDate === d).length + 1;
  return {
    id: uid(), type: 'legionella', ref: 'LRA-' + d.replace(/-/g, '') + '-' + String(n).padStart(2, '0'),
    status: 'draft', inspectionDate: d, renewal: plusYear(d),
    customerId: customer?.id || '', customer: { name: customer?.name || '', phone: customer?.phone || '', email: customer?.email || '', billing: customer?.billing || '' },
    jobAddress: '',
    susceptible: '', occupancy: '', coldSupply: '', hotType: '', hotOther: '', cylHeat: '', showers: '',
    coldOutlet: '', coldTemp: '', hotOutlet: '', hotTemp: '', tankTemp: '', cylTemp: '',
    ...LEG.blankChecks(),
    overall: '', defectCount: '0', defects: [], notes: '',
    customerPresent: '', customerName: '', customerSig: '', engineerSig: '',
    updated: Date.now(), _dirty: true
  };
}
function newAcRecord(customer) {
  const d = todayISO();
  const n = records.filter(r => typeOf(r) === 'aircon' && r.inspectionDate === d).length + 1;
  return {
    id: uid(), type: 'aircon', ref: 'ACC-' + d.replace(/-/g, '') + '-' + String(n).padStart(2, '0'),
    status: 'draft', inspectionDate: d, renewal: '',
    customerId: customer?.id || '', customer: { name: customer?.name || '', phone: customer?.phone || '', email: customer?.email || '', billing: customer?.billing || '' },
    jobAddress: '', ...AC.blank(),
    notes: '', customerPresent: '', customerName: '', customerSig: '', engineerSig: '',
    updated: Date.now(), _dirty: true
  };
}
function newSvcRecord(customer) {
  const d = todayISO();
  const n = records.filter(r => typeOf(r) === 'service' && r.inspectionDate === d).length + 1;
  return {
    id: uid(), type: 'service', ref: 'SVC-' + d.replace(/-/g, '') + '-' + String(n).padStart(2, '0'),
    status: 'draft', inspectionDate: d, renewal: plusYear(d),
    customerId: customer?.id || '', customer: { name: customer?.name || '', phone: customer?.phone || '', email: customer?.email || '', billing: customer?.billing || '' },
    jobAddress: '',
    ...SVC.blank(),
    notes: '', customerPresent: '', customerName: '', customerSig: '', engineerSig: '',
    updated: Date.now(), _dirty: true
  };
}
function newWarnRecord(customer) {
  const d = todayISO();
  const n = records.filter(r => typeOf(r) === 'warning' && r.inspectionDate === d).length + 1;
  return {
    id: uid(), type: 'warning', ref: 'WRN-' + d.replace(/-/g, '') + '-' + String(n).padStart(2, '0'),
    status: 'draft', inspectionDate: d, renewal: '',
    customerId: customer?.id || '', customer: { name: customer?.name || '', phone: customer?.phone || '', email: customer?.email || '', billing: customer?.billing || '' },
    jobAddress: '', ...WARN.blank(),
    notes: '', customerPresent: '', customerName: '', customerSig: '', engineerSig: '',
    updated: Date.now(), _dirty: true
  };
}
function newRecord(customer, type) {
  if (type === 'warning') return newWarnRecord(customer);
  if (type === 'legionella') return newLegRecord(customer);
  if (type === 'service') return newSvcRecord(customer);
  if (type === 'aircon') return newAcRecord(customer);
  const d = todayISO();
  const n = records.filter(r => typeOf(r) === 'gas' && r.inspectionDate === d).length + 1;
  const rec = {
    id: uid(), ref: (cleanPrefix(settings.refPrefix) || 'REC') + '-' + d.replace(/-/g, '') + '-' + String(n).padStart(2, '0'),
    status: 'draft', inspectionDate: d, renewal: plusYear(d),
    customerId: customer?.id || '', customer: { name: customer?.name || '', phone: customer?.phone || '', email: customer?.email || '', billing: customer?.billing || '' },
    jobAddress: '', applianceCount: '1', appliances: [blankAppliance()],
    installPipe: '', supplyPipe: '', ecv: '', bonding: '', tightness: '', tightnessResult: '', tightStart: '', tightEnd: '', tightMins: '',
    coAlarm: '', coAlarmTest: '', smokeAlarm: '', smokeAlarmTest: '',
    defectCount: '0', defects: [], notes: '',
    customerPresent: '', customerName: '', customerSig: '', engineerSig: '',
    updated: Date.now(), _dirty: true
  };
  return rec;
}
function persistRec(rec) {
  rec.updated = Date.now(); rec._dirty = true;
  const i = records.findIndex(r => r.id === rec.id);
  if (i >= 0) records[i] = rec; else records.unshift(rec);
  syncJob(rec);
  saveRecords();
}

/* ---------- visits: several forms for one customer, filled in together ---------- */
const jobRecs = () => (ui.job ? ui.job.map(id => records.find(r => r.id === id)).filter(Boolean) : null);
function mates(rec) { return rec.jobId ? records.filter(x => x.jobId === rec.jobId).sort((a, b) => ORDER[typeOf(a)] - ORDER[typeOf(b)]) : [rec]; }
/* The first form of a visit holds the customer details and the last holds the sign-off; both are copied to the other forms. */
function syncJob(rec) {
  if (!rec.jobId) return;
  const m = mates(rec); if (m.length < 2) return;
  const first = m[0], last = m[m.length - 1];
  m.forEach(x => {
    if (x === rec) return;
    if (rec === first) { x.customerId = rec.customerId; x.customer = { ...rec.customer }; x.jobAddress = rec.jobAddress; x.inspectionDate = rec.inspectionDate; }
    if (rec === last) ['customerPresent', 'customerName', 'customerSig', 'engineerSig'].forEach(k => { x[k] = rec[k]; });
    x.updated = Date.now(); x._dirty = true;
  });
}
/* the steps to walk through for a visit: the customer step only on the first form, the sign-off and review only on the last */
function jobSeq(job) {
  const seq = [];
  job.forEach((r, k) => {
    const n = stepsOf(r).length;
    for (let st = 0; st < n; st++) {
      if (k > 0 && st === 0) continue;
      if (k < job.length - 1 && st >= n - 2) continue;
      seq.push({ rec: r, step: st });
    }
  });
  return seq;
}
function seqPos() {
  const job = jobRecs();
  if (!job) return { seq: null, pos: ui.step };
  const seq = jobSeq(job);
  return { seq, pos: Math.max(0, seq.findIndex(x => x.rec.id === ui.rec.id && x.step === ui.step)) };
}
function goTo(rec, step) {
  ui.rec = rec; ui.step = step; ui.appTab = 0;
  if (isSvc(rec) && rec.jobId) { const g = mates(rec).find(x => typeOf(x) === 'gas'); if (g && SVC.prefill(rec, g)) persistRec(rec); }
  render();
}
function exitForm() {
  const m = jobRecs() || [ui.rec];
  commitCustomer(m[0]); m.forEach(persistRec);
  ui.job = null; ui.view = 'home'; render(); syncAll();
}
function goBack() {
  const { seq, pos } = seqPos();
  if (pos <= 0) { exitForm(); return; }
  if (seq) { const q = seq[pos - 1]; goTo(q.rec, q.step); } else { ui.step--; ui.appTab = 0; render(); }
}
function startJob() {
  const pk = ui.pick, types = ['gas', 'service', 'legionella', 'aircon'].filter(t => pk.types[t]);
  if (!types.length) { toast('Choose at least one form'); return; }
  const jobId = types.length > 1 ? uid() : '';
  const recs = types.map(t => { const r = newRecord(pk.customer, t); if (jobId) r.jobId = jobId; return r; });
  recs.forEach(persistRec);
  ui.job = jobId ? recs.map(r => r.id) : null;
  ui.rec = recs[0]; ui.step = 0; ui.appTab = 0; ui.showErr = false; ui.pdfs = {}; ui.pick = null; ui.view = 'form'; render();
}
function commitCustomer(rec) {
  const c = rec.customer;
  if (!c.name.trim()) return;
  let cu = customers.find(x => x.id === rec.customerId);
  if (!cu) { cu = { id: uid(), properties: [] }; customers.unshift(cu); rec.customerId = cu.id; }
  Object.assign(cu, { name: c.name.trim(), phone: c.phone, email: c.email, billing: c.billing, updated: Date.now(), _dirty: true });
  const a = rec.jobAddress.trim();
  if (a && !(cu.properties || []).includes(a)) (cu.properties = cu.properties || []).push(a);
  saveCustomers();
}

/* ---------- validation (mirrors the mandatory flags in the ServiceM8 form) ---------- */
function validate(rec) {
  if (isLeg(rec)) return LEG.validate(rec);
  if (isAc(rec)) return AC.validate(rec);
  if (isSvc(rec)) return SVC.validate(rec);
  if (isWarn(rec)) return WARN.validate(rec);
  const out = []; const need = (step, path, label, extra = {}) => { if (!String(getP(rec, path) ?? '').trim()) out.push({ step, path, label, ...extra }); };
  need(0, 'customer.name', 'Customer name'); need(0, 'jobAddress', 'Job address');
  rec.appliances.slice(0, +rec.applianceCount || 1).forEach((a, i) => {
    const P = k => `appliances.${i}.${k}`, n = `Appliance ${i + 1}: `;
    const A = { app: i };
    need(1, P('location'), n + 'location', A);
    if (a.location === 'Other') need(1, P('locationOther'), n + 'location (other)', A);
    need(1, P('type'), n + 'type', A); need(1, P('manufacturer'), n + 'manufacturer', A); need(1, P('model'), n + 'model', A);
    need(1, P('ownership'), n + 'ownership', A); need(1, P('flue'), n + 'flue type', A); need(1, P('serviced'), n + 'serviced', A);
    need(1, P('test'), n + 'which tests can be performed', A);
    if (a.test && a.test !== 'Gas Rate') need(1, P('op'), n + 'operating pressure', A);
    if (a.test && a.test !== 'Operating Pressure') need(1, P('hi'), n + 'gas rate (kW)', A);
    need(1, P('vent'), n + 'ventilation', A); need(1, P('terminal'), n + 'flue visual', A); need(1, P('flueOp'), n + 'flue operation', A);
    need(1, P('safety'), n + 'safety devices', A); need(1, P('safe'), n + 'safe to use', A);
  });
  need(2, 'installPipe', 'Installation pipework visual'); need(2, 'supplyPipe', 'Supply pipework visual');
  need(2, 'ecv', 'ECV access'); need(2, 'bonding', 'Equipotential bonding'); need(2, 'tightness', 'Tightness test');
  if (rec.tightness && !/access|^NA$/i.test(rec.tightness) && !(rec.tightnessResult && !rec.tightStart && !rec.tightEnd)) {   // (older records with only a typed result stay valid)
    need(2, 'tightStart', 'Tightness test start pressure'); need(2, 'tightEnd', 'Tightness test end pressure');
  }
  need(3, 'coAlarm', 'CO alarm fitted'); if (rec.coAlarm === 'Yes') need(3, 'coAlarmTest', 'CO alarm test');
  need(3, 'smokeAlarm', 'Smoke alarm present'); if (rec.smokeAlarm === 'Yes') need(3, 'smokeAlarmTest', 'Smoke alarm test');
  rec.defects.slice(0, +rec.defectCount || 0).forEach((d, i) => {
    const P = k => `defects.${i}.${k}`, n = `Defect ${i + 1}: `;
    need(4, P('text'), n + 'description'); need(4, P('cls'), n + 'classification'); need(4, P('action'), n + 'remedial action');
  });
  need(5, 'renewal', 'Next safety check due date');
  need(6, 'customerPresent', 'Customer present?');
  need(6, 'engineerSig', "Engineer's signature");
  if (rec.customerPresent === 'Yes') { need(6, 'customerName', 'Client name (signing)'); need(6, 'customerSig', 'Client signature'); }
  return out;
}
function warnings(rec) {
  if (isLeg(rec)) return LEG.warnings(rec, settings);
  if (isAc(rec)) return AC.warnings(rec, settings);
  if (isSvc(rec)) return SVC.warnings(rec, settings);
  if (isWarn(rec)) return WARN.warnings(rec, settings);
  const w = [];
  const set = settings;
  if (!set.address || !set.phone || !set.gasSafeReg || !set.engineerName || !set.gasSafeId) w.push('Business and engineer details are missing in Settings – they will be blank on the PDF.');
  if (!rec.customer.email) w.push('No customer email – you can still share the PDF from your phone.');
  const unsafe = rec.appliances.slice(0, +rec.applianceCount || 1).some(a => a.safe === 'No');
  if (unsafe && !(+rec.defectCount > 0)) w.push('An appliance is marked NOT safe but no defect is recorded.');
  return w;
}


/* ---------- gas tightness test: start / end pressure ---------- */
function tightLiveHtml(r) {
  const a = tgNum(r.tightStart), b = tgNum(r.tightEnd);
  if (a === null || b === null) return '';
  const d = Math.round((a - b) * 100) / 100, m = tgSecs(r.tightMins), over = m ? ` over ${tgDur(m)}` : '';
  return d === 0 ? `<span style="color:var(--ok)">No pressure drop${over}</span>`
    : d > 0 ? `<span style="color:var(--warn)">Pressure dropped ${d} mbar${over}</span>`
    : `<span style="color:var(--warn)">Pressure rose ${-d} mbar${over} – check the readings</span>`;
}
/* live stopwatch readout: mm:ss.mmm, refreshed by tickClocks() while a timer runs */
const fmtClock = ms => { ms = Math.max(0, Math.round(ms)); const m = Math.floor(ms / 60000), s = Math.floor(ms % 60000 / 1000), t = ms % 1000; return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + '.' + String(t).padStart(3, '0'); };
const clockMs = s => (s ? (s.t0 ? Date.now() - s.t0 : s.last || 0) : 0);
const clockHtml = key => `<div class="clock" data-clock="${esc(key)}">${fmtClock(clockMs(ui.calc[key]))}</div>`;
function tickClocks() { document.querySelectorAll('[data-clock]').forEach(el => { const s = ui.calc[el.dataset.clock]; if (s && s.t0) el.textContent = fmtClock(clockMs(s)); }); }
setInterval(tickClocks, 50);
const tightParts = r => { const t = tgSecs(r.tightMins); return t === null ? { m: '', s: '' } : { m: String(Math.floor(t / 60)), s: String(t % 60) }; };
const tightNeedsStart = r => !tightRunning(r) && tgNum(r.tightStart) === null;
const tightRunning = r => !!(ui.calc['tt-' + r.id] && ui.calc['tt-' + r.id].t0);
function tightFields(reqd = true) {
  const r = ui.rec, legacy = !isSvc(r) && r.tightnessResult && !r.tightStart && !r.tightEnd;
  return `<div class="row"><div class="grow">${txt('tightStart', 'Start pressure (mbar)', { req: reqd, mode: 'decimal' })}</div><div class="grow">${txt('tightEnd', 'End pressure (mbar)', { req: reqd, mode: 'decimal' })}</div></div>
    <div class="f"><span>Test duration</span>
      <div class="row" style="align-items:flex-end">
        <div class="grow"><input data-tm="m" type="text" inputmode="numeric" value="${esc(tightParts(r).m)}" placeholder="min" autocomplete="off"><small>minutes</small></div>
        <div class="grow"><input data-tm="s" type="text" inputmode="numeric" value="${esc(tightParts(r).s)}" placeholder="sec" autocomplete="off"><small>seconds</small></div>
        <button type="button" id="tightGo" class="btn ${tightRunning(r) ? 'gold' : ''}" style="margin-bottom:22px" data-act="tightTimer" ${tightNeedsStart(r) ? 'disabled' : ''}>${tightRunning(r) ? 'Stop' : 'Start timer'}</button></div>
      <small id="tightHint" style="${tightNeedsStart(r) ? 'color:var(--warn)' : ''}">${tightNeedsStart(r) ? 'Enter the start pressure before you start the timer.' : 'Optional – type it, or use the timer'}</small></div>
    ${clockHtml('tt-' + r.id)}
    <div class="tightlive" id="tightLive">${tightLiveHtml(r)}</div>
    ${legacy ? `<p class="small muted">Previously recorded: ${esc(r.tightnessResult)}</p>` : ''}`;
}

/* ---------- gas rate calculator (timed meter test) ---------- */
const calcState = id => ui.calc[id] || (ui.calc[id] = { open: false, unit: 'm³', start: '', end: '', secs: '', cv: settings.gasCV || '38.76', t0: 0, target: '' });
function calcSecs(v) {
  const s = String(v ?? '').trim().replace(',', '.'); if (!s) return null;
  const m = s.match(/^(\d+):(\d{1,2}(?:\.\d+)?)$/); if (m) return (+m[1]) * 60 + (+m[2]);
  const n = parseFloat(s); return Number.isFinite(n) ? n : null;
}
/* volume used: end reading minus start reading; on an imperial meter with no readings, one test-dial revolution = 1 ft³ */
const calcVol = s => { const a = tgNum(s.start), b = tgNum(s.end); if (a === null && b === null) return s.unit === 'ft³' ? 1 : null; return a === null || b === null ? null : Math.round((b - a) * 1e6) / 1e6; };
function gasCalc(s) {
  const t = calcSecs(s.secs), v = calcVol(s), cv = tgNum(s.cv);
  if (!(t > 0 && v > 0 && cv > 0)) return null;
  const m3 = s.unit === 'ft³' ? v * 0.0283168 : v;
  const gross = m3 * cv * 1000 / t;            // kW = m³ x MJ/m³ x 1000 / seconds
  return { m3h: m3 * 3600 / t, gross, net: gross / 1.11 };
}
function calcResHtml(id) {
  const s = calcState(id), g = gasCalc(s), v = calcVol(s);
  const gr = g ? (Math.round(g.gross * 10) / 10).toFixed(1) : '', nt = g ? (Math.round(g.net * 10) / 10).toFixed(1) : '';
  const rowv = (label, val, unit) => `<div class="row" style="margin:0 0 8px"><span class="grow">${label}</span><b style="min-width:84px;text-align:right">${val || '–'}</b><span class="muted" style="min-width:52px">${unit}</span></div>`;
  const msg = g ? '' : (v !== null && v <= 0 ? '<div style="color:var(--warn);margin-bottom:8px">The second reading must be higher than the first.</div>' : '');
  return msg + rowv('Gas rate', g ? g.m3h.toFixed(3) : '', 'm³/hr') + rowv('H.I. gross', gr, 'kW') + rowv('H.I. net', nt, 'kW') + (g ? `
    <div class="row" style="margin-top:12px"><button type="button" class="btn gold grow" data-act="calcUse" data-id="${id}" data-path="${esc(s.target)}" data-val="${nt}">Use ${nt} kW (net)</button>
    <button type="button" class="btn grow" data-act="calcUse" data-id="${id}" data-path="${esc(s.target)}" data-val="${gr}">Use ${gr} (gross)</button></div>
    <p class="small muted" style="margin:8px 0 0">Compare the net figure with the net heat input on the data plate.</p>` : '');
}
const calcVolHtml = s => {
  const v = calcVol(s), a = tgNum(s.start), b = tgNum(s.end);
  if (a === null && b === null) return s.unit === 'ft³' ? 'No readings: stop the timer after <b>one revolution</b> of the test dial (1 ft³), or enter two readings.' : 'Enter the first and second meter readings.';
  return v === null ? 'Enter both readings.' : v > 0 ? `Used: <b>${v} ${s.unit}</b>` : 'The second reading must be higher than the first.';
};
/* on a metric meter the first reading must be entered before the timer can start */
const calcNeedsStart = s => !s.t0 && s.unit === 'm³' && tgNum(s.start) === null;
function calcPanel(id, target) {
  const s = calcState(id); s.target = target;
  const btn = `<button type="button" class="btn calcbtn" data-act="calcToggle" data-id="${id}">${s.open ? 'Hide gas rate calculator' : 'Gas rate calculator'}</button>`;
  if (!s.open) return btn;
  const unitBtn = (u, label) => `<button type="button" class="${s.unit === u ? 'on' : ''}" data-act="calcSet" data-id="${id}" data-key="unit" data-val="${u}">${label}</button>`;
  return btn + `<div class="calc">
    <div class="f"><span>Meter type</span><div class="seg">${unitBtn('m³', 'Metric (m³)')}${unitBtn('ft³', 'Imperial (ft³)')}</div></div>
    <div class="row" style="align-items:center;margin-bottom:12px">
      <button type="button" id="calcGo-${id}" class="btn ${s.t0 ? 'gold' : ''}" style="flex:0 0 42%;height:64px;font-size:20px;font-weight:700" data-act="calcTimer" data-id="${id}" ${calcNeedsStart(s) ? 'disabled' : ''}>${s.t0 ? 'Stop' : 'Start'}</button>
      <div class="grow" style="text-align:right"><div class="clock" style="font-size:34px;margin:0" data-clock="${esc(id)}">${fmtClock(clockMs(s))}</div></div></div>
    <div class="small" id="calcHint-${id}" style="color:var(--warn);margin:-4px 0 12px">${calcNeedsStart(s) ? 'Enter the first meter reading before you start the timer.' : ''}</div>
    <div class="f"><span>Time taken (min:sec.ms) – filled in when you stop the timer</span>
      <input data-calc="${id}.secs" type="text" inputmode="decimal" value="${esc(s.secs)}" placeholder="00:00.000" autocomplete="off"></div>
    <div class="row"><div class="grow f"><span>First reading (${s.unit})</span><input data-calc="${id}.start" type="text" inputmode="decimal" value="${esc(s.start)}" placeholder="e.g. 4.478" autocomplete="off"></div>
      <div class="grow f"><span>Second reading (${s.unit})</span><input data-calc="${id}.end" type="text" inputmode="decimal" value="${esc(s.end)}" placeholder="e.g. 4.562" autocomplete="off"></div></div>
    <div class="small muted" id="calcVol-${id}" style="margin:-4px 0 12px">${calcVolHtml(s)}</div>
    <div class="calcres" id="calcRes-${id}">${calcResHtml(id)}</div>
    <div class="f" style="margin:12px 0 0"><span>CV value (MJ/m³)</span>
      <input data-calc="${id}.cv" type="text" inputmode="decimal" value="${esc(s.cv)}" autocomplete="off"><small>Natural gas. Saved for next time.</small></div></div>`;
}

/* ---------- field builders ---------- */
const bad = (o, v) => ui.showErr && o.req && !String(v ?? '').trim();
function txt(path, label, o = {}) {
  const v = getP(ui.rec, path) ?? '';
  const el = o.area
    ? `<textarea data-k="${path}" rows="${o.rows || 3}" placeholder="${esc(o.ph || '')}">${esc(v)}</textarea>`
    : `<input data-k="${path}" type="${o.type || 'text'}" ${o.mode ? `inputmode="${o.mode}"` : ''} value="${esc(v)}" placeholder="${esc(o.ph || '')}" autocomplete="off" autocapitalize="${o.cap || 'sentences'}">`;
  return `<label class="f ${bad(o, v) ? 'bad' : ''}" data-f="${path}"><span>${label}${o.req ? ' <b>*</b>' : ''}</span>${el}${o.hint ? `<small>${o.hint}</small>` : ''}</label>`;
}
function choice(path, label, opts, o = {}) {
  const v = getP(ui.rec, path) ?? '';
  const tone = x => (o.yn && /^yes$/i.test(x) ? 'pass' : o.yn && /^no$/i.test(x) ? 'fail' : /^pass$/i.test(x) ? 'pass' : /^fail$/i.test(x) ? 'fail' : /^na$/i.test(x) ? 'na' : '');
  return `<div class="f ${bad(o, v) ? 'bad' : ''}" data-f="${path}"><span>${label}${o.req ? ' <b>*</b>' : ''}</span><div class="seg ${o.wrap ? 'wrap' : ''}">` +
    opts.map(x => `<button type="button" class="${v === x ? 'on ' + tone(x) : ''}" data-k="${path}" data-v="${esc(x)}">${esc(x)}</button>`).join('') + `</div></div>`;
}

/* Manufacturer on the gas safety record: the same brand buttons as the boiler service, plus Other (free text).
   The value is still stored as plain text in "manufacturer", so the PDF and warning notice are unchanged. */
function makeField(path, i) {
  const brands = SVC.MAKE.filter(x => x !== 'Other');
  const v = String(getP(ui.rec, path) ?? '').trim();
  const hit = brands.find(x => x.toLowerCase() === v.toLowerCase());
  const key = ui.rec.id + '.' + i;
  const other = !hit && (v !== '' || (ui.mfrOther && ui.mfrOther[key]));
  const bd = ui.showErr && !v;
  return `<div class="f ${bd ? 'bad' : ''}" data-f="${path}"><span>Manufacturer <b>*</b></span><div class="seg wrap">` +
    brands.map(x => `<button type="button" class="${hit === x ? 'on' : ''}" data-k="${path}" data-v="${esc(x)}">${esc(x)}</button>`).join('') +
    `<button type="button" class="${other ? 'on' : ''}" data-act="mfrOther" data-path="${path}" data-i="${i}">Other</button></div></div>` +
    (other ? txt(path, 'Manufacturer (other)', { req: 1 }) : '');
}

/* "Age unknown" tick on the boiler service: stored as the text "Unknown" so the PDF and sheet show it as is */
const ageUnknown = r => String(r.age || '').trim().toLowerCase() === 'unknown';

/* ---------- screens ---------- */
function render() {
  const v = $('#view'), nav = $('#nav');
  window.scrollTo(0, 0);
  if (ui.view === 'form') { renderForm(v, nav); }
  else {
    ({ home: renderHome, pick: renderPick, customers: renderCustomers, custEdit: renderCustEdit, settings: renderSettings, invoices: renderInvoices, invEdit: renderInvEdit }[ui.view])(v);
    renderTabs(nav);
  }
  paintSync();
  PH.hydrate();
  if (ui.view === 'settings') checkVersion();
}
PH.tidy(records).then(n => { if (n) saveRecords(); }).catch(() => { });
const ICON = {
  rec: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
  cust: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  inv: '<svg viewBox="0 0 24 24"><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/></svg>',
  set: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2L10 21h4l.6-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/></svg>'
};
function renderTabs(nav) {
  nav.className = 'tabs';
  const t = (id, label, ic, on) => `<button data-nav="${id}" class="${on ? 'on' : ''}">${ic}${label}</button>`;
  nav.innerHTML = t('home', 'Records', ICON.rec, ui.view === 'home' || ui.view === 'pick') + t('customers', 'Customers', ICON.cust, ui.view === 'customers' || ui.view === 'custEdit') + t('invoices', 'Invoices', ICON.inv, ui.view === 'invoices' || ui.view === 'invEdit') + t('settings', 'Settings', ICON.set, ui.view === 'settings');
  $('#barSub').textContent = ui.view === 'invoices' || ui.view === 'invEdit' ? 'Invoices' : 'Gas & Legionella records';
}

/* invoice reminder shown on completed records: green once the invoice has been sent, otherwise a reminder */
function invBadge(r) {
  if (r.status !== 'complete' || typeOf(r) === 'warning') return '';
  const inv = invoices.find(i => (i.recIds || []).includes(r.id));
  if (inv && (inv.sent || inv.paid)) return '<span class="badge invd">Invoiced</span>';
  return inv ? '<span class="badge reqinv">Invoice not sent</span>' : '<span class="badge reqinv">Requires invoice</span>';
}
function trialBanner() {
  if (!CLOUD.on) return '';
  const a = CLOUD.access();
  if (a.trial && a.days <= 5) return `<div class="notice">Your free trial ends in ${a.days} day${a.days === 1 ? '' : 's'}. <a href="#" data-nav="settings" style="color:inherit;font-weight:700">Subscribe in Settings</a> to keep going.</div>`;
  if (a.pastDue) return `<div class="notice err">Your last payment failed. Update your card in <a href="#" data-nav="settings" style="color:inherit;font-weight:700">Settings</a>.</div>`;
  return '';
}
function renderHome(v) {
  const missing = !settings.address || !settings.gasSafeReg || !settings.engineerName || !settings.gasSafeId;
  const list = [...records].sort((a, b) => b.updated - a.updated);
  v.innerHTML = `
    <h1>Records</h1>
    ${trialBanner()}
    ${missing ? `<div class="notice">Add the business address, Gas Safe register number and engineer details in <a href="#" data-nav="settings" style="color:inherit;font-weight:700">Settings</a> before issuing certificates.</div>` : ''}
    <button class="btn gold block" data-act="newRec" data-type="gas">+ New gas safety record</button>
    <div style="height:10px"></div>
    <button class="btn gold block" data-act="newRec" data-type="service">+ New boiler service record</button>
    <div style="height:10px"></div>
    <button class="btn gold block" data-act="newRec" data-type="legionella">+ New Legionella risk assessment</button>
    <div style="height:10px"></div>
    <button class="btn gold block" data-act="newRec" data-type="aircon">+ New air conditioning commissioning</button>
    <h2>Recent</h2>
    ${list.length ? list.map(r => `
      <button class="item" data-act="openRec" data-id="${r.id}">
        <div class="row sp"><span class="t">${esc(r.customer.name || 'No customer yet')}</span><span class="badges"><span class="badge ${r.status}">${r.status}</span>${invBadge(r)}</span></div>
        <div class="s">${esc((r.jobAddress || '').split('\n')[0] || 'No address yet')}</div>
        <div class="s">${FORM_SHORT[typeOf(r)]} · ${esc(r.ref)} · ${ukDate(r.inspectionDate)}${r._dirty ? ' · not synced' : ''}</div>
      </button>`).join('') : `<div class="empty">No records yet.<br>Tap one of the buttons above to start.<br>You can do several forms for one customer in a single visit.</div>`}`;
}

function renderPick(v) {
  const pk = ui.pick, T = pk.types, n = Object.values(T).filter(Boolean).length;
  const opt = (k, title, sub) => `<button class="item tog ${T[k] ? 'on' : ''}" data-act="pickToggle" data-t="${k}"><span class="box"></span><span><span class="t">${title}</span><span class="s" style="display:block">${sub}</span></span></button>`;
  v.innerHTML = `
    <h1>Forms for this visit</h1>
    <p class="small muted" style="margin-top:0">Tick everything you are doing at this property today. The customer and address are entered once and shared across the forms, and you get a separate PDF for each.</p>
    ${pk.customer ? `<div class="card"><div class="t">${esc(pk.customer.name)}</div></div>` : ''}
    ${opt('gas', 'Gas safety record', 'Landlord gas safety check')}
    ${opt('service', 'Boiler service record', 'Service or repair of a gas boiler')}
    ${opt('legionella', 'Legionella risk assessment', 'Hot and cold water system checks')}
    ${opt('aircon', 'Air conditioning commissioning', 'Install and commissioning report for an AC system')}
    ${T.gas && !T.service ? `<div class="notice">Doing a gas safety check? Tick <b>Boiler service record</b> as well to complete both forms in one go – the boiler details from the gas check are copied across.</div>` : ''}
    <button class="btn block" data-act="pickAll">Do all three: gas check, boiler service &amp; Legionella</button>
    <div style="height:10px"></div>
    <button class="btn gold block" data-act="pickGo" ${n ? '' : 'disabled'}>${n > 1 ? `Start ${n} forms (${n} PDFs)` : 'Start'}</button>
    <div style="height:10px"></div>
    <button class="btn ghost block" data-act="pickCancel">Cancel</button>`;
}

function renderCustomers(v) {
  v.innerHTML = `
    <h1>Customers</h1>
    <input class="search" id="custSearch" placeholder="Search name, phone or address" value="${esc(ui.search)}">
    <div class="seg custsort" style="margin-bottom:12px">${[['az', 'A–Z'], ['used', 'Most used'], ['fav', '♥ Favourites']].map(([k, l]) => `<button type="button" data-act="custSort" data-s="${k}" class="${custSort() === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div id="custList"></div>
    <button class="btn gold fab" data-act="newCust">+ Customer</button>`;
  paintCustList();
}
function custSort() { try { return localStorage.getItem('omb_custsort') || 'az'; } catch (e) { return 'az'; } }
const custUses = c => records.filter(r => r.customerId === c.id).length;
/* favourites first, then alphabetical – used by the customer drop-downs */
const custAlpha = (a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0) || a.name.localeCompare(b.name);
function paintCustList() {
  const q = ui.search.toLowerCase(), mode = custSort();
  const uses = {}; customers.forEach(c => { uses[c.id] = custUses(c); });
  let l = customers.filter(c => (mode !== 'fav' || c.fav) && (!q || [c.name, c.phone, c.email, c.billing, ...(c.properties || [])].join(' ').toLowerCase().includes(q)));
  l.sort(mode === 'used' ? (a, b) => uses[b.id] - uses[a.id] || a.name.localeCompare(b.name) : (a, b) => a.name.localeCompare(b.name));
  $('#custList').innerHTML = l.length ? l.map(c => `
    <div class="item crow">
      <button type="button" class="cmain" data-act="editCust" data-id="${c.id}">
        <div class="t">${esc(c.name)}</div>
        <div class="s">${esc([c.phone, c.email].filter(Boolean).join(' · ') || 'No contact details')}${mode === 'used' ? ` · ${uses[c.id]} form${uses[c.id] === 1 ? '' : 's'}` : ''}</div>
      </button>
      <button type="button" class="heart ${c.fav ? 'on' : ''}" data-act="favCust" data-id="${c.id}" aria-label="${c.fav ? 'Remove from favourites' : 'Add to favourites'}">${c.fav ? '♥' : '♡'}</button>
    </div>`).join('') : `<div class="empty">${!customers.length ? 'No customers yet. Add one here, or they are saved automatically when you complete a form.' : mode === 'fav' && !q ? 'No favourites yet. Tap the ♡ beside a customer to add one.' : 'No matches.'}</div>`;
}

function renderCustEdit(v) {
  const c = ui.cust;
  v.innerHTML = `
    <h1>${c._new ? 'New customer' : 'Edit customer'}</h1>
    <div class="card">
      <label class="f"><span>Name <b>*</b></span><input data-c="name" value="${esc(c.name)}" autocomplete="off"></label>
      <label class="f"><span>Phone</span><input data-c="phone" type="tel" inputmode="tel" value="${esc(c.phone)}"></label>
      <label class="f"><span>Email</span><input data-c="email" type="email" inputmode="email" autocapitalize="none" value="${esc(c.email)}"></label>
      <label class="f"><span>Billing address</span><textarea data-c="billing" rows="3">${esc(c.billing)}</textarea></label>
      <label class="f"><span>Property addresses (one per line)</span><textarea data-c="props" rows="3" placeholder="Properties you inspect for this customer">${esc((c.properties || []).join('\n'))}</textarea></label>
    </div>
    <button class="btn gold block" data-act="saveCust">Save customer</button>
    ${c._new ? '' : `<div style="height:10px"></div><button class="btn block" data-act="recForCust">Start forms for this customer</button>
    <div style="height:10px"></div><button class="btn danger block" data-act="delCust">Delete customer</button>`}
    <div style="height:10px"></div><button class="btn ghost block" data-nav="customers">Back</button>`;
}

const APP_VERSION = 'v5';   // keep the same as CACHE in sw.js
async function checkVersion() {
  const el = $('#verNew'); if (!el) return;
  try {
    const t = await (await fetch('sw.js?x=' + Date.now(), { cache: 'no-store' })).text();
    const m = t.match(/omb-gas-(v\d+)/); el.textContent = m ? m[1] : 'unknown';
    if (m && m[1] !== APP_VERSION) el.style.color = 'var(--warn)';
  } catch (e) { el.textContent = 'offline'; }
}
async function forceUpdate() {
  toast('Updating…');
  try { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r => r.unregister())); } catch (e) { }
  try { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch (e) { }
  location.replace(location.pathname + '?u=' + Date.now());
}
function renderSettings(v) {
  const f = (k, l, o = {}) => `<label class="f"><span>${l}</span>${o.area ? `<textarea data-s="${k}" rows="3">${esc(settings[k])}</textarea>` : `<input data-s="${k}" value="${esc(k === 'sortCode' ? fmtSort(settings[k]) : settings[k])}" ${o.type ? `type="${o.type}"` : ''} ${o.mode ? `inputmode="${o.mode}"` : ''} autocomplete="off" ${o.maxlen ? `maxlength="${o.maxlen}"` : ''} ${o.cap ? `autocapitalize="${o.cap}"` : ''}>`}${o.hint ? `<small>${o.hint}</small>` : ''}</label>`;
  v.innerHTML = `
    <h1>Settings</h1>
    <h2>Business (printed on every certificate)</h2>
    <div class="card">
      ${f('businessName', 'Business name')}
      ${f('address', 'Address', { area: true })}
      ${f('phone', 'Telephone', { type: 'tel' })}
      ${f('email', 'Email', { type: 'email', cap: 'none' })}
      ${f('gasSafeReg', 'Gas Safe Register number')}
    </div>
    <h2>Your branding</h2>
    <div class="card">
      <div style="background:#fff;border-radius:10px;padding:10px;text-align:center;margin-bottom:12px"><img src="${settings.logo || placeholderLogo(settings.businessName)}" alt="Company logo" style="max-height:90px;max-width:100%"></div>
      <label class="btn block" style="text-align:center">${settings.logo ? 'Change company logo' : 'Upload company logo'}<input id="coLogo" type="file" accept="image/*" hidden></label>
      ${settings.logo ? '<div style="height:8px"></div><button class="btn block" data-act="rmCoLogo">Remove logo</button>' : ''}
      <div class="hint" style="margin:10px 0 4px">Your logo appears at the top of the app and on every PDF.</div>
      <label class="f"><span>Accent colour (app buttons and highlights)</span><input type="color" id="accent" value="${/^#[0-9a-f]{6}$/i.test(settings.accent) ? settings.accent : '#c9a24b'}" style="width:100%;height:44px;border:0;background:none"></label>
      ${f('refPrefix', 'Record number prefix', { cap: 'characters', hint: 'Up to 5 letters, for example ABC gives ABC-20261004-01.' })}
    </div>
    <h2>Gas Safe logo</h2>
    <div class="card">
      ${`<div style="background:#fff;border-radius:10px;padding:10px;text-align:center;margin-bottom:12px"><img src="${settings.gasSafeLogo || 'gassafe.png'}" alt="Gas Safe logo" style="max-height:70px;max-width:100%"></div>`}
      <label class="btn block" style="text-align:center">Use a different logo image<input id="gsLogo" type="file" accept="image/*" hidden></label>
      ${settings.gasSafeLogo ? '<div style="height:8px"></div><button class="btn block" data-act="rmLogo">Back to standard Gas Safe logo</button>' : ''}
    </div>
    <h2>Engineer</h2>
    <div class="card">
      ${f('engineerName', 'Engineer name')}
      ${f('gasSafeId', 'Gas Safe ID card number')}
    </div>
    <h2>Prices (used on invoices)</h2>
    <div class="card">
      ${f('priceGas', 'Gas safety record (£)', { mode: 'decimal' })}
      ${f('priceSvc', 'Boiler service (£)', { mode: 'decimal' })}
      ${f('priceLeg', 'Legionella risk assessment (£)', { mode: 'decimal' })}
      ${f('priceAc', 'Air conditioning commissioning (£)', { mode: 'decimal' })}
    </div>
    <h2>Combined service discount</h2>
    <div class="card">
      <div class="f"><span>Discount type</span><div class="seg">
        <button type="button" class="${settings.discType !== '%' ? 'on' : ''}" data-act="discType" data-t="£">£ off the total</button>
        <button type="button" class="${settings.discType === '%' ? 'on' : ''}" data-act="discType" data-t="%">% off the total</button></div></div>
      ${f('discValue', settings.discType === '%' ? 'Discount (%)' : 'Discount (£)', { mode: 'decimal', hint: 'Taken off automatically when two or three services are done on the same visit. You can still change it on each invoice.' })}
      <p class="small muted" style="margin:0">${(() => { const a = numOf(settings.priceGas), b = numOf(settings.priceSvc), c = numOf(settings.priceLeg), all = a + b + c; if (!all) return 'Set the prices above to see an example.'; const d = x => Math.min(settings.discType === '%' ? r2(x * numOf(settings.discValue) / 100) : numOf(settings.discValue), x); return `Example – all three services: ${money(all)} − ${money(d(all))} = <b style="color:var(--txt)">${money(all - d(all))}</b>`; })()}</p>
    </div>
    <h2>Invoice details</h2>
    <div class="card">
      ${f('invPrefix', 'Invoice number prefix', { cap: 'characters', hint: 'For example INV-. Leave blank for numbers only.' })}
      ${f('invNext', 'Next invoice number', { mode: 'numeric', hint: 'Start at 1 or any number you like. It goes up by one each time an invoice is created.' })}
      ${f('invDigits', 'Digits in the number', { mode: 'numeric', hint: '3 gives 001, 4 gives 0001, 1 gives no leading zeros.' })}
      <div class="notice" style="margin:0 0 14px">Next invoice will be numbered <b id="invPreview">${esc(invNumberFor(settings.invNext))}</b></div>
      ${f('payDays', 'Payment terms (days)', { mode: 'numeric' })}
      <button type="button" class="item tog ${settings.vatReg === 'Yes' ? 'on' : ''}" data-act="vatReg"><span class="box"></span><span><span class="t">VAT registered</span><span class="s" style="display:block">${settings.vatReg === 'Yes' ? 'VAT is added to invoices' : 'Tick if the business is VAT registered – VAT will then be added to invoices'}</span></span></button>
      ${settings.vatReg === 'Yes' ? f('vatRate', 'VAT rate (%)', { mode: 'decimal' }) + f('vatNumber', 'VAT number') + '<p class="small muted">Enter your prices above <b>excluding VAT</b>. VAT is added on the invoice and shown as its own line. The VAT number is printed on the invoice, which is then headed “VAT Invoice”.</p>' : ''}
      ${f('invFooter', 'Message at the bottom of invoices', { area: true })}
    </div>
    <h2>Bank details (printed on invoices)</h2>
    <div class="card">
      <p class="small muted" style="margin-top:0">Anything filled in here is printed on unpaid invoices so the customer can pay by bank transfer, using the invoice number as the payment reference. Leave blank to print nothing.</p>
      ${f('bankName', 'Bank')}
      ${f('accName', 'Account name')}
      ${f('sortCode', 'Sort code', { mode: 'numeric', maxlen: 8, hint: 'Six digits, for example 20-01-09' })}
      ${f('accNo', 'Account number', { mode: 'numeric' })}
    </div>
    <h2>Backup</h2>
    <div class="card">
      <p class="small muted" style="margin-top:0">Customers and records are stored on this phone. Keep a copy somewhere safe.</p>
      <button class="btn block" data-act="expCust">Export customers (spreadsheet)</button>
      <div style="height:8px"></div>
      <button class="btn block" data-act="expInv">Export invoices (spreadsheet)</button>
      <div style="height:8px"></div>
      <button class="btn block" data-act="expAll">Back up everything</button>
      <div style="height:8px"></div>
      <label class="btn block ghost" style="text-align:center">Restore from a backup<input id="restoreFile" type="file" accept=".json,application/json" hidden></label>
    </div>
    <h2>App version</h2>
    <div class="card">
      <p class="small muted" style="margin-top:0">This phone is running <b id="verHere" style="color:var(--txt)">${APP_VERSION}</b> · newest online: <b id="verNew" style="color:var(--txt)">checking…</b></p>
      <button class="btn block" data-act="forceUpdate">Update app now</button>
      <p class="small muted" style="margin-bottom:0">Clears the saved copy of the app and reloads the newest version. Your records, customers and photos are not touched.</p>
    </div>
    ${CLOUD.on ? accountCard() : ''}`;
}
function accountCard() {
  const a = CLOUD.access(), sub = CLOUD.sub();
  const plan = !sub ? 'Checking…' : a.paid ? (a.pastDue ? 'Subscribed – last payment failed, please update your card' : 'Subscribed') : a.trial ? `Free trial – ${a.days} day${a.days === 1 ? '' : 's'} left` : 'Not subscribed';
  return `<h2>Account</h2><div class="card">
      <p class="small" style="margin-top:0">Signed in as <b>${esc(CLOUD.email())}</b><br><span class="muted">${esc(plan)}</span></p>
      <button class="btn block" data-act="syncNow">Sync now</button>
      <p class="small muted" id="syncMsg">${esc(CLOUD.st.msg)}</p>
      <button class="btn block" data-act="billing">${a.paid ? 'Manage subscription' : 'Subscribe'}</button>
      <div style="height:8px"></div><button class="btn block ghost" data-act="logout">Log out</button>
      <p class="small muted" style="margin-bottom:0">Everything you enter is saved on this phone first, so it works with no signal, and syncs to your account whenever you are online.</p>
    </div>`;
}

/* ---------- the form wizard ---------- */
function renderForm(v, nav) {
  const r = ui.rec, s = ui.step, steps = stepsOf(r), t = typeOf(r);
  const { seq, pos } = seqPos(), job = jobRecs();
  const total = seq ? seq.length : steps.length;
  const nextRec = seq && pos < seq.length - 1 ? seq[pos + 1].rec : null;
  $('#barSub').textContent = r.ref;
  const tag = job ? `<div class="formtag">${esc(FORM_NAME[t])} · form ${job.indexOf(r) + 1} of ${job.length}</div>` : '';
  const prog = `<div class="prog">${Array.from({ length: total }, (_, i) => `<i class="${i <= pos ? 'on' : ''}"></i>`).join('')}</div>${tag}
    <div class="steptitle"><h1>${steps[s]}</h1><span>Step ${pos + 1} of ${total}</span></div>`;
  const last = steps.length - 1;
  let body = '';
  if (s === 0) body = stepCustomer();
  else if (s === last) body = stepReview();
  else if (s === last - 1) body = (job ? `<div class="notice">This sign-off is used on all ${job.length} forms in this visit.</div>` : '') + stepSign();
  else if (t === 'legionella') body = [null, legSystem, legTemps, legTanks, legRisk, legFindings][s]();
  else if (t === 'warning') body = [null, warnFaults][s]();
  else if (t === 'aircon') body = [null, acSystem, acRefrig][s]();
  else if (t === 'service') body = [null, svcBoiler, svcChecks, svcSafety, svcOperating, svcFinish][s]();
  else body = [null, stepAppliances, stepInstall, stepAlarms, stepDefects, stepNext][s]();
  v.innerHTML = prog + body;
  if (s === last - 1) initSigs();
  nav.className = 'tabs wiz';
  const more = t === 'gas' && s === 1 && ui.appTab < (+r.applianceCount || 1) - 1;
  const label = more ? 'Next appliance' : nextRec && nextRec.id !== r.id ? 'Next: ' + FORM_SHORT[typeOf(nextRec)].toLowerCase() : 'Next';
  nav.innerHTML = `<button class="btn" data-act="back">${pos === 0 ? 'Save & exit' : 'Back'}</button>` +
    (pos === total - 1 ? '' : `<button class="btn gold" data-act="next">${label}</button>`);
}
/* ---------- Danger / Do Not Use warning notice steps ---------- */
function warnFaults() {
  const r = ui.rec, n = +r.faultCount || 1;
  const w = records.find(x => x.id === r.warnFor);
  return `<div class="notice err">Complete one section for each appliance or installation classed as Immediately Dangerous (ID) or At Risk (AR).${w ? ' The boiler details and the failed checks from the service have been filled in for you.' : ''}</div>
  <div class="card">${choice('faultCount', 'How many faults are there to record?', ['1', '2', '3', '4'], { req: 1 })}</div>
  ${Array.from({ length: n }, (_, i) => {
    const f = r.faults[i], P = k => `faults.${i}.${k}`;
    return `<h2>Fault ${i + 1}</h2><div class="card">
      ${choice(P('location'), 'Where is the appliance located?', SVC.LOCATION, { req: 1, wrap: 1 })}
      ${f.location === 'Other' ? txt(P('locationOther'), 'Describe the location', { req: 1 }) : ''}
      ${choice(P('type'), 'Appliance type', WARN.TYPES, { req: 1, wrap: 1 })}
      ${txt(P('make'), 'Make', { req: 1 })}
      ${txt(P('model'), 'Model', { req: 1 })}
      ${txt(P('serial'), 'Serial number', { req: 1, cap: 'characters' })}
      ${choice(P('cls'), 'Has the appliance / installation been assessed as Immediately Dangerous (ID) or At Risk (AR)?', WARN.CLS, { req: 1 })}
      <p class="small muted" style="margin:-8px 0 14px"><b>ID</b> Immediately Dangerous · <b>AR</b> At Risk</p>
      ${choice(P('riddor'), 'Is this required to be notified to the Health & Safety Executive via RIDDOR?', ['YES', 'NO'], { req: 1 })}
      ${f.riddor === 'YES' ? choice(P('riddorType'), 'RIDDOR reporting', WARN.RIDDOR, { req: 1, wrap: 1 }) : ''}
      ${txt(P('notes'), 'Reasons for the classification and any additional notes', { req: 1, area: 1, rows: 4 })}
      ${PH.field(r, P('photos'))}
    </div>`;
  }).join('')}
  ${w ? `<button class="btn danger block" data-act="rmWarn">Remove this warning notice</button>` : ''}`;
}
/* ----- choosing an existing customer: favourites / recent / everyone ----- */
function applyCust(id) {
  const c = customers.find(x => x.id === id), r = ui.rec;
  r.customerId = c ? c.id : '';
  r.customer = c ? { name: c.name, phone: c.phone, email: c.email, billing: c.billing } : { name: '', phone: '', email: '', billing: '' };
  if (c && (c.properties || []).length === 1) r.jobAddress = c.properties[0];
  persistRec(r); const y = window.scrollY; render(); window.scrollTo(0, y);
}
function recentCusts(n) {
  const last = {}; records.forEach(r => { if (r.customerId && (last[r.customerId] || 0) < (r.updated || 0)) last[r.customerId] = r.updated || 0; });
  return customers.filter(c => last[c.id]).sort((a, b) => last[b.id] - last[a.id]).slice(0, n);
}
function custPicker(r) {
  if (!customers.length) return '';
  const favs = customers.filter(c => c.fav).sort((a, b) => a.name.localeCompare(b.name));
  const tab = ui.custTab || (favs.length ? 'fav' : 'recent');
  const row = c => `<button type="button" class="item cpick ${c.id === r.customerId ? 'on' : ''}" data-act="pickCustId" data-id="${c.id}"><div class="t">${c.fav ? '<span style="color:var(--bad)">♥</span> ' : ''}${esc(c.name)}</div><div class="s">${esc((c.properties || [])[0] || c.billing || c.phone || '')}</div></button>`;
  let body;
  if (tab === 'all') body = `<select data-act="pickCust"><option value="">— New customer —</option>${[...customers].sort(custAlpha).map(c => `<option value="${c.id}" ${c.id === r.customerId ? 'selected' : ''}>${c.fav ? '♥ ' : ''}${esc(c.name)}</option>`).join('')}</select>`;
  else { const l = tab === 'fav' ? favs : recentCusts(6); body = l.length ? l.map(row).join('') : `<p class="small muted" style="margin:4px 0 10px">${tab === 'fav' ? 'No favourites yet – tap the ♡ beside a customer on the Customers tab.' : 'No recent customers yet.'}</p>`; }
  return `<div class="f"><span>Existing customer</span>
    <div class="seg" style="margin-bottom:10px">${[['fav', '♥ Favourites'], ['recent', 'Recent'], ['all', 'All']].map(([k, l]) => `<button type="button" data-act="custTab" data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${body}
    ${r.customerId ? `<button type="button" class="btn ghost block" data-act="pickCustId" data-id="" style="margin-top:4px">Clear – enter a new customer instead</button>` : ''}</div>`;
}
function stepCustomer() {
  const r = ui.rec, cu = customers.find(c => c.id === r.customerId);
  return `
    ${ui.job ? `<div class="notice">These customer and property details are used on all ${ui.job.length} forms in this visit.</div>` : ''}
    ${custPicker(r)}
    <div class="card">
      ${txt('customer.name', 'Client name', { req: 1 })}
      ${txt('customer.phone', 'Telephone', { type: 'tel', mode: 'tel' })}
      ${txt('customer.email', 'Email (to send the PDF)', { type: 'email', mode: 'email', cap: 'none' })}
      ${txt('customer.billing', 'Client / billing address', { area: 1, rows: 3 })}
    </div>
    <h2>Property inspected</h2>
    ${cu && (cu.properties || []).length ? `<div class="chips">${cu.properties.map((p, i) => `<button class="chip" data-act="pickProp" data-i="${i}">${esc(p.split('\n')[0])}</button>`).join('')}</div>` : ''}
    <div class="card">
      ${txt('jobAddress', 'Job address', { area: 1, rows: 3, req: 1 })}
      <button class="btn block" data-act="sameAddr">Same as billing address</button>
    </div>
    <div class="card">${txt('inspectionDate', isLeg(r) ? 'Date of assessment' : isAc(r) ? 'Date of commissioning' : 'Date of inspection', { type: 'date' })}</div>`;
}

/* Worcester Bosch boilers also get an optional fan speed reading */
const isWorcester = v => /worcester/i.test(String(v || ''));
function stepAppliances() {
  const r = ui.rec, n = +r.applianceCount || 1, i = Math.min(ui.appTab, n - 1), a = r.appliances[i];
  const P = k => `appliances.${i}.${k}`;
  const issues = validate(r);
  const done = idx => !issues.some(x => x.step === 1 && x.app === idx);
  return `
    ${choice('applianceCount', 'Number of appliances covered by this certificate', OPT.count, { req: 1 })}
    <div class="pills">${Array.from({ length: n }, (_, k) => `<button class="pill ${k === i ? 'on' : ''} ${done(k) ? 'done' : ''}" data-act="appTab" data-i="${k}">Appliance ${k + 1}</button>`).join('')}</div>
    <h2>Appliance ${i + 1}</h2>
    <div class="card">
      ${choice(P('location'), 'Location of appliance', OPT.location, { req: 1, wrap: 1 })}
      ${a.location === 'Other' ? txt(P('locationOther'), 'Describe location', { req: 1 }) : ''}
      ${choice(P('type'), 'Appliance type', OPT.type, { req: 1, wrap: 1 })}
      ${makeField(P('manufacturer'), i)}
      ${txt(P('model'), 'Model', { req: 1 })}
      ${txt(P('gc'), 'Gas Council number', { cap: 'characters' })}
      ${choice(P('ownership'), 'Who owns the appliance?', OPT.ownership, { req: 1, wrap: 1 })}
      ${choice(P('flue'), 'Flue type', OPT.flue, { req: 1, wrap: 1 })}
      ${choice(P('serviced'), 'Serviced at the same time?', OPT.yn, { req: 1 })}
    </div>
    <h2>Inspection</h2>
    <div class="card">
      ${choice(P('test'), 'Which tests can be performed?', OPT.test, { req: 1, wrap: 1 })}
      ${a.test && a.test !== 'Gas Rate' ? txt(P('op'), 'Operating pressure (mbar)', { req: 1, mode: 'decimal', hint: 'Working pressure at the burner or appliance inlet' }) : ''}
      ${isWorcester(a.manufacturer) ? txt(P('fanPress'), 'Fan pressure (mbar)', { mode: 'decimal', hint: 'Worcester Bosch – optional. Enter it as 4.62 and it is recorded as -4.62 mbar' }) : ''}
      ${a.test && a.test !== 'Operating Pressure' ? txt(P('hi'), 'Gas rate / heat input (kW)', { req: 1, mode: 'decimal' }) + calcPanel('app' + i, P('hi')) : ''}
      ${choice(P('vent'), 'Ventilation satisfactory?', OPT.pfn, { req: 1 })}
      ${choice(P('terminal'), 'Visual condition of flue and terminal', OPT.pfn, { req: 1 })}
      ${choice(P('flueOp'), 'Flue operation checks', OPT.pfn, { req: 1 })}
      ${choice(P('safety'), 'Safety devices operating correctly?', OPT.pfn, { req: 1 })}
    </div>
    <h2>Combustion analyser (if used)</h2>
    <div class="card">
      <div class="row"><div class="grow">${txt(P('coMin'), 'CO ppm – min', { mode: 'decimal' })}</div><div class="grow">${txt(P('coMax'), 'CO ppm – max', { mode: 'decimal' })}</div></div>
      <div class="row"><div class="grow">${txt(P('co2Min'), 'CO2 % – min', { mode: 'decimal' })}</div><div class="grow">${txt(P('co2Max'), 'CO2 % – max', { mode: 'decimal' })}</div></div>
      <div class="row"><div class="grow">${txt(P('ratioMin'), 'Ratio – min', { mode: 'decimal' })}</div><div class="grow">${txt(P('ratioMax'), 'Ratio – max', { mode: 'decimal' })}</div></div>
    </div>
    <h2>Result</h2>
    <div class="card">${choice(P('safe'), 'Is this appliance safe to use?', OPT.yn, { req: 1 })}</div>`;
}

function stepInstall() {
  return `<div class="card">
    ${choice('installPipe', 'Visual inspection of gas installation pipework', OPT.pfn, { req: 1 })}
    ${choice('supplyPipe', 'Visual inspection of gas supply pipework', OPT.pfn, { req: 1 })}
    ${choice('ecv', 'Is ECV access satisfactory?', OPT.pf, { req: 1 })}
    ${choice('bonding', 'Is the protective equipotential bonding satisfactory?', OPT.pf, { req: 1 })}
  </div>
  <h2>Gas tightness test</h2>
  <div class="card">
    <p class="small muted" style="margin-top:0">Carry out the test and record the readings first, then choose the result.</p>
    ${tightFields(!/access|^NA$/i.test(ui.rec.tightness))}
    ${choice('tightness', 'Is the installation gas tight?', OPT.tight, { req: 1, wrap: 1 })}
  </div>`;
}
function stepAlarms() {
  const r = ui.rec;
  return `<div class="card">
    ${choice('coAlarm', 'Are approved CO alarms fitted?', OPT.yn, { req: 1 })}
    <p class="small muted" style="margin:-8px 0 14px">See the Smoke and Carbon Monoxide Alarm (Amendment) Regulations 2022.</p>
    ${r.coAlarm === 'Yes' ? choice('coAlarmTest', 'Do all CO alarms work correctly and are they within date?', OPT.pf, { req: 1 }) : ''}
    ${choice('smokeAlarm', 'Smoke alarm present?', OPT.yn, { req: 1 })}
    ${r.smokeAlarm === 'Yes' ? choice('smokeAlarmTest', 'Do all smoke alarms work correctly and are they within date?', OPT.pf, { req: 1 }) : ''}
  </div>`;
}
function stepDefects() {
  const r = ui.rec, n = +r.defectCount || 0;
  return `<div class="card">${choice('defectCount', 'How many defects are there to note?', OPT.defectCount, { req: 1 })}</div>
  ${Array.from({ length: n }, (_, i) => `<h2>Defect ${i + 1}</h2><div class="card">
    ${txt(`defects.${i}.text`, 'Identified defect', { req: 1, area: 1, rows: 3 })}
    ${choice(`defects.${i}.cls`, 'Classification', OPT.cls, { req: 1 })}
    ${txt(`defects.${i}.action`, 'Remedial action taken', { req: 1, area: 1, rows: 3 })}
    ${PH.field(r, `defects.${i}.photos`)}</div>`).join('')}
  ${n ? `<p class="small muted"><b>ID</b> Immediately Dangerous · <b>AR</b> At Risk · <b>NCS</b> Not to Current Standards</p>` : ''}`;
}
function stepNext() {
  return `${WARN.neededFor(ui.rec) ? '<div class="notice err">Something on this check has failed, so the record will be stamped FAIL – DO NOT USE and a Danger / Do Not Use Warning Notice will be needed. You will be asked to fill it in at the review step.</div>' : ''}<div class="card">
    ${txt('renewal', 'Next safety check due by', { type: 'date', req: 1, hint: 'Pre-filled as 12 months from today.' })}
    ${txt('notes', 'Engineer notes / other work carried out', { area: 1, rows: 5 })}
  </div>`;
}
function stepSign() {
  const r = ui.rec;
  const sig = (key, label, req) => `<div class="f ${ui.showErr && req && !r[key] ? 'bad' : ''}"><span>${label}${req ? ' <b>*</b>' : ''}</span>
    <div class="sigwrap"><canvas data-sig="${key}"></canvas><div class="line"></div><div class="ph" data-ph="${key}">Sign here</div></div>
    <div class="sigactions"><span class="small muted">Use your finger</span><button data-act="sigClear" data-key="${key}">Clear</button></div></div>`;
  return `
    <div class="card">
      <p class="small muted" style="margin-top:0">Engineer: <b style="color:var(--txt)">${esc(settings.engineerName || '(set in Settings)')}</b>${isLeg(r) || isAc(r) ? '' : ` · Gas Safe ID <b style="color:var(--txt)">${esc(settings.gasSafeId || '(set in Settings)')}</b>`}</p>
      ${sig('engineerSig', "Engineer's signature", true)}
    </div>
    <div class="card">
      ${choice('customerPresent', 'Was the customer present to sign?', OPT.yn, { req: 1 })}
      ${r.customerPresent === 'No' ? '<p class="small muted">The PDF will show “No-one present at time of visit”.</p>' : ''}
      ${r.customerPresent === 'Yes' ? txt('customerName', 'Client name', { req: 1 }) + sig('customerSig', 'Client signature', true) : ''}
    </div>`;
}
function reviewIssues(m) {
  const out = [];
  m.forEach((rec, k) => validate(rec).forEach(x => {
    const n = stepsOf(rec).length;
    if (m.length > 1 && ((k > 0 && x.step === 0) || (k < m.length - 1 && x.step >= n - 2))) return;   // shared steps are checked on the form that holds them
    out.push({ ...x, rec });
  }));
  return out;
}
function recSummary(r) {
  const dl = (k, v) => `<dt>${k}</dt><dd>${esc(v || '–')}</dd>`;
  const n = +r.applianceCount || 1, t = typeOf(r);
  let rows = dl('Record', r.ref) + dl('Date', ukDate(r.inspectionDate)) + dl('Client', r.customer.name) + dl('Property', r.jobAddress);
  if (t === 'legionella') rows += dl('Temperatures', LEG.temps(r).map(x => `${x.label}: ${x.n === null ? '?' : x.n + '°C'} – ${x.pass === null ? '?' : x.pass ? 'pass' : 'FAIL'}`).join('\n')) + dl('Overall risk', r.overall) + dl('Risks / defects', String(r.defects.length)) + dl('Next assessment', ukDate(r.renewal));
  else if (t === 'aircon') rows += dl('System', [AC.makeText(r), r.indoorModel].filter(Boolean).join(' ')) + dl('Gas', [AC.gasText(r), r.charge ? r.charge + ' g' : ''].filter(Boolean).join(' · ')) + dl('Pressure / vacuum', [r.pressure ? r.pressure + ' bar' : '', r.vacuum ? r.vacuum + ' hrs' : ''].filter(Boolean).join(' · ')) + dl('Drain / electrical', `${r.drain || '?'} / ${r.electrical || '?'}`);
  else if (t === 'warning') rows += dl('Faults', r.faults.slice(0, +r.faultCount || 1).map((f, i) => `${i + 1}. ${f.type || '?'} – ${f.cls || '?'}${f.riddor === 'YES' ? ' (RIDDOR)' : ''}`).join('\n'));
  else if (t === 'service') rows += dl('Boiler', [SVC.makeText(r), r.model].filter(Boolean).join(' ')) + dl('Visit', r.reason) + dl('Checks failed', String(SVC.failCount(r))) + dl('Safe to use', r.safe) + dl('Warning notice', r.warning) + dl('Next service', ukDate(r.renewal));
  else rows += dl('Appliances', r.appliances.slice(0, n).map((a, i) => `${i + 1}. ${a.type || '?'} – ${a.safe === 'Yes' ? 'safe' : a.safe === 'No' ? 'NOT SAFE' : '?'}`).join('\n')) + dl('Defects', r.defectCount) + dl('Next check', ukDate(r.renewal));
  return rows;
}
/* ---- "Ready to send" card: tick the documents to send, then one button ---- */
const selOn = id => !(ui.sel && ui.sel[id] === false);
let _invBusy = false;
async function ensureInvPdf(m) {
  const inv = invForVisit(m);
  if (!inv || _invBusy || (ui.invPdf && ui.invPdf.id === inv.id)) return;
  _invBusy = true;
  try { ui.invPdf = { id: inv.id, blob: await buildInvPdf(inv, settings), name: invFileName(inv) }; } catch (err) { console.warn(err); } finally { _invBusy = false; }
}
function sendCard(m) {
  const inv = invForVisit(m), bm = billable(m);
  const row = (id, title, sub, extra) => `<div class="row" style="margin-bottom:10px;align-items:stretch"><button type="button" class="item tog grow ${selOn(id) ? 'on' : ''}" style="margin:0;min-width:0" data-act="selToggle" data-id="${id}"><span class="box"></span><span><span class="t">${title}</span><span class="s" style="display:block">${sub}</span></span></button>${extra}</div>`;
  const side = (act, id, label) => `<button type="button" class="btn" style="flex:none;min-width:76px" data-act="${act}" ${id ? `data-id="${id}"` : ''}>${label}</button>`;
  const recRows = m.map(x => row(x.id, esc(FORM_NAME[typeOf(x)]), 'Signed PDF ready', side('viewPdf', x.id, 'Open'))).join('');
  let invRow = '', paid = '';
  if (inv) {
    const T = invTotals(inv);
    invRow = row(inv.id, 'Invoice ' + esc(inv.number), `${money(T.total)} · <span class="badge ${invStatus(inv)}">${invStatus(inv)}</span>`, side('invFromVisit', '', 'Edit'));
    if (selOn(inv.id)) paid = `<button type="button" class="item tog ${inv.paid ? 'on' : ''}" data-act="invPaidVisit" style="margin-bottom:10px"><span class="box"></span><span><span class="t">Paid</span><span class="s" style="display:block">${inv.paid ? 'Paid ' + ukDate(inv.paidDate) + ' – PAID stamp on the invoice' : 'Tick if paid on the day – adds a PAID stamp'}</span></span></button>${methodSeg(inv)}`;
  } else if (bm.length) invRow = `<button class="btn block" style="margin-bottom:10px" data-act="invFromVisit">Add an invoice</button>`;
  const n = m.filter(x => selOn(x.id)).length + (inv && selOn(inv.id) ? 1 : 0);
  return `<div class="card pdfok" style="margin-top:12px"><div style="font-weight:700;margin-bottom:10px">Ready to send</div>
    ${recRows}${invRow}${paid}
    <button class="btn gold block" data-act="sendSel" ${n ? '' : 'disabled'}>${n ? `Email / share ${n} document${n > 1 ? 's' : ''}` : 'Tick something to send'}</button>
    <button class="btn block" style="margin-top:10px" data-act="mailSel" ${n ? '' : 'disabled'}>Email with address &amp; subject filled in</button>
    <p class="small muted" style="margin:6px 0 0">Opens your email app with the customer's address, subject and message ready. The PDFs are saved to your phone first – tap the paperclip in the email to attach them.</p>
    <p class="small muted" style="margin-bottom:0">Opens your phone’s share sheet with the ticked PDFs attached – pick Mail or Gmail${m[0].customer.email ? ' and it is ready to send to ' + esc(m[0].customer.email) : ''}.</p></div>`;
}
async function sendSel() {
  const m = jobRecs() || [ui.rec], inv = invForVisit(m);
  copyEmail((m[0].customer || {}).email);
  const recs = m.filter(x => ui.pdfs[x.id] && selOn(x.id)), withInv = !!inv && selOn(inv.id);
  if (!recs.length && !withInv) { toast('Tick at least one document'); return; }
  if (withInv && !(ui.invPdf && ui.invPdf.id === inv.id)) {
    try { ui.invPdf = { id: inv.id, blob: await buildInvPdf(inv, settings), name: invFileName(inv) }; } catch (err) { toast('Could not create the invoice PDF: ' + err.message); return; }
  }
  if (withInv && recs.length) return sharePack(recs);
  if (withInv) { const prev = ui.inv; ui.inv = inv; try { await invShare(); } finally { ui.inv = prev; } return; }
  if (recs.length === 1) return sharePdf(recs[0]);
  return sharePdfAll(recs);
}
async function mailSel() {
  const m = jobRecs() || [ui.rec], inv = invForVisit(m);
  const recs = m.filter(x => ui.pdfs[x.id] && selOn(x.id)), withInv = !!inv && selOn(inv.id);
  if (!recs.length && !withInv) { toast('Tick at least one document'); return; }
  const r0 = recs[0] || m[0], first = greetName(r0.customer.name), addr = (r0.jobAddress || '').replace(/\n/g, ', ');
  const T = withInv ? invTotals(inv) : null;
  const subject = `${[...recs.map(r => SUBJ[typeOf(r)]), ...(withInv ? ['invoice ' + inv.number] : [])].join(recs.length && withInv ? ' and ' : ', ').replace(/^invoice/, 'Invoice')} – ${(r0.jobAddress || '').split('\n')[0]}`;
  const lines = [...recs.map(r => `- ${docLine(r)}`), ...(withInv ? [`- Invoice ${inv.number}: ${money(T.total)}${inv.paid ? ' (paid – thank you)' : ', payment due by ' + ukDate(inv.due)}`] : [])];
  const text = `Hi ${first},\n\nPlease find attached your ${withInv && !recs.length ? 'invoice' : 'records' + (withInv ? ' and invoice' : '')} for ${addr}, carried out on ${ukDate(r0.inspectionDate)}:\n${lines.join('\n')}\n\nKind regards,\n${signOff()}`;
  toast('Saving the PDFs to your phone…');
  await dlSel();
  await new Promise(r => setTimeout(r, 2200));   // give the phone time to save them before the email app opens
  if (withInv) markSent(inv);
  location.href = `mailto:${encodeURIComponent(r0.customer.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}
async function dlSel() {
  const m = jobRecs() || [ui.rec], inv = invForVisit(m);
  m.filter(x => ui.pdfs[x.id] && selOn(x.id)).forEach(x => downloadPdf(x));
  if (inv && selOn(inv.id)) {
    await ensureInvPdf(m);
    if (ui.invPdf) { const a = document.createElement('a'); a.href = URL.createObjectURL(ui.invPdf.blob); a.download = ui.invPdf.name; document.body.appendChild(a); a.click(); a.remove(); }
  }
}

function stepReview() {
  const m = jobRecs() || [ui.rec], multi = m.length > 1;
  const issues = reviewIssues(m);
  const w = [...new Set(m.flatMap(x => warnings(x)))];
  const made = m.every(x => ui.pdfs[x.id]);
  if (made) setTimeout(() => ensureInvPdf(m), 0); // get the invoice PDF ready in the background so sharing is instant
  const needWarn = m.filter(x => WARN.neededFor(x) && !m.some(y => isWarn(y) && y.warnFor === x.id));
  return `
    ${needWarn.map(x => `<div class="card" style="border-color:#5a2a26"><div class="t" style="color:#ff9b92;font-weight:700;margin-bottom:6px">Warning notice required</div>
      <p class="small muted" style="margin-top:0">This ${isSvc(x) ? 'boiler service' : 'gas safety check'} has ${esc(WARN.reasonsFor(x).join('; ') || 'a warning notice marked as issued')}. A Danger / Do Not Use Warning Notice must be completed${m.length > 1 ? '' : ' and given to the customer'}.</p>
      <button class="btn gold block" data-act="addWarn" data-id="${x.id}">Fill in the warning notice</button></div>`).join('')}
    ${issues.length ? `<div class="card" style="border-color:#5a2a26"><div class="t" style="color:#ff9b92;font-weight:700;margin-bottom:8px">${issues.length} item${issues.length > 1 ? 's' : ''} to complete</div>
      ${issues.map(x => `<button class="issue" data-act="goIssue" data-id="${x.rec.id}" data-step="${x.step}" data-app="${x.app ?? ''}">${multi ? esc(FORM_SHORT[typeOf(x.rec)]) + ': ' : ''}${esc(x.label)}</button>`).join('')}</div>` : ''}
    ${w.map(x => `<div class="notice">${esc(x)}</div>`).join('')}
    ${m.map(r => `<div class="card">${multi ? `<div class="t" style="font-weight:700;color:var(--gold2);margin-bottom:8px">${esc(FORM_NAME[typeOf(r)])}</div>` : ''}<dl class="kv">${recSummary(r)}</dl></div>`).join('')}
    ${made ? sendCard(m) : `<button class="btn gold block" data-act="makePdf" ${issues.length || needWarn.length ? 'disabled' : ''}>Create documents</button>
      <p class="small muted">Makes the signed PDF${multi ? 's' : ''}${billable(m).length ? ' and the invoice' : ''}, ready to send.</p>`}
    <div style="height:14px"></div>
    <button class="btn block" data-act="done">Done – back to records</button>
    <details class="adv"><summary>More options</summary>
      ${made ? `<button class="btn block" data-act="dlSel">Download selected</button><div style="height:8px"></div>
      <button class="btn block" data-act="makePdf" ${issues.length || needWarn.length ? 'disabled' : ''}>Re-create documents</button><div style="height:8px"></div>` : ''}
      <button class="btn danger block" data-act="delRec">${multi ? 'Delete all ' + m.length + ' forms in this visit' : 'Delete this record'}</button>
    </details>`;
}
/* ---------- Legionella risk assessment steps ---------- */
function legSystem() {
  const r = ui.rec, note = LEG.lowRiskNote(r);
  return `<div class="card">
    ${choice('susceptible', 'Is anyone living here particularly susceptible to Legionella?', OPT.yn, { req: 1 })}
    <p class="small muted" style="margin:-8px 0 14px">For example older people, people with a chronic illness or weakened immune system, or smokers.</p>
    ${choice('occupancy', 'Property occupancy', ['Occupied', 'Vacant'], { req: 1 })}
  </div>
  <h2>Water system</h2>
  <div class="card">
    ${choice('coldSupply', 'Cold water supply', LEG.COLD_SUPPLY, { req: 1, wrap: 1 })}
    ${choice('hotType', 'Hot water system', LEG.HOT_TYPE, { req: 1, wrap: 1 })}
    ${r.hotType === 'Other' ? txt('hotOther', 'Describe the hot water system', { req: 1 }) : ''}
    ${LEG.hasCyl(r) && !['Other', 'Immersion cylinder'].includes(r.hotType) ? choice('cylHeat', 'How is the cylinder heated?', LEG.CYL_HEAT, { req: 1, wrap: 1 }) : ''}
    ${choice('showers', 'Showers fitted', LEG.SHOWERS, { req: 1, wrap: 1 })}
  </div>
  ${note ? `<div class="notice">${esc(note)}</div>` : ''}`;
}
/* Tap tested: pick Kitchen / Bathroom / Outside, or Other and type it. The tap name is stored as plain text. */
const TAPS = ['Kitchen', 'Bathroom', 'Cloakroom', 'Utility', 'Outside'];
function tapField(key, label) {
  const v = String(ui.rec[key] ?? '').trim(), other = v !== '' && !TAPS.includes(v) || (v === '' && ui.tapOther && ui.tapOther[ui.rec.id + key]);
  const sel = TAPS.includes(v) ? v : other ? 'Other' : '';
  return `<div class="f"><span>${label}</span><select data-tap="${key}"><option value="">Choose…</option>` +
    [...TAPS, 'Other'].map(x => `<option value="${x}" ${sel === x ? 'selected' : ''}>${x === 'Other' ? 'Other (type it)' : x}</option>`).join('') + `</select></div>` +
    (other ? txt(key, 'Describe the tap', { ph: 'e.g. Utility room sink' }) : '');
}
/* ---------- Air conditioning commissioning steps ---------- */
function acSystem() {
  const r = ui.rec;
  return `<div class="card">
    ${choice('make', 'Manufacturer', AC.MAKE, { req: 1, wrap: 1 })}
    ${r.make === 'Other' ? txt('makeOther', 'Manufacturer (other)', { req: 1 }) : ''}
  </div>
  <h2>Indoor unit</h2>
  <div class="card">
    ${txt('indoorModel', 'Indoor model', { req: 1, cap: 'characters' })}
    ${txt('indoorSerial', 'Indoor serial number', { req: 1, cap: 'characters' })}
    ${choice('indoorLoc', 'Indoor location', AC.IN_LOC, { req: 1, wrap: 1 })}
    ${r.indoorLoc === 'Other' ? txt('indoorLocOther', 'Describe the location', { req: 1 }) : ''}
  </div>
  <h2>Outdoor unit</h2>
  <div class="card">
    ${txt('outdoorModel', 'Outdoor model', { req: 1, cap: 'characters' })}
    ${txt('outdoorSerial', 'Outdoor serial number', { req: 1, cap: 'characters' })}
    ${choice('outdoorLoc', 'Outdoor location', AC.OUT_LOC, { req: 1, wrap: 1 })}
    ${r.outdoorLoc === 'Other' ? txt('outdoorLocOther', 'Describe the location', { req: 1 }) : ''}
  </div>`;
}
function acRefrig() {
  const r = ui.rec;
  return `<h2>Refrigerant</h2>
  <div class="card">
    ${txt('pressure', 'System pressure tested to (bar)', { req: 1, mode: 'decimal' })}
    ${txt('vacuum', 'System held on vacuum (hours)', { req: 1, mode: 'decimal' })}
    ${txt('charge', 'System gas charge added (g)', { req: 1, mode: 'decimal' })}
    ${choice('gasType', 'Type of gas', AC.GAS, { req: 1, wrap: 1 })}
    ${r.gasType === 'Other' ? txt('gasOther', 'Type of gas (other)', { req: 1 }) : ''}
    ${txt('pipeLen', 'Pipe length (m)', { req: 1, mode: 'decimal' })}
  </div>
  <h2>Checks</h2>
  <div class="card">
    ${choice('drain', 'Condensate drain checked and draining correctly?', AC.PFN, { req: 1 })}
    ${r.drain === 'FAIL' ? PH.field(r, 'fotos.drain') : ''}
    ${txt('tempSet', 'Temperature settings – air', { req: 1, ph: 'e.g. Cool 22°C, Heat 21°C' })}
    ${choice('electrical', 'Electrical supply, isolator and connections checked?', AC.PFN, { req: 1 })}
    ${r.electrical === 'FAIL' ? PH.field(r, 'fotos.electrical') : ''}
  </div>
  <h2>Notes</h2>
  <div class="card">${txt('notes', 'Engineer notes', { area: 1, rows: 5 })}</div>`;
}
function legTemps() {
  const r = ui.rec, T = LEG.temps(r);
  const res = k => { const t = T.find(x => x.k === k); return t && t.pass !== null ? `<small style="color:${t.pass ? 'var(--ok)' : 'var(--bad)'};font-weight:700">${t.pass ? 'Pass' : 'Fail'} – ${t.req}</small>` : ''; };
  const reading = (k, label, hint) => `<div class="f ${ui.showErr && !String(r[k] ?? '').trim() ? 'bad' : ''}" data-f="${k}"><span>${label} <b>*</b></span>
    <input data-k="${k}" type="text" inputmode="decimal" value="${esc(r[k])}" placeholder="°C" autocomplete="off">${hint ? `<small>${hint}</small>` : ''}<div id="res-${k}">${res(k)}</div></div>`;
  return `<p class="small muted" style="margin-top:0">Keep hot water hot (50°C or above at the outlet) and cold water cold (below 20°C). Take readings with a thermometer.</p>
  <h2>Outlets</h2>
  <div class="card">
    ${tapField('coldOutlet', 'Cold tap tested')}
    ${reading('coldTemp', 'Cold water temperature (°C)', 'Run the tap for up to 2 minutes, then read. Should be below 20°C.')}
    ${tapField('hotOutlet', 'Hot tap tested')}
    ${reading('hotTemp', 'Hot water temperature (°C)', 'Should reach 50°C or above within about a minute.')}
  </div>
  ${LEG.hasTank(r) || LEG.hasCyl(r) ? '<h2>Storage</h2><div class="card">' +
    (LEG.hasTank(r) ? reading('tankTemp', 'Water in cold tank (°C)', 'Should be below 20°C.') : '') +
    (LEG.hasCyl(r) ? reading('cylTemp', 'Stored hot water at cylinder (°C)', r.hotType === 'Other' ? 'Leave blank if there is no stored hot water. Should be 60°C or above.' : 'Should be 60°C or above.') : '') + '</div>' : ''}`;
}
function legYN(list) { return list.map(c => choice(c.k, c.q, LEG.YN3, { req: 1, yn: 1 })).join(''); }
function legTanks() {
  const r = ui.rec, tank = LEG.tankList(r), cyl = LEG.cylList(r);
  if (!tank.length && !cyl.length) return `<div class="notice">Mains-fed cold water and instantaneous hot water: there is no tank or cylinder to check. Tap Next to continue.</div>`;
  return (tank.length ? `<h2>Cold water tank</h2><div class="card">${legYN(tank)}</div>` : '') +
    (cyl.length ? `<h2>Hot water cylinder</h2><div class="card">${legYN(cyl)}</div>` : '');
}
function legRisk() {
  const r = ui.rec;
  return `<div class="card">${legYN(LEG.riskList(r))}</div>
  ${LEG.hasShower(r) ? '' : '<p class="small muted">No shower is fitted, so shower head checks are skipped.</p>'}`;
}
function legFindings() {
  const r = ui.rec, f = LEG.failCount(r);
  return `<div class="card">
    ${choice('overall', 'Overall risk of Legionella exposure', LEG.OVERALL, { req: 1 })}
    <p class="small muted" style="margin:-8px 0 0">${f ? `${f} check${f > 1 ? 's' : ''} failed – Medium or higher is usual.` : 'No checks failed – Low is usual.'}</p>
  </div>
  <h2>Risks / defects and recommendations</h2>
  ${f ? `<button class="btn block" data-act="legAuto">Add failed checks (${f}) to the list</button><div style="height:12px"></div>` : ''}
  ${r.defects.map((d, i) => `<div class="card">
    ${txt(`defects.${i}.text`, `Risk / defect ${i + 1}`, { req: 1, area: 1, rows: 3 })}
    ${choice(`defects.${i}.cls`, 'Priority', LEG.PRIORITY, { req: 1 })}
    ${txt(`defects.${i}.action`, 'Recommendation', { req: 1, area: 1, rows: 3 })}
    ${PH.field(r, `defects.${i}.photos`)}
    <button class="btn danger block" data-act="legRmDef" data-i="${i}">Remove this item</button></div>`).join('')}
  <button class="btn block" data-act="legAddDef">+ Add a risk / defect</button>
  <h2>Review</h2>
  <div class="card">
    ${txt('renewal', 'Next assessment required by', { type: 'date', req: 1, hint: 'The law sets no fixed interval. Pre-filled as 12 months; review sooner if the system changes or the property is left empty.' })}
    ${txt('notes', 'Engineer notes', { area: 1, rows: 4 })}
  </div>`;
}

/* ---------- Gas boiler service record steps ---------- */
function svcCheck(c) {
  const r = ui.rec;
  return choice('chk.' + c.k, c.q, c.opts || SVC.PFN, { req: 1 }) + (r.chk[c.k] === 'FAIL' ? txt('fault.' + c.k, c.f, { req: 1, area: 1, rows: 2 }) + PH.field(r, 'fotos.' + c.k) : '');
}
function svcBoiler() {
  const r = ui.rec;
  return `${r.jobId ? '<p class="small muted" style="margin-top:0">Details already entered on the gas safety check are filled in for you – check and complete the rest.</p>' : ''}
  <div class="card">
    ${choice('location', 'Where is the appliance located?', SVC.LOCATION, { req: 1, wrap: 1 })}
    ${r.location === 'Other' ? txt('locationOther', 'Describe the location', { req: 1 }) : ''}
    ${choice('make', 'Appliance make', SVC.MAKE, { req: 1, wrap: 1 })}
    ${r.make === 'Other' ? txt('makeOther', 'Make', { req: 1 }) : ''}
    ${txt('model', 'Appliance model', { req: 1 })}
    ${choice('systemType', 'System type', SVC.SYSTEM, { req: 1, wrap: 1 })}
    ${r.systemType === 'Other' ? txt('systemOther', 'Describe the system type', { req: 1 }) : ''}
    ${txt('serial', 'Serial number', { req: 1, cap: 'characters' })}
    ${txt('gc', 'Gas Council number', { cap: 'characters' })}
    ${choice('flue', 'Flue type', SVC.FLUE, { req: 1, wrap: 1 })}
  </div>
  <h2>Visit</h2>
  <div class="card">
    ${choice('reason', 'Reason for visit', SVC.REASON, { req: 1 })}
    ${ageUnknown(r) ? `<div class="f"><span>Age of boiler <b>*</b></span><input type="text" value="Unknown" disabled></div>` : txt('age', 'Age of boiler', { req: 1, ph: 'e.g. 8 years' })}
    <label class="row" style="align-items:center;gap:12px;margin-top:4px;min-height:44px"><input type="checkbox" data-act="ageUnknown" style="width:24px;height:24px;flex:none" ${ageUnknown(r) ? 'checked' : ''}><span>Age unknown</span></label>
  </div>`;
}
function svcChecks() {
  return `<p class="small muted" style="margin-top:0">Mark each check Pass, Fail or N/A. If a check fails, say what the fault is.</p>
  <div class="card">${SVC.APP.map(svcCheck).join('')}</div>`;
}
function svcSafety() {
  const r = ui.rec;
  return `<div class="card">${SVC.SAFE.map(svcCheck).join('')}</div>
  <h2>Gas tightness</h2>
  <div class="card">
    <p class="small muted" style="margin-top:0">Carry out the test and record the readings first, then choose the result.</p>
    ${tightFields(r.tightDone === 'YES')}
    ${choice('tightDone', 'Has a tightness test been performed?', SVC.TIGHT, { req: 1, wrap: 1 })}
    ${r.tightDone === 'YES' ? choice('tightResult', 'Did the installation pass or fail the tightness test?', SVC.PF, { req: 1 }) : ''}
  </div>`;
}
function svcOperating() {
  const r = ui.rec;
  const rd = (a, b, l) => `<div class="row"><div class="grow">${txt(a, l + ' – min', { mode: 'decimal' })}</div><div class="grow">${txt(b, l + ' – max', { mode: 'decimal' })}</div></div>`;
  return `<h2>Operating pressure</h2>
  <div class="card">
    ${choice('bpTaken', 'Has the operating pressure been taken?', SVC.YNNA, { req: 1 })}
    ${r.bpTaken === 'YES' ? txt('bpValue', 'Operating pressure (mbar)', { req: 1, mode: 'decimal' }) + choice('bpResult', 'Is the operating pressure correct / acceptable?', SVC.PF, { req: 1 }) : ''}
  </div>
  ${isWorcester(SVC.makeText(r)) ? `<h2>Fan pressure</h2>
  <div class="card">
    ${choice('fpTaken', 'Has the fan pressure been taken?', SVC.YNNA)}
    ${r.fpTaken === 'YES' ? txt('fpValue', 'Fan pressure (mbar)', { req: 1, mode: 'decimal', hint: 'Enter it as 4.62 – it is recorded as -4.62 mbar' }) + choice('fpResult', 'Is the fan pressure correct / acceptable?', SVC.PF, { req: 1 }) : ''}
  </div>` : ''}
  <h2>Gas rate</h2>
  <div class="card">
    ${choice('grTaken', 'Has a gas rate been taken?', SVC.YNNA)}
    ${r.grTaken === 'YES' ? txt('grValue', 'Gas rate (kW)', { req: 1, mode: 'decimal' }) + calcPanel('svc', 'grValue') + choice('grResult', 'Is the gas rate correct / acceptable?', SVC.PF, { req: 1 }) : ''}
  </div>
  <h2>Flue gas analysis</h2>
  <div class="card">
    ${choice('fgDone', 'Has a flue gas analysis been performed?', SVC.YN, { req: 1 })}
    ${r.fgDone === 'YES' ? rd('fgCoMin', 'fgCoMax', 'CO ppm') + rd('fgCo2Min', 'fgCo2Max', 'CO2 %') + rd('fgRatioMin', 'fgRatioMax', 'CO/CO2 ratio') + choice('fgResult', 'Was the outcome of the analysis acceptable?', SVC.PF, { req: 1 }) : ''}
  </div>`;
}
function svcFinish() {
  const r = ui.rec;
  return `${WARN.needed(r) ? '<div class="notice err">Something on this service has failed, so a Danger / Do Not Use Warning Notice will be needed' + (ui.rec.safe === 'NO' ? ' and the record will be stamped FAIL – DO NOT USE' : '') + '. You will be asked to fill it in at the review step.</div>' : ''}<div class="card">
    ${choice('filterPresent', 'Is a system filter present?', SVC.YN, { req: 1, yn: 1 })}
    ${r.filterPresent === 'YES' ? choice('filterCleaned', 'Has the system filter been cleaned?', SVC.YN, { req: 1, yn: 1 }) : ''}
    ${choice('manufacturer', 'Does the installation meet the manufacturer’s instructions?', SVC.YN, { req: 1, yn: 1 })}
    ${choice('safe', 'Is the appliance / installation safe to use?', SVC.YN, { req: 1, yn: 1 })}
    ${choice('warning', 'Has a warning notice been issued?', SVC.YN, { req: 1 })}
  </div>
  <div class="card">
    ${txt('renewal', 'Next service due by', { type: 'date', req: 1, hint: 'Pre-filled as 12 months from today.' })}
    ${txt('notes', 'Engineer notes', { area: 1, rows: 5 })}
  </div>`;
}

/* ---------- invoices ---------- */
const SVC_PRICE = { gas: 'priceGas', service: 'priceSvc', legionella: 'priceLeg', aircon: 'priceAc' };
const INV_DESC = { gas: 'Landlord gas safety check and record', service: 'Gas boiler service', legionella: 'Legionella risk assessment', aircon: 'Air conditioning commissioning' };
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const priceStr = v => (numOf(v) > 0 ? numOf(v).toFixed(2) : '');
const invStatus = i => (i.paid ? 'paid' : i.due && i.due < todayISO() ? 'overdue' : 'unpaid');
const markSent = inv => { if (inv && !inv.sent) { inv.sent = Date.now(); persistInv(inv); } };
const invForVisit = m => invoices.find(i => (i.recIds || []).some(id => m.some(r => r.id === id)));
function persistInv(inv) {
  inv.updated = Date.now();
  const k = invoices.findIndex(x => x.id === inv.id);
  if (k >= 0) invoices[k] = inv; else invoices.unshift(inv);
  saveInvoices();
}
let _ti; const persistInvSoon = () => { clearTimeout(_ti); _ti = setTimeout(() => ui.inv && persistInv(ui.inv), 400); };
function invNumberFor(next) {
  const n = Math.max(1, parseInt(next, 10) || 1), d = Math.min(8, Math.max(1, parseInt(settings.invDigits, 10) || 3));
  return (settings.invPrefix || '') + String(n).padStart(d, '0');
}
function nextInvNumber() {
  const n = Math.max(1, parseInt(settings.invNext, 10) || 1), num = invNumberFor(n);
  settings.invNext = String(n + 1); saveSettings();
  return num;
}
function newInvoice(m) {
  m = billable(m);
  const s = settings, r0 = m && m[0], d = todayISO();
  const lines = m ? m.map(r => ({ d: INV_DESC[typeOf(r)], q: '1', p: priceStr(s[SVC_PRICE[typeOf(r)]]) })) : [{ d: '', q: '1', p: '' }];
  const sub = r2(lines.reduce((a, l) => a + numOf(l.p), 0));
  let disc = 0, label = '';
  if (m && m.length > 1 && numOf(s.discValue) > 0) {
    const pct = s.discType === '%';
    disc = Math.min(pct ? r2(sub * numOf(s.discValue) / 100) : numOf(s.discValue), sub);
    label = pct ? `Combined service discount (${numOf(s.discValue)}%)` : 'Combined service discount';
  }
  const c = r0 ? r0.customer : { name: '', phone: '', email: '', billing: '' };
  return {
    id: uid(), number: nextInvNumber(), date: d, due: addDays(d, parseInt(s.payDays, 10) || 0), workDate: r0 ? r0.inspectionDate : d,
    jobId: (r0 && r0.jobId) || '', recIds: m ? m.map(r => r.id) : [],
    customerId: r0 ? r0.customerId : '', customer: { name: c.name, phone: c.phone, email: c.email, billing: c.billing },
    jobAddress: r0 ? r0.jobAddress : '', lines, disc: disc ? disc.toFixed(2) : '', discLabel: label,
    vatRate: s.vatReg === 'Yes' ? String(numOf(s.vatRate)) : '0', vatNumber: s.vatReg === 'Yes' ? s.vatNumber : '',
    paid: false, paidDate: '', payMethod: '', notes: '', created: Date.now(), updated: Date.now()
  };
}
const invFileName = i => `Invoice ${i.number} - ${(i.customer.name || 'Customer').replace(/[^\w ]+/g, '')}.pdf`;

const PAY_METHODS = ['Cash', 'Card', 'Bank transfer'];
const methodSeg = i => i.paid ? `<div class="f" style="margin:-4px 0 12px"><span style="display:block;font-size:14px;color:var(--mut);margin-bottom:6px">Paid by</span><div class="seg">${PAY_METHODS.map(x => `<button type="button" class="${i.payMethod === x ? 'on' : ''}" data-act="invMethod" data-m="${x}">${x}</button>`).join('')}</div></div>` : '';
const packReady = (m, inv) => !!inv && !!ui.invPdf && ui.invPdf.id === inv.id && m.every(r => ui.pdfs[r.id]);
async function sharePack(sel) {
  const m = sel || jobRecs() || [ui.rec], r0 = m[0], inv = invForVisit(m), T = invTotals(inv);
  const parts = [...m.map(r => ({ blob: ui.pdfs[r.id].blob, name: ui.pdfs[r.id].name })), { blob: ui.invPdf.blob, name: ui.invPdf.name }];
  const files = parts.map(p => new File([p.blob], p.name, { type: 'application/pdf' }));
  const first = greetName(r0.customer.name), addr = (r0.jobAddress || '').replace(/\n/g, ', ');
  const subject = `${m.map(r => SUBJ[typeOf(r)]).join(', ')} and invoice ${inv.number} – ${(r0.jobAddress || '').split('\n')[0]}`;
  const text = `Hi ${first},\n\nPlease find attached your records and invoice for ${addr}, carried out on ${ukDate(r0.inspectionDate)}:\n${m.map(r => `- ${docLine(r)}`).join('\n')}\n- Invoice ${inv.number}: ${money(T.total)}${inv.paid ? ' (paid – thank you)' : ', payment due by ' + ukDate(inv.due)}\n\nKind regards,\n${signOff()}`;
  try { if (navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files, title: subject, text }); markSent(inv); return; } }
  catch (err) { if (err.name === 'AbortError') return; console.warn(err); }
  parts.forEach(p => { const el = document.createElement('a'); el.href = URL.createObjectURL(p.blob); el.download = p.name; document.body.appendChild(el); el.click(); el.remove(); });
  location.href = `mailto:${encodeURIComponent(r0.customer.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text + '\n\n(Attach the downloaded PDFs)')}`;
  markSent(inv);
}
function invCardForVisit(m0) {
  const m = billable(m0), ex = invForVisit(m0);
  const missing = m.filter(r => !numOf(settings[SVC_PRICE[typeOf(r)]])).map(r => FORM_SHORT[typeOf(r)].toLowerCase());
  if (ex) {
    const T = invTotals(ex);
    return `<div class="card" style="margin-top:12px"><div style="font-weight:700;margin-bottom:6px">Invoice ${esc(ex.number)} · ${money(T.total)} <span class="badge ${invStatus(ex)}">${invStatus(ex)}</span></div>
      <button type="button" class="item tog ${ex.paid ? 'on' : ''}" data-act="invPaidVisit" style="margin-bottom:10px"><span class="box"></span><span><span class="t">Paid</span><span class="s" style="display:block">${ex.paid ? 'Paid ' + ukDate(ex.paidDate) + ' – PAID stamp on the invoice' : 'Tick if paid on the day – adds a PAID stamp'}</span></span></button>
      ${methodSeg(ex)}
      ${!ex.sent && !ex.paid ? `<button class="btn block" data-act="invSentVisit" style="margin-bottom:10px">Mark invoice as sent</button>` : ''}
      <button class="btn block" data-act="invFromVisit">Open / edit invoice</button>
      ${packReady(m, ex) ? `<div style="height:10px"></div><button class="btn gold block" data-act="sharePack">Email / share everything (${m.length} record${m.length > 1 ? 's' : ''} + invoice)</button>
        <p class="small muted" style="margin-bottom:0">Sends the ${m.length > 1 ? m.length + ' signed PDFs' : 'signed PDF'} and the invoice together in one email.</p>`
        : `<div style="height:10px"></div><button class="btn gold block" data-act="invPrep">Prepare invoice to send with the records</button>`}</div>`;
  }
  return `<div class="card" style="margin-top:12px"><div style="font-weight:700;margin-bottom:6px">Invoice</div>
    <p class="small muted" style="margin-top:0">Creates an invoice for ${m.length > 1 ? 'the ' + m.length + ' services' : 'this service'} using your prices from Settings${m.length > 1 && numOf(settings.discValue) > 0 ? ', with the combined service discount' : ''}. You can edit it before sending.</p>
    ${missing.length ? `<div class="notice">No price set in Settings for: ${esc(missing.join(', '))}. You can type the price on the invoice.</div>` : ''}
    <button class="btn gold block" data-act="invFromVisit">Create invoice</button></div>`;
}

function invTotalsHtml(i) {
  const T = invTotals(i);
  const row = (k, v, c) => `<dt>${k}</dt><dd style="text-align:right;${c ? 'color:' + c : ''}">${v}</dd>`;
  return `<dl class="kv" style="grid-template-columns:1fr auto">${row('Subtotal', money(T.sub))}${T.disc > 0 ? row(esc(i.discLabel || 'Discount'), '-' + money(T.disc), 'var(--ok)') : ''}${T.rate > 0 ? row(`VAT (${T.rate}%)`, money(T.vat)) : ''}
    <dt style="color:var(--gold2);font-weight:700">Total ${i.paid ? 'paid' : 'due'}</dt><dd style="text-align:right;font-weight:700;font-size:18px">${money(T.total)}</dd></dl>`;
}
function invPdfHtml() {
  const i = ui.inv, p = ui.invPdf && ui.invPdf.id === i.id ? ui.invPdf : null;
  if (!p) return `<button class="btn gold block" data-act="invMakePdf">Create invoice PDF</button>`;
  return `<div class="card pdfok"><div style="font-weight:700;margin-bottom:10px">PDF ready – ${esc(p.name)}</div>
    <button class="btn gold block" data-act="invShare">Email / share invoice</button><div style="height:8px"></div>
    <button class="btn block" data-act="invDl">Download PDF</button><div style="height:8px"></div>
    <button class="btn block" data-act="invView">Open PDF</button></div>
    <p class="small muted">“Email / share” opens your phone’s share sheet with the invoice attached${i.customer.email ? ' – it is ready to send to ' + esc(i.customer.email) : ''}.</p>`;
}
function inf(path, label, o = {}) {
  const v = getP(ui.inv, path) ?? '';
  const el = o.area
    ? `<textarea data-n="${path}" rows="${o.rows || 3}" placeholder="${esc(o.ph || '')}">${esc(v)}</textarea>`
    : `<input data-n="${path}" type="${o.type || 'text'}" ${o.mode ? `inputmode="${o.mode}"` : ''} value="${esc(v)}" placeholder="${esc(o.ph || '')}" autocomplete="off" autocapitalize="${o.cap || 'sentences'}">`;
  return `<label class="f"><span>${label}</span>${el}${o.hint ? `<small>${o.hint}</small>` : ''}</label>`;
}

function renderInvoices(v) {
  const f = ui.invFilter, list = [...invoices].sort((a, b) => (b.date + b.number).localeCompare(a.date + a.number));
  const open = invoices.filter(i => !i.paid), late = open.filter(i => invStatus(i) === 'overdue');
  const owed = open.reduce((a, i) => a + invTotals(i).total, 0);
  const shown = list.filter(i => f === 'all' || (f === 'unpaid' && !i.paid) || (f === 'paid' && i.paid));
  const chip = (k, l) => `<button class="chip ${f === k ? 'on' : ''}" data-act="invFilter" data-f="${k}">${l}</button>`;
  v.innerHTML = `
    <h1>Invoices</h1>
    <div class="card"><div class="row sp"><div><div class="small muted">Outstanding</div><div style="font-size:24px;font-weight:700;color:var(--gold2)">${money(owed)}</div></div>
      <div style="text-align:right"><div class="small muted">${open.length} unpaid</div>${late.length ? `<div class="small" style="color:var(--bad);font-weight:700">${late.length} overdue</div>` : ''}</div></div></div>
    <button class="btn gold block" data-act="newInvBlank">+ New invoice</button>
    <div style="height:14px"></div>
    <div class="chips">${chip('all', 'All')}${chip('unpaid', 'Unpaid')}${chip('paid', 'Paid')}</div>
    ${shown.length ? shown.map(i => `
      <button class="item" data-act="openInv" data-id="${i.id}">
        <div class="row sp"><span class="t">${esc(i.customer.name || 'No customer')}</span><span class="badge ${invStatus(i)}">${invStatus(i)}</span></div>
        <div class="s">${esc((i.jobAddress || '').split('\n')[0] || 'No address')}</div>
        <div class="row sp"><span class="s">${esc(i.number)} · ${ukDate(i.date)}${i.paid ? '' : ' · due ' + ukDate(i.due)}</span><span class="t">${money(invTotals(i).total)}</span></div>
      </button>`).join('') : `<div class="empty">${invoices.length ? 'No invoices in this view.' : 'No invoices yet.<br>Finish a visit and tap “Create invoice” on the last screen, or start one here.'}</div>`}`;
}

function renderInvEdit(v) {
  const i = ui.inv, blankPrice = i.lines.some(l => !numOf(l.p));
  v.innerHTML = `
    <div class="row sp"><h1 style="margin-bottom:6px">${esc(i.number)}</h1><span class="badge ${invStatus(i)}">${invStatus(i)}</span></div>
    ${numOf(i.vatRate) > 0 && !String(i.vatNumber || '').trim() ? `<div class="notice">No VAT number on this invoice. Add it in <a href="#" data-nav="settings" style="color:inherit;font-weight:700">Settings</a> or type it in the VAT box below.</div>` : ''}
    ${blankPrice ? `<div class="notice">A line has no price. Type it below, or set standard prices in <a href="#" data-nav="settings" style="color:inherit;font-weight:700">Settings</a>.</div>` : ''}
    <h2>Customer</h2>
    <div class="card">
      ${customers.length ? `<label class="f"><span>Existing customer</span><select data-act="pickInvCust"><option value="">— Type details below —</option>${[...customers].sort(custAlpha).map(c => `<option value="${c.id}" ${c.id === i.customerId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>` : ''}
      ${inf('customer.name', 'Client name')}
      ${inf('customer.email', 'Email', { type: 'email', mode: 'email', cap: 'none' })}
      ${inf('customer.billing', 'Billing address', { area: 1, rows: 3 })}
      ${inf('jobAddress', 'Property the work was done at', { area: 1, rows: 3 })}
    </div>
    <h2>Dates</h2>
    <div class="card">
      ${inf('date', 'Invoice date', { type: 'date' })}
      ${inf('due', 'Payment due by', { type: 'date' })}
      ${inf('workDate', 'Date of work', { type: 'date' })}
    </div>
    <h2>Services</h2>
    ${i.lines.map((l, k) => `<div class="card">
      ${inf(`lines.${k}.d`, 'Description', { ph: 'e.g. Replacement part' })}
      <div class="row"><div class="grow">${inf(`lines.${k}.q`, 'Qty', { mode: 'decimal' })}</div><div class="grow">${inf(`lines.${k}.p`, 'Price each (£)', { mode: 'decimal' })}</div></div>
      ${i.lines.length > 1 ? `<button class="btn danger block" data-act="invRmLine" data-i="${k}">Remove this line</button>` : ''}</div>`).join('')}
    <button class="btn block" data-act="invAddLine">+ Add a line (parts, call-out, extras)</button>
    <h2>Discount and notes</h2>
    <div class="card">
      ${inf('vatRate', 'VAT rate (%)', { mode: 'decimal', hint: 'Enter prices excluding VAT – VAT is added on top. Use 0 for no VAT.' })}
      ${inf('vatNumber', 'VAT number')}
      ${inf('disc', 'Discount (£)', { mode: 'decimal', hint: i.discLabel ? esc(i.discLabel) + ' – change or clear it here.' : 'Leave blank for no discount.' })}
      ${inf('notes', 'Note on the invoice (optional)', { area: 1, rows: 3 })}
    </div>
    <div class="card" id="invTotals">${invTotalsHtml(i)}</div>
    <button type="button" class="item tog ${i.paid ? 'on' : ''}" data-act="invPaid"><span class="box"></span><span><span class="t">Paid</span><span class="s" style="display:block">${i.paid ? 'Paid on ' + ukDate(i.paidDate) + ' – a PAID stamp is shown on the invoice' : 'Tick once paid – a PAID stamp is then shown on the invoice'}</span></span></button>
    ${methodSeg(i)}
    <div style="height:14px"></div>
    <div id="invPdfBox">${invPdfHtml()}</div>
    <div style="height:14px"></div>
    <button class="btn ghost block" data-act="invBack">${ui.invFrom === 'visit' ? 'Back to the visit' : 'Back to invoices'}</button>
    <div style="height:10px"></div>
    <button class="btn danger block" data-act="invDel">Delete this invoice</button>`;
}

async function invMakePdf() {
  const i = ui.inv;
  try { const blob = await buildInvPdf(i, settings); ui.invPdf = { id: i.id, blob, name: invFileName(i) }; $('#invPdfBox').innerHTML = invPdfHtml(); toast('Invoice PDF created'); }
  catch (err) { console.error(err); toast('Could not create the PDF: ' + err.message); }
}
async function invShare() {
  copyEmail((ui.inv.customer || {}).email);
  const i = ui.inv, { blob, name } = ui.invPdf, T = invTotals(i);
  const file = new File([blob], name, { type: 'application/pdf' });
  const first = greetName(i.customer.name), addr = (i.jobAddress || '').replace(/\n/g, ', ');
  const subject = `Invoice ${i.number} – ${settings.businessName}`;
  const text = `Hi ${first},\n\nPlease find attached invoice ${i.number}${addr ? ' for the work at ' + addr : ''}.\n${i.paid ? 'This invoice has been paid – thank you.' : `Total due: ${money(T.total)}\nPayment is due by ${ukDate(i.due)}.`}\n\nKind regards,\n${signOff()}`;
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: subject, text }); markSent(i); return; } }
  catch (err) { if (err.name === 'AbortError') return; console.warn(err); }
  invDownload();
  location.href = `mailto:${encodeURIComponent(i.customer.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text + '\n\n(Attach the downloaded PDF)')}`;
  markSent(i);
}
function invDownload() {
  const p = ui.invPdf, a = document.createElement('a'); a.href = URL.createObjectURL(p.blob); a.download = p.name; document.body.appendChild(a); a.click(); a.remove();
}
function invGo(inv, from) { ui.inv = inv; ui.invPdf = null; ui.invFrom = from; ui.view = 'invEdit'; render(); }
function exportInvoices() {
  if (!invoices.length) { toast('No invoices to export yet'); return; }
  const q = x => '"' + String(x ?? '').replace(/"/g, '""').replace(/\r?\n/g, ', ') + '"';
  const rows = [['Invoice', 'Date', 'Due', 'Customer', 'Property', 'Subtotal', 'Discount', 'VAT', 'Total', 'Status', 'Paid on']].concat(
    [...invoices].sort((a, b) => (a.date + a.number).localeCompare(b.date + b.number)).map(i => { const T = invTotals(i); return [i.number, ukDate(i.date), ukDate(i.due), i.customer.name, i.jobAddress, T.sub.toFixed(2), T.disc.toFixed(2), T.vat.toFixed(2), T.total.toFixed(2), invStatus(i), ukDate(i.paidDate)]; }));
  saveFile('﻿' + rows.map(r => r.map(q).join(',')).join('\r\n'), `Invoices ${todayISO()}.csv`, 'text/csv');
}

/* ---------- signature pads ---------- */
function initSigs() {
  document.querySelectorAll('canvas[data-sig]').forEach(cv => {
    const key = cv.dataset.sig, ratio = 2;
    const w = cv.clientWidth, h = cv.clientHeight;
    cv.width = w * ratio; cv.height = h * ratio;
    const ctx = cv.getContext('2d'); ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4; ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = '#111';
    const ph = document.querySelector(`[data-ph="${key}"]`);
    const existing = ui.rec[key];
    if (existing) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, w, h); PH.sigResolve(existing).then(src => { img.src = src; }); ph.style.display = 'none'; }
    let drawing = false, last = null;
    const pt = e => { const b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
    cv.addEventListener('pointerdown', e => { drawing = true; last = pt(e); cv.setPointerCapture(e.pointerId); ph.style.display = 'none'; ctx.beginPath(); ctx.arc(last.x, last.y, 1.2, 0, 7); ctx.fillStyle = '#111'; ctx.fill(); e.preventDefault(); });
    cv.addEventListener('pointermove', e => { if (!drawing) return; const p = pt(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; e.preventDefault(); });
    const end = () => { if (!drawing) return; drawing = false; ui.rec[key] = PH.sigStore(cv.toDataURL('image/png')); persistRec(ui.rec); ui.pdf = null; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  });
}

/* ---------- events ---------- */
document.addEventListener('click', async e => {
  const nav = e.target.closest('[data-nav]');
  if (nav) { e.preventDefault(); ui.view = nav.dataset.nav; ui.search = ''; render(); return; }
  const kv = e.target.closest('button[data-k][data-v]');
  if (kv) { onChoice(kv.dataset.k, kv.dataset.v); return; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, r = ui.rec;
  switch (a) {
    case 'newRec': ui.pick = { types: { [b.dataset.type]: true }, customer: null }; ui.view = 'pick'; render(); break;
    case 'pickToggle': ui.pick.types[b.dataset.t] = !ui.pick.types[b.dataset.t]; render(); break;
    case 'pickAll': ui.pick.types = { gas: true, service: true, legionella: true }; render(); break;
    case 'pickGo': startJob(); break;
    case 'pickCancel': ui.pick = null; ui.view = ui.cust && ui.pickFromCust ? 'custEdit' : 'home'; ui.pickFromCust = false; render(); break;
    case 'openRec': {
      const m = mates(records.find(x => x.id === b.dataset.id)), done = m.every(x => x.status === 'complete');
      ui.job = m.length > 1 ? m.map(x => x.id) : null;
      ui.rec = done ? m[m.length - 1] : m[0]; ui.step = done ? stepsOf(ui.rec).length - 1 : 0; ui.appTab = 0; ui.showErr = false; ui.pdfs = {}; ui.view = 'form'; render(); break;
    }
    case 'addWarn': {
      const svc = records.find(x => x.id === b.dataset.id); if (!svc) break;
      if (!svc.jobId) svc.jobId = uid();
      const w = newWarnRecord({ id: svc.customerId, ...svc.customer });
      w.jobId = svc.jobId; w.warnFor = svc.id; w.jobAddress = svc.jobAddress; w.inspectionDate = svc.inspectionDate; w.customerId = svc.customerId; w.customer = { ...svc.customer };
      ['customerPresent', 'customerName', 'customerSig', 'engineerSig'].forEach(k => { w[k] = svc[k]; });
      WARN.prefillFrom(w, svc);
      persistRec(svc); persistRec(w);
      ui.job = mates(svc).map(x => x.id); ui.rec = w; ui.step = 1; ui.appTab = 0; ui.showErr = false; ui.pdfs = {}; ui.view = 'form'; render(); break;
    }
    case 'rmWarn': {
      if (!confirm('Remove this warning notice from the visit?')) break;
      const svc = records.find(x => x.id === r.warnFor), id = r.id;
      records = records.filter(x => x.id !== id); saveRecords(); deleteRemote('record', id);
      const m = svc ? mates(svc) : [];
      ui.job = m.length > 1 ? m.map(x => x.id) : null; ui.rec = svc || records[0]; ui.step = ui.rec ? stepsOf(ui.rec).length - 1 : 0; ui.pdfs = {}; render(); break;
    }
    case 'back': goBack(); break;
    case 'next': goNext(); break;
    case 'done': ui.job = null; ui.view = 'home'; render(); syncAll(); break;
    case 'appTab': ui.appTab = +b.dataset.i; render(); break;
    case 'ageUnknown': {
      r.age = b.checked ? 'Unknown' : ''; ui.pdf = null; persistRec(r);
      const y = window.scrollY; render(); window.scrollTo(0, y); break;
    }
    case 'mfrOther': {
      const cur = String(getP(r, b.dataset.path) ?? '').trim();
      const isBrand = SVC.MAKE.some(x => x !== 'Other' && x.toLowerCase() === cur.toLowerCase());
      (ui.mfrOther = ui.mfrOther || {})[r.id + '.' + b.dataset.i] = true;
      if (isBrand) { setP(r, b.dataset.path, ''); ui.pdf = null; persistRec(r); }
      const y = window.scrollY; render(); window.scrollTo(0, y); break;
    }
    case 'tightTimer': {
      const k = 'tt-' + r.id, s = ui.calc[k] || (ui.calc[k] = { t0: 0 });
      if (!s.t0 && tightNeedsStart(r)) { toast('Enter the start pressure before starting the timer'); break; }
      if (s.t0) {
        s.last = Date.now() - s.t0; { const ts = Math.round(s.last / 1000); r.tightMins = Math.floor(ts / 60) + ':' + String(ts % 60).padStart(2, '0'); } s.t0 = 0;
        if (!isSvc(r)) r.tightnessResult = tightText(r.tightStart, r.tightEnd, r.tightMins);
        ui.pdf = null; persistRec(r);
      } else { s.t0 = Date.now(); s.last = 0; }
      const y = window.scrollY; render(); window.scrollTo(0, y); break;
    }
    case 'calcToggle': { const s = calcState(b.dataset.id); s.open = !s.open; const y = window.scrollY; render(); window.scrollTo(0, y); break; }
    case 'calcSet': {
      const s = calcState(b.dataset.id); s[b.dataset.key] = b.dataset.val;
      const y = window.scrollY; render(); window.scrollTo(0, y); break;
    }
    case 'calcTimer': {
      const s = calcState(b.dataset.id);
      if (calcNeedsStart(s)) { toast('Enter the first meter reading before starting'); break; }
      if (s.t0) { s.last = Date.now() - s.t0; s.secs = fmtClock(s.last); s.t0 = 0; } else { s.t0 = Date.now(); s.last = 0; s.secs = ''; }
      const y = window.scrollY; render(); window.scrollTo(0, y); break;
    }
    case 'calcUse': {
      setP(r, b.dataset.path, b.dataset.val); ui.pdf = null; persistRec(r);
      toast('Gas rate filled in'); const y = window.scrollY; render(); window.scrollTo(0, y); break;
    }
    case 'sameAddr': r.jobAddress = r.customer.billing; persistRec(r); render(); break;
    case 'pickProp': r.jobAddress = customers.find(c => c.id === r.customerId).properties[+b.dataset.i]; persistRec(r); render(); break;
    case 'goIssue': { const tgt = records.find(x => x.id === b.dataset.id) || r; ui.showErr = true; goTo(tgt, +b.dataset.step); ui.appTab = b.dataset.app === '' ? 0 : +b.dataset.app; render(); break; }
    case 'sigClear': { const key = b.dataset.key; r[key] = ''; persistRec(r); ui.pdf = null; const cv = document.querySelector(`canvas[data-sig="${key}"]`); cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); document.querySelector(`[data-ph="${key}"]`).style.display = ''; break; }
    case 'photoRm': await PH.remove(r, b.dataset.path, b.dataset.pid); ui.pdf = null; persistRec(r); { const y = window.scrollY; render(); window.scrollTo(0, y); } break;
    case 'legAddDef': r.defects.push(blankDefect()); r.defectCount = String(r.defects.length); persistRec(r); ui.pdf = null; render(); break;
    case 'legRmDef': PH.dropAll(r.defects[+b.dataset.i].photos || []); r.defects.splice(+b.dataset.i, 1); r.defectCount = String(r.defects.length); persistRec(r); ui.pdf = null; render(); break;
    case 'legAuto': {
      const have = new Set(r.defects.map(d => d.text));
      const add = LEG.autoDefects(r).filter(d => !have.has(d.text));
      if (!add.length) { toast(LEG.failCount(r) ? 'Those failed checks are already listed' : 'No failed checks to add'); break; }
      r.defects.push(...add); r.defectCount = String(r.defects.length); persistRec(r); ui.pdf = null; render(); toast(`Added ${add.length} item${add.length > 1 ? 's' : ''}`); break;
    }
    case 'makePdf': await makePdf(); break;
    case 'sharePdf': await sharePdf(records.find(x => x.id === b.dataset.id) || r); break;
    case 'sharePdfAll': await sharePdfAll(); break;
    case 'dlPdf': downloadPdf(records.find(x => x.id === b.dataset.id) || r); break;
    case 'viewPdf': window.open(URL.createObjectURL(ui.pdfs[b.dataset.id].blob), '_blank'); break;
    case 'delRec': {
      const m = jobRecs() || [r];
      if (confirm(m.length > 1 ? `Delete all ${m.length} forms in this visit from this phone? This cannot be undone.` : 'Delete this record from this phone? This cannot be undone.')) {
        m.forEach(x => PH.dropAll(PH.recIds(x))); const ids = new Set(m.map(x => x.id)); records = records.filter(x => !ids.has(x.id)); saveRecords(); ids.forEach(id => deleteRemote('record', id));
        ui.job = null; ui.view = 'home'; render();
      }
      break;
    }
    case 'custTab': ui.custTab = b.dataset.t; { const y = window.scrollY; render(); window.scrollTo(0, y); } break;
    case 'pickCustId': applyCust(b.dataset.id); break;
    case 'custSort': try { localStorage.setItem('omb_custsort', b.dataset.s); } catch (e) { } render(); break;
    case 'favCust': { const c = customers.find(x => x.id === b.dataset.id); if (c) { c.fav = !c.fav; c.updated = Date.now(); c._dirty = true; saveCustomers(); paintCustList(); } break; }
    case 'newCust': ui.cust = { _new: true, id: uid(), name: '', phone: '', email: '', billing: '', properties: [] }; ui.view = 'custEdit'; render(); break;
    case 'editCust': ui.cust = JSON.parse(JSON.stringify(customers.find(c => c.id === b.dataset.id))); ui.view = 'custEdit'; render(); break;
    case 'saveCust': saveCust(); break;
    case 'recForCust': { saveCust(true); const cu = customers.find(c => c.id === ui.cust.id); ui.pick = { types: {}, customer: cu }; ui.pickFromCust = true; ui.view = 'pick'; render(); break; }
    case 'delCust': if (confirm('Delete this customer? Their past records are kept.')) { customers = customers.filter(c => c.id !== ui.cust.id); saveCustomers(); deleteRemote('customer', ui.cust.id); ui.view = 'customers'; render(); } break;
    case 'rmCoLogo': settings.logo = ''; saveSettings(); render(); break;
    case 'rmLogo': settings.gasSafeLogo = ''; saveSettings(); render(); break;
    case 'expCust': exportCustomers(); break;
    case 'mailSel': await mailSel(); break;
    case 'forceUpdate': forceUpdate(); break;
    case 'expAll': exportBackup(); break;
    case 'syncNow': await syncAll(true); break;
    case 'billing': try { if (CLOUD.access().paid) await CLOUD.fn('portal'); else await CLOUD.fn('checkout'); } catch (e) { toast(e.message); } break;
    case 'logout':
      if (!confirm('Log out? Your records stay safe in your account and come back when you log in. The copy on this phone is removed.')) break;
      toast('Syncing before you go…'); await CLOUD.sync();
      if (CLOUD.st.state === 'error' && !confirm('The last sync did not finish, so recent changes could be lost. Log out anyway?')) break;
      await CLOUD.signOut(true); break;
    case 'expInv': exportInvoices(); break;
    case 'discType': { const y = window.scrollY; settings.discType = b.dataset.t; saveSettings(); render(); window.scrollTo(0, y); break; }
    case 'vatReg': { const y = window.scrollY; settings.vatReg = settings.vatReg === 'Yes' ? 'No' : 'Yes'; saveSettings(); render(); window.scrollTo(0, y); break; }
    case 'invSentVisit': { const inv = invForVisit(jobRecs() || [ui.rec]); if (inv) { inv.sent = Date.now(); persistInv(inv); const y = window.scrollY; render(); window.scrollTo(0, y); } break; }
    case 'invFromVisit': { const m = jobRecs() || [ui.rec]; let inv = invForVisit(m); if (!inv) { inv = newInvoice(m); persistInv(inv); } invGo(inv, 'visit'); break; }
    case 'newInvBlank': { const inv = newInvoice(null); persistInv(inv); invGo(inv, 'invoices'); break; }
    case 'openInv': invGo(invoices.find(x => x.id === b.dataset.id), 'invoices'); break;
    case 'invFilter': ui.invFilter = b.dataset.f; render(); break;
    case 'invBack': {
      persistInv(ui.inv);
      if (ui.invFrom === 'visit' && !(ui.invPdf && ui.invPdf.id === ui.inv.id)) { try { ui.invPdf = { id: ui.inv.id, blob: await buildInvPdf(ui.inv, settings), name: invFileName(ui.inv) }; } catch (err) { console.error(err); toast('Could not create the invoice PDF: ' + err.message); } }
      ui.view = ui.invFrom === 'visit' ? 'form' : 'invoices'; render(); break;
    }
    case 'invAddLine': { const y = window.scrollY; ui.inv.lines.push({ d: '', q: '1', p: '' }); ui.invPdf = null; persistInv(ui.inv); render(); window.scrollTo(0, document.body.scrollHeight); break; }
    case 'invRmLine': { const y = window.scrollY; ui.inv.lines.splice(+b.dataset.i, 1); ui.invPdf = null; persistInv(ui.inv); render(); window.scrollTo(0, y); break; }
    case 'invPaid': { const i = ui.inv; i.paid = !i.paid; i.paidDate = i.paid ? todayISO() : ''; if (!i.paid) i.payMethod = ''; ui.invPdf = null; persistInv(i); const y = window.scrollY; render(); window.scrollTo(0, y); toast(i.paid ? 'Marked as paid' : 'Marked as unpaid'); break; }
    case 'invMakePdf': await invMakePdf(); break;
    case 'sharePack': await sharePack(); break;
    case 'sendSel': await sendSel(); break;
    case 'dlSel': await dlSel(); break;
    case 'selToggle': { (ui.sel = ui.sel || {})[b.dataset.id] = !selOn(b.dataset.id); const y = window.scrollY; render(); window.scrollTo(0, y); break; }
    case 'invMethod': {
      const toVisit = ui.view === 'form', inv = toVisit ? invForVisit(jobRecs() || [ui.rec]) : ui.inv, y = window.scrollY;
      inv.payMethod = inv.payMethod === b.dataset.m ? '' : b.dataset.m; persistInv(inv);
      if (toVisit) { try { ui.invPdf = { id: inv.id, blob: await buildInvPdf(inv, settings), name: invFileName(inv) }; } catch (err) { ui.invPdf = null; } } else ui.invPdf = null;
      render(); window.scrollTo(0, y); break;
    }
    case 'invPaidVisit': { const inv = invForVisit(jobRecs() || [ui.rec]); inv.paid = !inv.paid; inv.paidDate = inv.paid ? todayISO() : ''; if (!inv.paid) inv.payMethod = ''; persistInv(inv); const y = window.scrollY; try { ui.invPdf = { id: inv.id, blob: await buildInvPdf(inv, settings), name: invFileName(inv) }; } catch (err) { console.error(err); ui.invPdf = null; } render(); window.scrollTo(0, y); toast(inv.paid ? 'Marked as paid' : 'Marked as unpaid'); break; }
    case 'invPrep': { const inv = invForVisit(jobRecs() || [ui.rec]); try { ui.invPdf = { id: inv.id, blob: await buildInvPdf(inv, settings), name: invFileName(inv) }; render(); } catch (err) { toast('Could not create the invoice PDF: ' + err.message); } break; }
    case 'invShare': await invShare(); break;
    case 'invDl': invDownload(); break;
    case 'invView': window.open(URL.createObjectURL(ui.invPdf.blob), '_blank'); break;
    case 'invDel': if (confirm('Delete this invoice from this phone? This cannot be undone.')) { invoices = invoices.filter(x => x.id !== ui.inv.id); saveInvoices(); deleteRemote('invoice', ui.inv.id); ui.view = ui.invFrom === 'visit' ? 'form' : 'invoices'; ui.inv = null; render(); } break;
  }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.s === 'sortCode') t.value = fmtSort(t.value);
  if (t.id === 'custSearch') { ui.search = t.value; paintCustList(); return; }
  if (t.dataset.tm) {
    const r = ui.rec, box = t.parentNode.parentNode;
    const mv = box.querySelector('[data-tm="m"]').value.replace(/\D/g, ''), sv = box.querySelector('[data-tm="s"]').value.replace(/\D/g, '');
    r.tightMins = (mv || sv) ? (+mv || 0) + ':' + String(+sv || 0).padStart(2, '0') : '';
    if (!isSvc(r)) r.tightnessResult = tightText(r.tightStart, r.tightEnd, r.tightMins);
    ui.pdf = null; persistRecSoon();
    const tl = document.getElementById('tightLive'); if (tl) tl.innerHTML = tightLiveHtml(r);
    return;
  }
  if (t.dataset.calc) {
    const [cid, ckey] = t.dataset.calc.split('.'), cs = calcState(cid);
    cs[ckey] = t.value;
    if (ckey === 'cv') { settings.gasCV = t.value; saveSettings(); }
    const rel = document.getElementById('calcRes-' + cid); if (rel) rel.innerHTML = calcResHtml(cid);
    const rv = document.getElementById('calcVol-' + cid); if (rv) rv.innerHTML = calcVolHtml(cs);
    const gb = document.getElementById('calcGo-' + cid), gh = document.getElementById('calcHint-' + cid);
    if (gb) gb.disabled = calcNeedsStart(cs);
    if (gh) gh.textContent = calcNeedsStart(cs) ? 'Enter the first meter reading before you start the timer.' : '';
    return;
  }
  if (t.dataset.k) {
    setP(ui.rec, t.dataset.k, t.value); ui.pdf = null; persistRecSoon();
    if (/^tight(Start|End|Mins)$/.test(t.dataset.k)) {
      if (!isSvc(ui.rec)) ui.rec.tightnessResult = tightText(ui.rec.tightStart, ui.rec.tightEnd, ui.rec.tightMins);
      const tl = document.getElementById('tightLive'); if (tl) tl.innerHTML = tightLiveHtml(ui.rec);
      const tg = document.getElementById('tightGo'), th = document.getElementById('tightHint');
      if (tg) tg.disabled = tightNeedsStart(ui.rec);
      if (th) { th.textContent = tightNeedsStart(ui.rec) ? 'Enter the start pressure before you start the timer.' : 'Optional – type it, or use the timer'; th.style.color = tightNeedsStart(ui.rec) ? 'var(--warn)' : ''; }
    }
    if (/^(tight(Start|End|Mins)|appliances\.\d+\.(ratio|co)(Min|Max))$/.test(t.dataset.k)) {
      const ch = autoPass(ui.rec); ch.forEach(p => showChoice(ui.rec, p));
      if (ch.some(p => getP(ui.rec, p))) toast('Pass selected from your readings');
    }
    if (isLeg(ui.rec)) { const x = LEG.temps(ui.rec).find(q => q.k === t.dataset.k), el = document.getElementById('res-' + t.dataset.k);
      if (x && el) el.innerHTML = x.pass === null ? '' : `<small style="color:${x.pass ? 'var(--ok)' : 'var(--bad)'};font-weight:700">${x.pass ? 'Pass' : 'Fail'} – ${x.req}</small>`; }
    return;
  }
  if (t.dataset.n) {
    setP(ui.inv, t.dataset.n, t.value); persistInvSoon();
    const had = !!ui.invPdf; ui.invPdf = null;
    const el = $('#invTotals'); if (el) el.innerHTML = invTotalsHtml(ui.inv);
    if (had) { const bx = $('#invPdfBox'); if (bx) bx.innerHTML = invPdfHtml(); }
    return;
  }
  if (t.dataset.s) { settings[t.dataset.s] = t.value; saveSettings(); if (/^inv(Prefix|Next|Digits)$/.test(t.dataset.s)) { const pv = document.getElementById('invPreview'); if (pv) pv.textContent = invNumberFor(settings.invNext); } if (t.dataset.s === 'discValue' || /^price/.test(t.dataset.s)) { clearTimeout(settingsRefresh._t); settingsRefresh._t = setTimeout(settingsRefresh, 900); } return; }
  if (t.dataset.c) { ui.cust[t.dataset.c] = t.value; }
});
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.dataset.photo && t.files && t.files.length) {
    const r = ui.rec, path = t.dataset.photo, files = Array.from(t.files); t.value = '';
    toast('Adding photo…'); await PH.attach(r, path, files);
    ui.pdf = null; persistRec(r); const y = window.scrollY; render(); window.scrollTo(0, y); return;
  }
  if (t.dataset.tap) {
    const r = ui.rec, k = t.dataset.tap, cur = String(r[k] ?? '').trim();
    ui.tapOther = ui.tapOther || {}; ui.tapOther[r.id + k] = t.value === 'Other';
    if (t.value === 'Other') { if (TAPS.includes(cur)) r[k] = ''; } else r[k] = t.value;
    ui.pdf = null; persistRec(r); const y = window.scrollY; render(); window.scrollTo(0, y); return;
  }
  if (t.id === 'restoreFile' && t.files[0]) { restoreBackup(t.files[0]); t.value = ''; return; }
  if (t.id === 'accent') { settings.accent = t.value; saveSettings(); return; }
  if (t.id === 'coLogo' && t.files[0]) {
    const img = new Image(), url = URL.createObjectURL(t.files[0]);
    img.onload = () => {   // fit the logo inside a square white tile so it sits cleanly on every PDF header
      const S = 400, sc = Math.min(S / img.width, S / img.height) * 0.92, cv = document.createElement('canvas'); cv.width = cv.height = S;
      const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, S, S);
      c.drawImage(img, (S - img.width * sc) / 2, (S - img.height * sc) / 2, img.width * sc, img.height * sc);
      settings.logo = cv.toDataURL('image/png'); saveSettings(); URL.revokeObjectURL(url); render(); toast('Logo saved');
    };
    img.onerror = () => toast('That file could not be read as an image');
    img.src = url; return;
  }
  if (t.id === 'gsLogo' && t.files[0]) {
    const img = new Image(), url = URL.createObjectURL(t.files[0]);
    img.onload = () => {
      const sc = Math.min(1, 500 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
      cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      settings.gasSafeLogo = cv.toDataURL('image/png'); settings.gasSafeLogoAR = cv.width / cv.height;
      saveSettings(); URL.revokeObjectURL(url); render(); toast('Gas Safe logo saved');
    };
    img.onerror = () => toast('That file could not be read as an image');
    img.src = url; return;
  }
  if (t.dataset.act === 'pickInvCust') {
    const c = customers.find(x => x.id === t.value), i = ui.inv;
    i.customerId = c ? c.id : '';
    if (c) { i.customer = { name: c.name, phone: c.phone, email: c.email, billing: c.billing }; if ((c.properties || []).length === 1) i.jobAddress = c.properties[0]; }
    ui.invPdf = null; persistInv(i); render(); return;
  }
  if (t.dataset.act === 'pickCust') applyCust(t.value);
});
/* refresh the discount example on the Settings screen once typing pauses (only if no field is being edited) */
function settingsRefresh() { if (ui.view === 'settings' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement && document.activeElement.tagName)) { const y = window.scrollY; render(); window.scrollTo(0, y); } }
let _t; const persistRecSoon = () => { clearTimeout(_t); _t = setTimeout(() => ui.rec && persistRec(ui.rec), 400); };

/* ----- Pass ticks itself when the readings are clearly fine (only fills an empty answer; the engineer can always change it) -----
   gas tightness: start and end pressure the same (no drop) · flue operation: CO/CO2 ratio at or under 0.004 (and CO under 200 ppm if entered) */
const RATIO_MAX = 0.004, CO_MAX = 200;
function autoPass(r) {
  const A = r._auto || (r._auto = {}), changed = [];
  const set = (path, want, ok) => {
    const cur = getP(r, path) ?? '';
    if (ok && cur === '') { setP(r, path, want); A[path] = 1; changed.push(path); }
    else if (!ok && A[path] && cur === want) { setP(r, path, ''); delete A[path]; changed.push(path); }
    else if (cur !== want) delete A[path];
  };
  const a = tgNum(r.tightStart), b = tgNum(r.tightEnd), noDrop = a !== null && b !== null && Math.round((a - b) * 100) === 0;
  if (typeOf(r) === 'gas') {
    set('tightness', 'PASS', noDrop);
    r.appliances.slice(0, +r.applianceCount || 1).forEach((x, i) => {
      const hi = tgNum(x.ratioMax), lo = tgNum(x.ratioMin), co = tgNum(x.coMax);
      set(`appliances.${i}.flueOp`, 'Pass', hi !== null && hi <= RATIO_MAX && (lo === null || lo <= RATIO_MAX) && (co === null || co <= CO_MAX));
    });
  } else if (typeOf(r) === 'service') set('tightResult', 'PASS', noDrop && r.tightDone === 'YES');
  return changed;
}
function showChoice(r, path) {
  const v = String(getP(r, path) ?? '');
  document.querySelectorAll(`button[data-k="${path}"]`).forEach(b => { const on = b.dataset.v === v; b.className = on ? 'on ' + (/^pass$/i.test(v) ? 'pass' : '') : ''; });
  const f = document.querySelector(`.f[data-f="${path}"]`); if (f && v) f.classList.remove('bad');
}
function onChoice(path, val) {
  const r = ui.rec;
  setP(r, path, val); ui.pdf = null;
  if (r._auto) delete r._auto[path];
  autoPass(r);
  if (path === 'applianceCount') { const n = +val; while (r.appliances.length < n) r.appliances.push(blankAppliance()); if (ui.appTab >= n) ui.appTab = n - 1; }
  if (path === 'defectCount') { const n = +val; while (r.defects.length < n) r.defects.push(blankDefect()); }
  persistRec(r);
  const y = window.scrollY; render(); window.scrollTo(0, y);
}
function goNext() {
  const r = ui.rec, s = ui.step;
  const issues = validate(r).filter(x => x.step === s && (isLeg(r) || isSvc(r) || isWarn(r) || isAc(r) || s !== 1 || x.app === ui.appTab));
  if (issues.length) { ui.showErr = true; render(); toast('Please complete the highlighted fields'); const f = document.querySelector('.f.bad'); if (f) f.scrollIntoView({ block: 'center' }); return; }
  ui.showErr = false;
  if (s === 0) commitCustomer(r);
  persistRec(r);
  if (typeOf(r) === 'gas' && s === 1 && ui.appTab < (+r.applianceCount || 1) - 1) { ui.appTab++; render(); return; }
  const { seq, pos } = seqPos();
  if (seq) { const q = seq[Math.min(pos + 1, seq.length - 1)]; goTo(q.rec, q.step); } else { ui.step++; ui.appTab = 0; render(); }
}
function saveCust(silent) {
  const c = ui.cust;
  if (!c.name.trim()) { toast('Enter a name'); return; }
  const props = typeof c.props === 'string' ? c.props.split('\n').map(x => x.trim()).filter(Boolean) : c.properties;
  const out = { id: c.id, name: c.name.trim(), phone: c.phone, email: c.email, billing: c.billing, properties: props, updated: Date.now(), _dirty: true };
  const i = customers.findIndex(x => x.id === c.id);
  if (i >= 0) customers[i] = out; else customers.unshift(out);
  saveCustomers(); ui.cust = out;
  if (!silent) { toast('Customer saved'); ui.view = 'customers'; render(); }
  syncAll();
}

/* ---------- PDF ---------- */
const pdfName = r => `${FORM_DOC[typeOf(r)][0]} - ${(r.customer.name || 'Customer').replace(/[^\w ]+/g, '')} - ${r.inspectionDate}.pdf`;
async function makePdf() {
  const m = jobRecs() || [ui.rec];
  commitCustomer(m[0]);
  try {
    for (const r of m) {
      const blob = await buildPdf(r, settings);
      ui.pdfs[r.id] = { blob, name: pdfName(r) };
      r.status = 'complete'; r.completedAt = r.completedAt || Date.now(); persistRec(r);
    }
    /* make the invoice at the same time when every service has a price in Settings (otherwise "Add an invoice" lets you type the price) */
    const bm = billable(m);
    if (bm.length && !invForVisit(m) && bm.every(r => numOf(settings[SVC_PRICE[typeOf(r)]]) > 0)) persistInv(newInvoice(m));
    await ensureInvPdf(m);
    render(); toast(m.length > 1 ? `${m.length} PDFs created` : 'PDF created'); syncAll();
  } catch (err) { console.error(err); toast('Could not create the PDF: ' + err.message); }
}
async function sharePdf(r) {
  r = r || ui.rec;
  copyEmail((r.customer || {}).email);
  const { blob, name } = ui.pdfs[r.id], [doc, due] = FORM_DOC[typeOf(r)];
  const file = new File([blob], name, { type: 'application/pdf' });
  const first = greetName(r.customer.name), addr = (r.jobAddress || '').replace(/\n/g, ', ');
  const subject = `${SUBJ[typeOf(r)]} – ${(r.jobAddress || '').split('\n')[0]}`;
  const text = `Hi ${first},\n\nPlease find attached your ${doc} for ${addr}, carried out on ${ukDate(r.inspectionDate)}.${due ? '\n' + due + ' ' + ukDate(r.renewal) + '.' : ''}\n\nKind regards,\n${signOff()}`;
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: subject, text }); return; }
  } catch (err) { if (err.name === 'AbortError') return; console.warn(err); }
  downloadPdf(r);
  location.href = `mailto:${encodeURIComponent(r.customer.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text + '\n\n(Attach the downloaded PDF)')}`;
}
async function sharePdfAll(sel) {
  const m = sel || jobRecs() || [ui.rec], r0 = m[0];
  const files = m.map(r => new File([ui.pdfs[r.id].blob], ui.pdfs[r.id].name, { type: 'application/pdf' }));
  const first = greetName(r0.customer.name), addr = (r0.jobAddress || '').replace(/\n/g, ', ');
  const subject = `${m.map(r => SUBJ[typeOf(r)]).join(', ')} – ${(r0.jobAddress || '').split('\n')[0]}`;
  const text = `Hi ${first},\n\nPlease find attached your records for ${addr}, carried out on ${ukDate(r0.inspectionDate)}:\n${m.map(r => `- ${docLine(r)}`).join('\n')}\n\nKind regards,\n${signOff()}`;
  try {
    if (navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files, title: subject, text }); return; }
  } catch (err) { if (err.name === 'AbortError') return; console.warn(err); }
  m.forEach(r => downloadPdf(r));
  location.href = `mailto:${encodeURIComponent(r0.customer.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text + '\n\n(Attach the downloaded PDFs)')}`;
}
function downloadPdf(r) {
  r = r || ui.rec; const p = ui.pdfs[r.id];
  const a = document.createElement('a'); a.href = URL.createObjectURL(p.blob); a.download = p.name; document.body.appendChild(a); a.click(); a.remove();
}
/* ---------- export / backup ---------- */
async function saveFile(content, name, mime) {
  const blob = new Blob([content], { type: mime }), file = new File([blob], name, { type: mime });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; } }
  catch (err) { if (err.name === 'AbortError') return; console.warn(err); }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
function exportCustomers() {
  if (!customers.length) { toast('No customers to export yet'); return; }
  const q = v => '"' + String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ', ') + '"';
  const rows = [['Name', 'Phone', 'Email', 'Billing address', 'Property addresses']].concat(
    [...customers].sort((a, b) => a.name.localeCompare(b.name)).map(c => [c.name, c.phone, c.email, c.billing, (c.properties || []).join(' | ')]));
  saveFile('\ufeff' + rows.map(r => r.map(q).join(',')).join('\r\n'), `Customers ${todayISO()}.csv`, 'text/csv');
}
async function exportBackup() {
  const { syncToken, ...keep } = settings;
  const strip = o => { const c = { ...o }; delete c._dirty; return c; };
  const photos = {};
  for (const r of records) for (const id of PH.allIds(r)) { if (!photos[id]) { const p = await PH.get(id); if (p) photos[id] = p; } }
  const data = { app: 'omb-gas', version: 1, exported: new Date().toISOString(), settings: keep, customers: customers.map(strip), records: records.map(strip), invoices, photos };
  saveFile(JSON.stringify(data), `OMB backup ${todayISO()}.json`, 'application/json');
}
async function restoreBackup(file) {
  try {
    const d = JSON.parse(await file.text());
    if (d.app !== 'omb-gas') throw new Error('not an OMB backup');
    let addC = 0, addR = 0;
    for (const [id, p] of Object.entries(d.photos || {})) { if (!(await PH.get(id))) await PH.put(id, p); }
    (d.invoices || []).forEach(i => { const l = invoices.find(x => x.id === i.id); if (!l) invoices.push(i); else if ((i.updated || 0) > (l.updated || 0)) Object.assign(l, i); });
    saveInvoices();
    (d.customers || []).forEach(c => { const l = customers.find(x => x.id === c.id); if (!l) { customers.push(c); addC++; } else if ((c.updated || 0) > (l.updated || 0)) Object.assign(l, c); });
    (d.records || []).forEach(r => { const l = records.find(x => x.id === r.id); if (!l) { records.push(r); addR++; } else if ((r.updated || 0) > (l.updated || 0)) Object.assign(l, r); });
    Object.entries(d.settings || {}).forEach(([k, v]) => { if (k !== 'syncToken' && v && !settings[k]) settings[k] = v; });
    saveCustomers(); saveRecords(); saveSettings(); render();
    toast(`Restored ${addC} customer${addC === 1 ? '' : 's'} and ${addR} record${addR === 1 ? '' : 's'}`);
  } catch (err) { toast('That file is not a valid backup'); }
}

/* ---------- cloud sync (see cloud.js) ---------- */
const paintSync = () => CLOUD.paint();
const syncAll = manual => CLOUD.sync(manual);
const deleteRemote = (kind, id) => CLOUD.del(kind, id);
const blobB64 = blob => new Promise(res => { const f = new FileReader(); f.onload = () => res(f.result.split(',')[1]); f.readAsDataURL(blob); });

/* ---------- keep the focused field visible when the phone keyboard opens ---------- */
(function keyboardFriendly() {
  const isField = el => el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && el.type !== 'file';
  const reveal = () => { const el = document.activeElement; if (isField(el)) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
  document.addEventListener('focusin', e => { if (isField(e.target)) { setTimeout(reveal, 120); setTimeout(reveal, 450); } });   // again once the keyboard has finished sliding up
  const vv = window.visualViewport;
  if (vv) {
    const onVV = () => {
      const kb = window.innerHeight - vv.height - vv.offsetTop > 120;
      document.body.classList.toggle('kb', kb);
      if (kb) reveal();
    };
    vv.addEventListener('resize', onVV); vv.addEventListener('scroll', onVV);
  }
})();

/* ---------- start ---------- */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => { });
window.addEventListener('online', () => syncAll());
window.__app = { invoices: () => invoices, newInvoice, invTotals, buildInvPdf, ui, get settings() { return settings; }, get records() { return records; }, get customers() { return customers; }, render, validate, buildPdf, newRecord, blankAppliance, blankDefect, mates, jobRecs, jobSeq, startJob, goTo, SVC, LEG };
applyBrand();
render();
CLOUD.start();
