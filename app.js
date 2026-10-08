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
  type: ['Combi boiler', 'Regular boiler', 'System boiler', 'Cooker', 'Hob', 'Fire', 'Oven', 'Other'],
  ownership: ['Landlord', 'Homeowner', 'Tenant'],
  flue: ['Room Sealed FF (fanned flue)', 'Room Sealed BF (balanced flue)', 'Open Flue', 'Flueless', 'Vertex'],
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
const isCom = r => !!r && r.type === 'commission';
const isQuo = r => !!r && r.type === 'quote';
const typeOf = r => (r && r.type) || 'gas';
const stepsOf = r => (isLeg(r) ? LEG.STEPS : isSvc(r) ? SVC.STEPS : isWarn(r) ? WARN.STEPS : isAc(r) ? AC.STEPS : isCom(r) ? COM.STEPS : isQuo(r) ? QUO.STEPS : STEPS);
const ORDER = { gas: 0, service: 1, legionella: 2, aircon: 3, commission: 4, warning: 5, quote: 6 };
const FORM_NAME = { gas: 'Gas safety record', service: 'Boiler service record', legionella: 'Legionella risk assessment', aircon: 'Air conditioning commissioning report', commission: 'Boiler commissioning checklist', quote: 'Boiler quotation', warning: 'Danger / Do Not Use warning notice' };
const FORM_SHORT = { gas: 'Gas check', service: 'Boiler service', legionella: 'Legionella', aircon: 'Air conditioning', commission: 'Boiler commissioning', quote: 'Quotation', warning: 'Warning notice' };
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
const SUBJ = { gas: 'Landlord Gas Safety Check', service: 'Boiler Service', legionella: 'Legionella Risk Assessment', aircon: 'Air Conditioning Commissioning', commission: 'Boiler Commissioning Checklist', quote: 'Boiler Quotation', warning: 'Danger Do Not Use Warning Notice' };
const FORM_DOC = {
  gas: ['Gas Safety Record', 'Your next safety check is due by'],
  service: ['Gas Boiler Service Record', 'Your next boiler service is due by'],
  legionella: ['Legionella Risk Assessment', 'Your next assessment is due by'],
  aircon: ['Air Conditioning Commissioning Report', ''],
  commission: ['Boiler Commissioning Checklist', 'Your next boiler service is due by'],
  quote: ['Boiler Quotation', ''],
  warning: ['Danger Do Not Use Warning Notice', '']
};
/* one line per document in the emails; the warning notice has no due date */
const docLine = r => (FORM_DOC[typeOf(r)][1] ? `${FORM_DOC[typeOf(r)][0]} (${FORM_DOC[typeOf(r)][1].replace(/^Your /, '').replace(/ is due by$/, '')} due ${ukDate(r.renewal)})` : FORM_DOC[typeOf(r)][0]);
const billable = m => (m ? m.filter(r => typeOf(r) !== 'warning' && typeOf(r) !== 'quote') : m);

/* appliance type on the gas safety record: "Other" has its own text box (typeOther); older records may hold older type names, which still display */
const COOK_MAKES = ['Indesit', 'Whirlpool', 'Hotpoint', 'AEG', 'Lamona', 'Bosch', 'Beko'];
const FIRE_MAKES = ['Valor', 'Flavel', 'Focal Point', 'Robinson Willey'];
const typeText = a => (a.type === 'Other' ? (String(a.typeOther || '').trim() || 'Other') : (a.type || ''));
const isBoilerType = t => /boiler/i.test(String(t || ''));
const makesFor = t => (isBoilerType(t) || !t ? SVC.MAKE.filter(x => x !== 'Other') : /^(cooker|hob|oven|range cooker)$/i.test(t) ? COOK_MAKES : /^fire$/i.test(t) ? FIRE_MAKES : t === 'Other' ? [] : SVC.MAKE.filter(x => x !== 'Other'));
const blankAppliance = () => ({
  location: '', locationOther: '', type: '', typeOther: '', manufacturer: '', model: '', gc: '', ownership: 'Landlord', flue: '', serviced: '',
  test: '', op: '', hi: '', safety: '', vent: '', terminal: '', flueOp: '',
  ratioMin: '', coMin: '', co2Min: '', ratioMax: '', coMax: '', co2Max: '', safe: ''
});
const blankDefect = () => ({ text: '', cls: '', action: '' });

/* ---------- persistent state ---------- */
const DEFAULT_SETTINGS = {
  businessName: '', logo: '', accent: '#c9a24b', refPrefix: 'REC', updated: 0, address: '', phone: '', email: '',
  gasSafeReg: '', engineerName: '', gasSafeId: '', engSig: '', syncUrl: '', syncToken: '', gasSafeLogo: '', gasSafeLogoAR: 1,
  priceGas: '', priceSvc: '', priceLeg: '', priceAc: '', priceCom: '', quoteIncluded: QUO.DEFAULT_INCLUDED, quoteTerms: QUO.DEFAULT_TERMS, qItemsText: '', qList: [], qMarkup: {}, qMarkupDef: '30', discType: '£', discValue: '',
  invPrefix: 'INV-', invNext: '1', invDigits: '3', payDays: '14', vatReg: 'Yes', vatRate: '20', vatNumber: '', vatQtr: '2', yearDay: '6', yearMonth: '4',
  bankName: '', accName: '', sortCode: '', accNo: '', invFooter: 'Thank you for your business.',
  remText: '', remDays: '56', toolGas: 'on', toolPipe: 'on', toolIv: 'on', toolHeat: 'on'
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
  const w = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!w.length) return 'logo.svg';   // OMB flame mark until the engineer adds their own name/logo
  const t = ((w[0][0] || '') + ((w[1] || '')[0] || '')).toUpperCase().replace(/[^A-Z0-9&]/g, '') || 'OMB';
  const cv = document.createElement('canvas'); cv.width = cv.height = 200; const c = cv.getContext('2d');
  c.fillStyle = '#0c0e10'; c.fillRect(0, 0, 200, 200); c.fillStyle = '#d9b25f';
  c.font = '800 96px "Bricolage Grotesque",Helvetica,Arial,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, 100, 106);
  return cv.toDataURL('image/png');
}
function mixHex(h, to, k) { const n = x => parseInt(h.slice(x, x + 2), 16); return '#' + [1, 3, 5].map(i => Math.round(n(i) + (to - n(i)) * k).toString(16).padStart(2, '0')).join(''); }
let _brandKey = '';
function applyBrand() {
  const key = [settings.logo && settings.logo.length, settings.businessName].join('|');
  if (key === _brandKey) return; _brandKey = key;
  const name = settings.businessName || 'OMB Gas Service', img = document.querySelector('.bar-logo'), st = document.querySelector('.bar-title strong');
  if (img) img.src = settings.logo || placeholderLogo(settings.businessName);
  if (st) st.textContent = name;
  document.title = name;
  const a = '#c9a24b';   // the gold theme is fixed
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
function newQuoRecord(customer) {
  const d = todayISO();
  const n = records.filter(r => typeOf(r) === 'quote' && r.inspectionDate === d).length + 1;
  return {
    id: uid(), type: 'quote', ref: 'QUO-' + d.replace(/-/g, '') + '-' + String(n).padStart(2, '0'),
    status: 'draft', inspectionDate: d, renewal: '',
    customerId: customer?.id || '', customer: { name: customer?.name || '', phone: customer?.phone || '', email: customer?.email || '', billing: customer?.billing || '' },
    jobAddress: '', ...QUO.blank(),
    customerPresent: '', customerName: '', customerSig: '', engineerSig: '',
    updated: Date.now(), _dirty: true
  };
}
function newComRecord(customer) {
  const d = todayISO();
  const n = records.filter(r => typeOf(r) === 'commission' && r.inspectionDate === d).length + 1;
  return {
    id: uid(), type: 'commission', ref: 'COM-' + d.replace(/-/g, '') + '-' + String(n).padStart(2, '0'),
    status: 'draft', inspectionDate: d, renewal: plusYear(d),
    customerId: customer?.id || '', customer: { name: customer?.name || '', phone: customer?.phone || '', email: customer?.email || '', billing: customer?.billing || '' },
    jobAddress: '', ...COM.blank(),
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
  if (type === 'commission') return newComRecord(customer);
  if (type === 'quote') return newQuoRecord(customer);
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
  const pk = ui.pick, types = ['gas', 'service', 'legionella', 'aircon', 'commission', 'quote'].filter(t => pk.types[t]);
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
  if (isCom(rec)) return COM.validate(rec);
  if (isQuo(rec)) return QUO.validate(rec);
  if (isSvc(rec)) return SVC.validate(rec);
  if (isWarn(rec)) return WARN.validate(rec);
  const out = []; const need = (step, path, label, extra = {}) => { if (!String(getP(rec, path) ?? '').trim()) out.push({ step, path, label, ...extra }); };
  need(0, 'customer.name', 'Customer name'); need(0, 'jobAddress', 'Job address');
  rec.appliances.slice(0, +rec.applianceCount || 1).forEach((a, i) => {
    const P = k => `appliances.${i}.${k}`, n = `Appliance ${i + 1}: `;
    const A = { app: i };
    need(1, P('location'), n + 'location', A);
    if (a.location === 'Other') need(1, P('locationOther'), n + 'location (other)', A);
    need(1, P('type'), n + 'type', A); if (a.type === 'Other') need(1, P('typeOther'), n + 'type (other)', A); need(1, P('manufacturer'), n + 'manufacturer', A); need(1, P('model'), n + 'model', A);
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
  if (isCom(rec)) return COM.warnings(rec, settings);
  if (isQuo(rec)) return QUO.warnings(rec, settings);
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
    <button type="button" id="tightGo" class="btn block ${tightRunning(r) ? 'gold' : ''}" style="margin:2px 0 6px" data-act="tightTimer" ${tightNeedsStart(r) ? 'disabled' : ''}>${tightRunning(r) ? 'Stop timer' : 'Start timer'}</button>
    <small id="tightHint" style="display:block;margin-bottom:6px;${tightNeedsStart(r) ? 'color:var(--warn)' : ''}">${tightNeedsStart(r) ? 'Enter the start pressure, then press Start. Press Stop when the test time is up, then enter the end pressure.' : 'Press Start, then Stop when the test time is up and enter the end pressure.'}</small>
    ${clockHtml('tt-' + r.id)}
    <div class="f"><span>Test duration</span>
      <div class="row" style="align-items:flex-end">
        <div class="grow"><input data-tm="m" type="text" inputmode="numeric" value="${esc(tightParts(r).m)}" placeholder="min" autocomplete="off"><small>minutes</small></div>
        <div class="grow"><input data-tm="s" type="text" inputmode="numeric" value="${esc(tightParts(r).s)}" placeholder="sec" autocomplete="off"><small>seconds</small></div></div>
      <small>Fills in by itself from the timer – or type it in.</small></div>
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
  return msg + rowv('Gas rate', g ? g.m3h.toFixed(3) : '', 'm³/hr') + rowv('H.I. gross', gr, 'kW') + rowv('H.I. net', nt, 'kW') + (g && !s.target ? `<p class="small muted" style="margin:8px 0 0">Compare the net figure with the net heat input on the data plate.</p>` : '') + (g && s.target ? `
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
const calcNeedsStart = s => false; // timer can start any time; readings can be typed afterwards
function calcPanel(id, target) {
  const s = calcState(id); s.target = target;
  const btn = `<button type="button" class="btn calcbtn" data-act="calcToggle" data-id="${id}">${s.open ? 'Hide gas rate calculator' : 'Gas rate calculator'}</button>`;
  if (!s.open) return btn;
  const unitBtn = (u, label) => `<button type="button" class="${s.unit === u ? 'on' : ''}" data-act="calcSet" data-id="${id}" data-key="unit" data-val="${u}">${label}</button>`;
  return btn + `<div class="calc">
    <div class="f"><span>Meter type</span><div class="seg">${unitBtn('m³', 'Metric (m³)')}${unitBtn('ft³', 'Imperial (ft³)')}</div></div>
    <div class="row"><div class="grow f"><span>First reading (${s.unit})</span><input data-calc="${id}.start" type="text" inputmode="decimal" value="${esc(s.start)}" placeholder="e.g. 4.478" autocomplete="off"></div>
      <div class="grow f"><span>Second reading (${s.unit})</span><input data-calc="${id}.end" type="text" inputmode="decimal" value="${esc(s.end)}" placeholder="e.g. 4.562" autocomplete="off"></div></div>
    <div class="row" style="align-items:center;margin-bottom:12px">
      <button type="button" id="calcGo-${id}" class="btn ${s.t0 ? 'gold' : ''}" style="flex:0 0 42%;height:64px;font-size:20px;font-weight:700" data-act="calcTimer" data-id="${id}" ${calcNeedsStart(s) ? 'disabled' : ''}>${s.t0 ? 'Stop' : 'Start'}</button>
      <div class="grow" style="text-align:right"><div class="clock" style="font-size:34px;margin:0" data-clock="${esc(id)}">${fmtClock(clockMs(s))}</div></div></div>
    <div class="small" id="calcHint-${id}" style="color:var(--warn);margin:-4px 0 12px">${calcNeedsStart(s) ? 'Enter the first meter reading before you start the timer.' : ''}</div>
    <div class="f"><span>Time taken (min:sec.ms) – filled in when you stop the timer</span>
      <input data-calc="${id}.secs" type="text" inputmode="decimal" value="${esc(s.secs)}" placeholder="00:00.000" autocomplete="off"></div>
    <div class="small muted" id="calcVol-${id}" style="margin:-4px 0 12px">${calcVolHtml(s)}</div>
    <div class="calcres" id="calcRes-${id}">${calcResHtml(id)}</div>
    <div class="f" style="margin:12px 0 0"><span>CV value (MJ/m³)</span>
      <input data-calc="${id}.cv" type="text" inputmode="decimal" value="${esc(s.cv)}" autocomplete="off"><small>Natural gas. Saved for next time.</small></div></div>`;
}

/* ---------- field builders ---------- */
const bad = (o, v) => ui.showErr && o.req && !String(v ?? '').trim();
/* UK dates: a day/month/year box you can type in, plus a calendar button. The real value stays yyyy-mm-dd underneath. */
const ukDisp = iso => (/^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso.split('-').reverse().join('/') : '');
const dateInp = (attrs, iso) => `<div class="dt"><input type="text" class="dtx" inputmode="numeric" maxlength="10" placeholder="dd/mm/yyyy" value="${ukDisp(iso)}" autocomplete="off"><span class="dtb"><svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg><input type="date" class="dth" ${attrs} value="${esc(iso || '')}" aria-label="Pick a date" tabindex="-1"></span></div>`;
function dtxInput(t, e) {
  const d = t.value.replace(/\D/g, '').slice(0, 8);
  let out = d.length > 4 ? d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4) : d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
  if (e && e.inputType && e.inputType.startsWith('delete')) out = out.replace(/\/$/, '');
  t.value = out;
  const nat = t.parentNode.querySelector('.dth'); let iso = '', ok = true;
  if (d.length === 8) {
    const dd = +d.slice(0, 2), mm = +d.slice(2, 4), yy = +d.slice(4), dt = new Date(Date.UTC(yy, mm - 1, dd));
    if (yy >= 1900 && dt.getUTCFullYear() === yy && dt.getUTCMonth() === mm - 1 && dt.getUTCDate() === dd) iso = isoOf(yy, mm - 1, dd); else ok = false;
  } else if (d.length) ok = false;
  t.style.borderColor = ok || d.length < 8 ? '' : 'var(--bad)';
  if (iso && nat.value !== iso) setDateVal(nat, iso);
}
function setDateVal(nat, iso) { nat.value = iso; nat.dispatchEvent(new Event('input', { bubbles: true })); nat.dispatchEvent(new Event('change', { bubbles: true })); }
/* leaving a date box: an empty box clears the date (except the print period), anything half-typed goes back to the saved date */
document.addEventListener('focusout', e => {
  const t = e.target; if (!(t.classList && t.classList.contains('dtx'))) return;
  const nat = t.parentNode.querySelector('.dth');
  if (!t.value.trim() && nat.value && !nat.dataset.pd) { setDateVal(nat, ''); return; }
  if (t.value !== ukDisp(nat.value)) { t.value = ukDisp(nat.value); t.style.borderColor = ''; }
});
/* an address box with its own postcode box underneath. The two are stored together as one text value (postcode on the last line),
   so every PDF, email and export keeps working. src says where it is saved: rec = this record, inv = this invoice, set = settings, cust = customer. */
function addrBox(src, path, label, o = {}) {
  const v = (src === 'rec' ? getP(ui.rec, path) : src === 'inv' ? getP(ui.inv, path) : src === 'set' ? settings[path] : src === 'cprop' ? (ui.cust.properties || [])[+path] : ui.cust[path]) ?? '';
  const { addr, pc } = splitAddr(v);
  return `<div class="f addrw ${src === 'rec' && bad(o, v) ? 'bad' : ''}" data-f="${path}" data-src="${src}" data-path="${path}"><span>${label}${o.req ? ' <b>*</b>' : ''}</span>
    <textarea rows="${o.rows || 3}" placeholder="${esc(o.ph || '')}">${esc(addr)}</textarea>
    <input class="pc" type="text" placeholder="Postcode" maxlength="9" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Postcode" value="${esc(pc)}">${o.hint ? `<small>${o.hint}</small>` : ''}</div>`;
}
function addrInput(w, t) {
  if (t.classList.contains('pc')) t.value = t.value.toUpperCase();
  const v = joinAddr(w.querySelector('textarea').value, w.querySelector('.pc').value), src = w.dataset.src, path = w.dataset.path;
  if (src === 'rec') {
    setP(ui.rec, path, v); ui.pdf = null; persistRecSoon();
    if (path === 'jobAddress') {
      const nb = document.getElementById('navBtn'); if (nb) nb.innerHTML = navBtnHtml(v);
      const el = document.getElementById('addrSug'); if (el) el.innerHTML = v.trim().length >= 2 ? sugHtml(ui.rec, v) : '';
    }
  } else if (src === 'inv') {
    setP(ui.inv, path, v); persistInvSoon();
    if (path === 'jobAddress') { const sg = document.getElementById('invAddrSug'); if (sg) sg.innerHTML = v.trim().length >= 2 ? sugHtml(ui.inv, v, 'invPickSug') : ''; }
    const had = !!ui.invPdf; ui.invPdf = null; if (had) { const bx = $('#invPdfBox'); if (bx) bx.innerHTML = invPdfHtml(); }
  } else if (src === 'set') { settings[path] = v; saveSettings(); }
  else if (src === 'cust') ui.cust[path] = v;
  else if (src === 'cprop') { (ui.cust.properties = ui.cust.properties || [])[+path] = v; }
}
document.addEventListener('focusout', e => {      // tidy the postcode when you leave the box: ln12ab becomes LN1 2AB
  const t = e.target; if (!(t.classList && t.classList.contains('pc'))) return;
  const w = t.closest('.addrw'); if (!w) return;
  const f = fmtPostcode(t.value); if (f !== t.value) { t.value = f; addrInput(w, t); }
});
function txt(path, label, o = {}) {
  const v = getP(ui.rec, path) ?? '';
  const el = o.type === 'date' ? dateInp(`data-k="${path}"`, v) : o.area
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
function makeField(path, i, type) {
  const brands = makesFor(type);
  const v = String(getP(ui.rec, path) ?? '').trim();
  const hit = brands.find(x => x.toLowerCase() === v.toLowerCase());
  const key = ui.rec.id + '.' + i;
  const other = !hit && (v !== '' || (ui.mfrOther && ui.mfrOther[key]));
  const bd = ui.showErr && !v;
  return `<div class="f ${bd ? 'bad' : ''}" data-f="${path}"><span>Manufacturer <b>*</b></span><div class="seg wrap">` +
    brands.map(x => `<button type="button" class="${hit === x ? 'on' : ''}" data-k="${path}" data-v="${esc(x)}">${esc(x)}</button>`).join('') +
    (brands.length ? `<button type="button" class="${other ? 'on' : ''}" data-act="mfrOther" data-path="${path}" data-i="${i}">Other</button>` : '') + `</div></div>` +
    (other || !brands.length ? txt(path, brands.length ? 'Manufacturer (other)' : 'Manufacturer', { req: 1 }) : '');
}

/* "Age unknown" tick on the boiler service: stored as the text "Unknown" so the PDF and sheet show it as is */
const ageUnknown = r => String(r.age || '').trim().toLowerCase() === 'unknown';

/* ---------- screens ---------- */
/* text boxes grow to fit what is typed, so they never need scrolling */
function fitBox(t) { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; }
function fitBoxes() { document.querySelectorAll('#view textarea').forEach(fitBox); }
document.addEventListener('input', e => { if (e.target && e.target.tagName === 'TEXTAREA') fitBox(e.target); });
function render() {
  const v = $('#view'), nav = $('#nav');
  window.scrollTo(0, 0);
  if (ui.view !== 'home' && typeof instPopClose === 'function') instPopClose();   // the install pop-up must never cover the Next / Back buttons
  if (ui.view === 'form') { renderForm(v, nav); }
  else {
    ({ home: renderHome, pick: renderPick, customers: renderCustomers, custEdit: renderCustEdit, settings: renderSettings, invoices: renderInvoices, invEdit: renderInvEdit, invPrint: renderInvPrint, admin: renderAdmin, prices: renderPrices, help: renderHelp, news: renderNews, feedback: renderFeedback, due: renderDue, tools: renderTools }[ui.view])(v);
    renderTabs(nav);
  }
  paintSync();
  fitBoxes();
  PH.hydrate();
  if (ui.view === 'settings') checkVersion();
}
PH.tidy(records).then(n => { if (n) saveRecords(); }).catch(() => { });
const ICON = {
  rec: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
  cust: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  inv: '<svg viewBox="0 0 24 24"><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/></svg>',
  tools: '<svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5l-6 6a1.9 1.9 0 0 0 2.7 2.7l6-6a4 4 0 0 0 5-5.4l-2.5 2.5-2.1-.5-.5-2.1z"/></svg>',
  set: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2L10 21h4l.6-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/></svg>'
};
function renderTabs(nav) {
  nav.className = 'tabs';
  const t = (id, label, ic, on) => `<button data-nav="${id}" class="${on ? 'on' : ''}">${ic}${label}</button>`;
  nav.innerHTML = t('home', 'Records', ICON.rec, ui.view === 'home' || ui.view === 'pick' || ui.view === 'due') + t('customers', 'Customers', ICON.cust, ui.view === 'customers' || ui.view === 'custEdit') + t('invoices', 'Invoices', ICON.inv, ui.view === 'invoices' || ui.view === 'invEdit' || ui.view === 'invPrint') + (['gas', 'pipe', 'iv', 'heat'].some(toolOn) ? `<button data-act="toolsOpen" class="${ui.view === 'tools' ? 'on' : ''}">${ICON.tools}Tools</button>` : '') + t('settings', 'Settings', ICON.set, ui.view === 'settings' || ui.view === 'prices' || ui.view === 'admin' || ui.view === 'help' || ui.view === 'news' || ui.view === 'feedback');
  $('#barSub').textContent = ui.view === 'invoices' || ui.view === 'invEdit' || ui.view === 'invPrint' ? 'Invoices' : 'Gas & Legionella records';
}

/* invoice reminder shown on completed records: green once the invoice has been sent, otherwise a reminder */
function invBadge(r) {
  if (r.status !== 'complete' || typeOf(r) === 'warning' || r.noInvoice) return '';
  const inv = invoices.find(i => (i.recIds || []).includes(r.id));
  if (inv && inv.paid) return '<span class="badge paid">Paid</span>';
  if (inv && inv.sent) return '<span class="badge invd">Invoiced</span>';
  return inv ? '<span class="badge reqinv">Invoice not sent</span>' : '<span class="badge reqinv">Requires invoice</span>';
}
function trialBanner() {
  if (!CLOUD.on) return '';
  const a = CLOUD.access();
  if (CLOUD.locked()) return `<div class="notice err">Your subscription has ended. You can still view, download and export your records, but not create or change them.<div style="height:8px"></div><button class="btn gold block" data-act="billing">Subscribe to continue</button></div>`;
  if (a.trial && a.days <= 5) return `<div class="notice">Your free trial ends in ${a.days} day${a.days === 1 ? '' : 's'}. <a href="#" data-nav="settings" style="color:inherit;font-weight:700">Subscribe in Settings</a> to keep going.</div>`;
  if (a.pastDue) return `<div class="notice err">Your last payment failed. Update your card in <a href="#" data-nav="settings" style="color:inherit;font-weight:700">Settings</a>.</div>`;
  return '';
}
/* monthly backup reminder: dates are kept on this phone only (the backup file is saved from this phone too) */
const BK_KEY = 'omb_backup';
const bkGet = () => { try { return JSON.parse(localStorage.getItem(BK_KEY)) || {}; } catch (e) { return {}; } };
const bkSet = o => { try { localStorage.setItem(BK_KEY, JSON.stringify(Object.assign(bkGet(), o))); } catch (e) { } };
const daysBetween = (a, b) => Math.floor((Date.parse(b) - Date.parse(a)) / 864e5);
function bkDue() {
  if (!records.length && !customers.length && !invoices.length) return null;
  const b = bkGet(), today = todayISO();
  if (!b.last && !b.start) { bkSet({ start: today }); return null; }
  if (b.snooze && b.snooze > today) return null;
  const since = daysBetween(b.last || b.start, today);
  return since >= 30 ? { last: b.last || '', days: since } : null;
}
function bkBanner() {
  const d = bkDue(); if (!d) return '';
  return `<div class="notice">Time for your monthly backup. ${d.last ? 'Your last one was on ' + ukDate(d.last) + '.' : 'You have not made one yet.'} Save the file somewhere safe, like your email or cloud storage.<div style="height:8px"></div><button class="btn gold block" data-act="expAll">Back up now</button><div style="height:6px"></div><button class="btn block ghost" data-act="bkLater">Remind me in a week</button></div>`;
}
function renderHome(v) {
  const missing = !settings.address || !settings.gasSafeReg || !settings.engineerName || !settings.gasSafeId;
  const list = [...records].sort((a, b) => b.updated - a.updated);
  v.innerHTML = `
    <h1>Records</h1>
    ${trialBanner()}
    ${bkBanner()}
    ${newsBanner()}
    ${missing ? `<div class="notice">Add the business address, Gas Safe register number and engineer details in <a href="#" data-nav="settings" style="color:inherit;font-weight:700">Settings</a> before issuing certificates.</div>` : ''}
    <button class="btn gold block" data-act="newRec" data-type="gas">+ New gas safety record</button>
    <div style="height:10px"></div>
    <button class="btn gold block" data-act="newRec" data-type="service">+ New boiler service record</button>
    <div style="height:10px"></div>
    <button class="btn gold block" data-act="newRec" data-type="legionella">+ New Legionella risk assessment</button>
    <div style="height:10px"></div>
    <button class="btn gold block" data-act="newRec" data-type="aircon">+ New air conditioning commissioning</button>
    <div style="height:10px"></div>
    <button class="btn gold block" data-act="newRec" data-type="quote">+ New boiler quote</button>
    <div style="height:10px"></div>
    ${remHomeBtn()}
    
    <h2>Recent</h2>
    ${list.length ? list.slice(0, 5).map(r => `${r.status === 'draft' ? '<div class="itemw">' : ''}
      <button class="item" data-act="openRec" data-id="${r.id}">
        <div class="row sp"><span class="t">${esc(r.customer.name || 'No customer yet')}</span><span class="badges"><span class="badge ${r.status}">${r.status}</span>${invBadge(r)}</span></div>
        <div class="s">${esc(addrFirst(r.jobAddress || '') || 'No address yet')}</div>
        <div class="s">${FORM_SHORT[typeOf(r)]} · ${esc(r.ref)} · ${ukDate(r.inspectionDate)}${r._dirty ? ' · not synced' : ''}</div>
      </button>${r.status === 'draft' ? `<button class="draftdel" data-act="delDraft" data-id="${r.id}">Delete draft</button></div>` : ''}`).join('') : `<div class="empty">No records yet.<br>Tap one of the buttons above to start.<br>You can do several forms for one customer in a single visit.</div>`}
    ${list.length > 5 ? `<p class="small muted" style="text-align:center">Showing the last 5 jobs. Older ones are under <a href="#" data-nav="customers" style="color:inherit;font-weight:700">Customers</a> – tap a customer to see all their jobs.</p>` : ''}`;
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
    ${opt('quote', 'Boiler quote', 'A quotation for a new boiler installation')}
    ${T.gas && !T.service ? `<div class="notice">Doing a gas safety check? Tick <b>Boiler service record</b> as well to complete both forms in one go – the boiler details from the gas check are copied across.</div>` : ''}
    <button class="btn block" data-act="pickAll">Landlord visit: gas check, boiler service &amp; Legionella</button>
    <div style="height:10px"></div>
    <button class="btn gold block" data-act="pickGo" ${n ? '' : 'disabled'}>${n > 1 ? `Start ${n} forms (${n} PDFs)` : 'Start'}</button>
    <div style="height:10px"></div>
    <button class="btn ghost block" data-act="pickCancel">Cancel</button>`;
}

function renderCustomers(v) {
  v.innerHTML = `
    <h1>Customers</h1>
    <input class="search" id="custSearch" placeholder="Search name, phone, address, invoice or cert no." value="${esc(ui.search)}">
    <div class="seg custsort" style="margin-bottom:12px">${[['az', 'A–Z'], ['used', 'Most used'], ['fav', '♥ Favourites']].map(([k, l]) => `<button type="button" data-act="custSort" data-s="${k}" class="${custSort() === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div id="custList"></div>
    <button class="btn gold fab" data-act="newCust">+ Customer</button>`;
  paintCustList();
}
function custSort() { try { return localStorage.getItem('omb_custsort') || 'az'; } catch (e) { return 'az'; } }
const custUses = c => records.filter(r => r.customerId === c.id).length;
/* favourites first, then alphabetical – used by the customer drop-downs */
const custAlpha = (a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0) || a.name.localeCompare(b.name);
const telHref = p => 'tel:' + String(p || '').replace(/[^\d+]/g, '');
function paintCustList() {
  const q = ui.search.toLowerCase(), mode = custSort();
  const uses = {}; customers.forEach(c => { uses[c.id] = custUses(c); });
  /* search covers name, phone (with or without spaces), email, billing address, saved property addresses AND the address of every job done for them */
  const toks = q.split(/\s+/).filter(Boolean), digits = t => t.replace(/\D/g, '');
  const addrsOf = c => { const out = new Set(c.properties || []); records.forEach(r => { if (r.jobAddress && (r.customerId === c.id || (!r.customerId && String(r.customer.name || '').trim().toLowerCase() === String(c.name || '').trim().toLowerCase()))) out.add(r.jobAddress); }); return [...out].filter(Boolean); };
  /* reference numbers: certificate / record refs of this customer's jobs and their invoice numbers */
  const sameCust = (x, c) => x.customerId === c.id || (!x.customerId && String((x.customer || {}).name || '').trim().toLowerCase() === String(c.name || '').trim().toLowerCase() && String(c.name || '').trim());
  const refsOf = c => records.filter(r => sameCust(r, c)).map(r => ({ t: (r.ref || ''), l: FORM_SHORT[typeOf(r)] + ' ' + (r.ref || '') }))
    .concat(invoices.filter(i => sameCust(i, c)).map(i => ({ t: (i.number || ''), l: 'Invoice ' + (i.number || '') }))).filter(x => x.t);
  const refHit = {};
  const hit = {};
  const matches = c => {
    if (!toks.length) return true;
    const addrs = addrsOf(c), base = [c.name, c.phone, c.email, c.billing].join(' ').toLowerCase(), ph = digits(String(c.phone || ''));
    const adr = addrs.join(' ').toLowerCase().replace(/\s+/g, ' '), refs = refsOf(c), refTxt = refs.map(x => x.t.toLowerCase()).join(' ');
    const ok = toks.every(t => base.includes(t) || adr.includes(t) || refTxt.includes(t) || (digits(t).length >= 3 && digits(t) === t.replace(/[\s-]/g, '') && ph.includes(digits(t))));
    if (ok) { const rh = refs.filter(x => toks.some(t => x.t.toLowerCase().includes(t))); if (rh.length && !toks.every(t => base.includes(t) || adr.includes(t))) refHit[c.id] = rh.slice(0, 3).map(x => x.l).join(', ') + (rh.length > 3 ? ' +' + (rh.length - 3) + ' more' : ''); }
    if (ok) { const a = addrs.find(x => toks.some(t => x.toLowerCase().replace(/\s+/g, ' ').includes(t))); if (a && !toks.every(t => base.includes(t))) hit[c.id] = a; }
    return ok;
  };
  let l = customers.filter(c => (mode !== 'fav' || c.fav) && matches(c));
  l.sort(mode === 'used' ? (a, b) => uses[b.id] - uses[a.id] || a.name.localeCompare(b.name) : (a, b) => a.name.localeCompare(b.name));
  $('#custList').innerHTML = l.length ? l.map(c => `
    <div class="item crow">
      <button type="button" class="cmain" data-act="editCust" data-id="${c.id}">
        <div class="t">${esc(c.name)}</div>
        <div class="s">${esc([c.phone, c.email].filter(Boolean).join(' · ') || 'No contact details')}${mode === 'used' ? ` · ${uses[c.id]} form${uses[c.id] === 1 ? '' : 's'}` : ''}</div>
        ${hit[c.id] ? `<div class="s" style="color:var(--gold2)">&#128205; ${esc(addrLine(hit[c.id]))}</div>` : ''}
        ${refHit[c.id] ? `<div class="s" style="color:var(--gold2)">&#128196; ${esc(refHit[c.id])}</div>` : ''}
      </button>
      ${String(c.phone || '').replace(/\D/g, '').length >= 5 ? `<a class="callb" href="${telHref(c.phone)}" aria-label="Call ${esc(c.name)}">&#128222;</a>` : ''}
      <button type="button" class="heart ${c.fav ? 'on' : ''}" data-act="favCust" data-id="${c.id}" aria-label="${c.fav ? 'Remove from favourites' : 'Add to favourites'}">${c.fav ? '♥' : '♡'}</button>
    </div>`).join('') : `<div class="empty">${!customers.length ? 'No customers yet. Add one here, or they are saved automatically when you complete a form.' : mode === 'fav' && !q ? 'No favourites yet. Tap the ♡ beside a customer to add one.' : 'No matches.'}</div>`;
}

/* every job done for a customer, newest first – shown when you open the customer */
function custJobs(c) {
  const nm = String(c.name || '').trim().toLowerCase();
  const list = records.filter(r => r.customerId === c.id || (!r.customerId && nm && String(r.customer.name || '').trim().toLowerCase() === nm))
    .sort((a, b) => String(b.inspectionDate).localeCompare(String(a.inspectionDate)) || (b.updated || 0) - (a.updated || 0));
  return `<h2>Previous jobs${list.length ? ' (' + list.length + ')' : ''}</h2>` + (list.length ? list.map(r => `<button class="item" data-act="openRec" data-id="${r.id}">
      <div class="row sp"><span class="t">${FORM_SHORT[typeOf(r)]}</span><span class="badges"><span class="badge ${r.status}">${r.status}</span>${invBadge(r)}</span></div>
      <div class="s">${esc(addrFirst(r.jobAddress || '') || 'No address')}</div>
      <div class="s">${esc(r.ref)} · ${ukDate(r.inspectionDate)}</div></button>`).join('') : '<p class="small muted">No jobs yet for this customer.</p>');
}
function renderCustEdit(v) {
  const c = ui.cust;
  v.innerHTML = `
    <h1>${c._new ? 'New customer' : 'Edit customer'}</h1>
    <div class="card">
      <label class="f"><span>Name <b>*</b></span><input data-c="name" value="${esc(c.name)}" autocomplete="off"></label>
      <label class="f"><span>Phone</span><input data-c="phone" type="tel" inputmode="tel" value="${esc(c.phone)}"></label>
      ${!c._new && String(c.phone || '').replace(/\D/g, '').length >= 5 ? `<a class="btn block" style="text-align:center;text-decoration:none;margin:-4px 0 12px" href="${telHref(c.phone)}">&#128222; Call ${esc(c.phone)}</a>` : ''}
      <label class="f"><span>Email</span><input data-c="email" type="email" inputmode="email" autocapitalize="none" value="${esc(c.email)}"></label>
      <button type="button" class="item tog ${c.noRemind ? 'on' : ''}" data-act="custNoRem" style="margin-bottom:12px"><span class="box"></span><span><span class="t">Never send reminder emails to this customer</span><span class="s" style="display:block">Applies to the automatic reminders. You can still text or email them yourself.</span></span></button>
      ${addrBox('cust', 'billing', 'Billing address')}
    </div>
    <h2>Property addresses</h2>
    ${(c.properties && c.properties.length ? c.properties : (c.properties = [''])).map((p, i) => `<div class="card">${addrBox('cprop', String(i), 'Property ' + (c.properties.length > 1 ? i + 1 : 'address'), { ph: 'House number and street, town' })}${c.properties.length > 1 || p ? `<button type="button" class="btn ghost" data-act="rmCustProp" data-i="${i}" style="margin-top:6px">Remove this property</button>` : ''}</div>`).join('')}
    <button type="button" class="btn block" data-act="addCustProp">+ Add another property address</button><div style="height:10px"></div>
    <button class="btn gold block" data-act="saveCust">Save customer</button>
    ${c._new ? '' : `<div style="height:10px"></div><button class="btn block" data-act="recForCust">Start forms for this customer</button>
      ${toolOn('gas') || toolOn('pipe') || toolOn('iv') || toolOn('heat') ? '<div style="height:10px"></div><button class="btn block" data-act="custTools">Tools and calculation report</button>' : ''}
    ${(c.properties || []).length && (c.properties || []).length <= 8 ? `<h2>Navigate</h2>` + c.properties.map(p => `<a class="item" style="display:block;text-decoration:none;color:inherit" href="${esc(mapsUrl(p))}" target="_blank" rel="noopener"><div class="t">&#128205; ${esc(addrFirst(p))}</div><div class="s">${esc(p.split('\n').slice(1).join(', ') || 'Open in Google Maps')}</div></a>`).join('') : ''}
    ${custReports(c)}
    ${custJobs(c)}
    <div style="height:10px"></div><button class="btn danger block" data-act="delCust">Delete customer</button>`}
    <div style="height:10px"></div><button class="btn ghost block" data-nav="customers">Back</button>`;
}

const APP_VERSION = 'v109';   // keep the same as CACHE in sw.js
async function checkVersion() {
  const el = $('#verNew'); if (!el) return;
  try {
    const t = await (await fetch('sw.js?x=' + Date.now(), { cache: 'no-store' })).text();
    const m = t.match(/omb-gas-(v\d+)/); el.textContent = m ? m[1] : 'unknown';
    if (m && m[1] !== APP_VERSION) el.style.color = 'var(--warn)';
  } catch (e) { el.textContent = 'offline'; }
}
async function forceUpdate() {
  const msg = t => { const e = $('#updMsg'); if (e) e.textContent = t; toast(t); };
  const btn = document.querySelector('[data-act=forceUpdate]'); if (btn) btn.disabled = true;
  let sw = '';
  try { sw = await (await fetch('sw.js?x=' + Date.now(), { cache: 'no-store' })).text(); }
  catch (e) { msg('Cannot reach the internet, so the update was not started. Try again with a signal.'); if (btn) btn.disabled = false; return; }
  const m = sw.match(/omb-gas-(v\d+)/), newest = m ? m[1] : '';
  if (!newest || navigator.onLine === false) { msg('Cannot reach the internet, so nothing was cleared. Try again with a signal.'); if (btn) btn.disabled = false; return; }   // never wipe the saved copy unless the new one can be fetched
  msg(newest && newest !== APP_VERSION ? `Updating from ${APP_VERSION} to ${newest}…` : `Online version is ${newest || 'unknown'}. Clearing this phone's saved copy…`);
  try { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r => r.unregister())); } catch (e) { }
  try { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch (e) { }
  /* the browser keeps its own short-lived copy of each file too: fetch every file fresh so the reload cannot pick up an old one */
  const files = ['./', ...[...sw.matchAll(/'([^']+\.(?:js|css|png|json|html))'/g)].map(x => x[1])];
  await Promise.all(files.map(f => fetch(f, { cache: 'reload' }).catch(() => { })));
  msg('Done – restarting the app…');
  setTimeout(() => location.replace(location.pathname + '?u=' + Date.now()), 400);
}

/* ---------- install to the home screen ---------- */
let _installEvt = null;
const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); _installEvt = e; if (ui.view === 'home' || ui.view === 'settings') render(); });
window.addEventListener('appinstalled', () => { _installEvt = null; if (ui.view === 'home' || ui.view === 'settings') render(); });
function installCard(force) {
  if (isStandalone() || (!force && LS.get('omb_noinstall', false))) return '';
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const how = _installEvt ? '<button class="btn gold block" data-act="installApp">Install on this phone</button>'
    : ios ? '<p class="small" style="margin:6px 0 0">In Safari tap the <b>Share</b> button (square with an arrow), then <b>Add to Home Screen</b>.</p>'
    : '<p class="small" style="margin:6px 0 0">Open your browser menu (the three dots) and tap <b>Install app</b> or <b>Add to Home screen</b>.</p>';
  return `<div class="notice">Put this app on your home screen so it opens like a normal app and works with no signal.${how}${force ? '' : '<div style="margin-top:8px"><a href="#" data-act="hideInstall" style="color:inherit;opacity:.7">Not now</a></div>'}</div>`;
}

/* ---------- "Install this app" pop-up (bottom sheet) ---------- */
let _instTries = 0;
function instPopClose() { const p = document.getElementById('instPop'); if (p) p.remove(); }
function instPopHtml() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const how = _instEvt0() ? '<button class="btn gold block" data-act="installApp">Install app</button>'
    : ios ? '<p class="small">In <b>Safari</b> tap the <b>Share</b> button (square with an arrow), then <b>Add to Home Screen</b>.</p>'
    : '<p class="small">Tap your browser menu (the three dots), then <b>Install app</b> or <b>Add to Home screen</b>.</p>';
  return `<div class="instbox"><div class="insthead"><img src="icon-192.png" alt="" onerror="this.style.display='none'"><div><b>Install this app</b><span>Opens like a normal app and works with no signal</span></div></div>${how}<div class="instrow"><button class="btn ghost" data-act="laterInstall">${_instEvt0() ? 'Not now' : 'Got it'}</button><button class="btn ghost" data-act="neverInstall">Don’t ask again</button></div></div>`;
}
function _instEvt0() { return !!_installEvt; }
function instPopShow() {
  if (isStandalone() || LS.get('omb_noinstall', false) || +LS.get('omb_instsnooze', 0) > Date.now()) return;
  if (document.getElementById('gate')) return;                 // wait until they are past the log-in screen
  if (ui.view !== 'home') return;                              // only on the Records screen, never over a form
  let p = document.getElementById('instPop');
  if (!p) { p = document.createElement('div'); p.id = 'instPop'; document.body.appendChild(p); }
  p.innerHTML = instPopHtml();
}
(function instPopStart() {
  const tick = () => { if (_instTries++ > 20 || isStandalone()) return; if (!document.getElementById('instPop')) instPopShow(); if (!document.getElementById('instPop')) setTimeout(tick, 4000); };
  setTimeout(tick, 2500);
  window.addEventListener('beforeinstallprompt', () => setTimeout(() => { if (document.getElementById('instPop')) instPopShow(); else { _instTries = 0; tick(); } }, 400));
  window.addEventListener('appinstalled', instPopClose);
})();
/* "What's new": a note on the home screen once after each update */
const NS_KEY = 'omb_seenver';
const nsGet = () => { try { return localStorage.getItem(NS_KEY) || ''; } catch (e) { return ''; } };
const nsSet = () => { try { localStorage.setItem(NS_KEY, APP_VERSION); } catch (e) { } };
function newsBanner() {
  const s = nsGet(); if (!s) { nsSet(); return ''; }
  if (s === APP_VERSION) return '';
  return `<div class="notice">The app has been updated to <b>${APP_VERSION}</b>.<div style="height:8px"></div><button class="btn gold block" data-act="news">See what’s new</button><div style="height:6px"></div><button class="btn block ghost" data-act="newsDismiss">Dismiss</button></div>`;
}
function renderNews(v) {
  nsSet();
  v.innerHTML = `<h1>What’s new</h1><p class="small muted" style="margin-top:0">You are on <b>${APP_VERSION}</b>.</p>${newsHtml()}<button class="btn block ghost" data-act="helpBack">Back</button>`;
}
/* ---------- feedback: faults, suggestions, questions ---------- */
const FB_KEY = 'omb_fbq';
const fbQueue = () => { try { return JSON.parse(localStorage.getItem(FB_KEY)) || []; } catch (e) { return []; } };
const fbSave = q => { try { localStorage.setItem(FB_KEY, JSON.stringify(q)); } catch (e) { } };
let fbBusy = false;
async function fbFlush() {
  if (fbBusy || !CLOUD.on || !CLOUD.signedIn() || navigator.onLine === false) return 0;
  fbBusy = true; let sent = 0;
  try {
    for (let q = fbQueue(); q.length;) {
      try { await CLOUD.insert('feedback', q[0]); } catch (e) { if (e && e.status >= 400 && e.status < 500 && e.status !== 401 && e.status !== 408 && e.status !== 429) { /* rejected for good: drop it */ } else break; }
      q = fbQueue().slice(1); fbSave(q); sent++;
    }
  } finally { fbBusy = false; }
  return sent;
}
window.addEventListener('online', () => { fbFlush(); });
const FB_KINDS = [['fault', 'Report a fault'], ['suggestion', 'Suggestion'], ['question', 'Question']];
function fbWhere() {
  const from = ui.fbFrom || 'settings', r = ui.rec;
  return from === 'form' && r ? `form: ${typeOf(r)}, step ${ui.step + 1}` : from;
}
function renderFeedback(v) {
  const F = ui.fb = ui.fb || { kind: 'fault', text: '' }, q = fbQueue().length;
  v.innerHTML = `
    <h1>Send feedback</h1>
    <p class="small muted" style="margin-top:0">Something broken, an idea, or a question? Tell us and we will look at it.</p>
    ${q ? `<div class="notice">${q} earlier message${q === 1 ? ' is' : 's are'} waiting to send when you are online.</div>` : ''}
    <div class="seg" style="margin-bottom:12px">${FB_KINDS.map(([k, l]) => `<button type="button" class="${F.kind === k ? 'on' : ''}" data-act="fbKind" data-kind="${k}">${l}</button>`).join('')}</div>
    <label class="f"><span>${F.kind === 'fault' ? 'What went wrong? What were you doing?' : F.kind === 'suggestion' ? 'What would make the app better?' : 'What would you like to ask?'}</span>
      <textarea id="fbText" rows="7" maxlength="4000" placeholder="Type here…">${esc(F.text)}</textarea>
      <small>Sent with it: app version (${APP_VERSION}), your phone type, the screen you were on, and your account email. Customer records are never sent.</small></label>
    <button class="btn gold block" data-act="fbSend">Send</button>
    <div style="height:10px"></div>
    <button class="btn block ghost" data-act="helpBack">Back</button>
    <p class="small muted" style="text-align:center;margin-top:14px">You can also email <a href="mailto:support@ombgas.com" style="color:var(--gold2)">support@ombgas.com</a></p>`;
}
function renderHelp(v) {
  v.innerHTML = `
    <h1>Help guide</h1>
    <input class="search" id="helpSearch" placeholder="Search help, e.g. invoice, backup, timer" value="${esc(ui.helpQ || '')}" autocomplete="off">
    <div id="helpList">${helpListHtml(ui.helpQ)}</div>
    <button class="btn block" data-act="feedback" style="margin-bottom:10px">Report a fault or send a suggestion</button>
    <button class="btn block ghost" data-act="helpBack">Back</button>`;
}
function renderSettings(v) {
  const f = (k, l, o = {}) => `<label class="f"><span>${l}</span>${o.area ? `<textarea data-s="${k}" rows="3">${esc(settings[k])}</textarea>` : `<input data-s="${k}" value="${esc(k === 'sortCode' ? fmtSort(settings[k]) : settings[k])}" ${o.type ? `type="${o.type}"` : ''} ${o.mode ? `inputmode="${o.mode}"` : ''} autocomplete="off" ${o.maxlen ? `maxlength="${o.maxlen}"` : ''} ${o.cap ? `autocapitalize="${o.cap}"` : ''}>`}${o.hint ? `<small>${o.hint}</small>` : ''}</label>`;
  v.innerHTML = `
    <h1>Settings</h1>
    <button class="btn block" data-act="help" style="margin-bottom:10px">Help guide</button>
    <button class="btn block" data-act="news" style="margin-bottom:10px">What’s new</button>
    <button class="btn block" data-act="feedback" style="margin-bottom:12px">Send feedback</button>
    <h2>Business (printed on every certificate)</h2>
    <div class="card">
      ${f('businessName', 'Business name')}
      ${addrBox('set', 'address', 'Address')}
      ${f('phone', 'Telephone', { type: 'tel' })}
      ${f('email', 'Email', { type: 'email', cap: 'none' })}
      ${f('gasSafeReg', 'Gas Safe Register number')}
    </div>
    <h2>Your branding</h2>
    <div class="card">
      <div style="text-align:center;margin-bottom:12px"><img src="${settings.logo || placeholderLogo(settings.businessName)}" alt="Company logo" style="height:110px;width:110px;border-radius:10px"></div>
      <label class="btn block" style="text-align:center">${settings.logo ? 'Change company logo' : 'Upload company logo'}<input id="coLogo" type="file" accept="image/*" hidden></label>
      ${settings.logo ? '<div style="height:8px"></div><button class="btn block" data-act="rmCoLogo">Remove logo</button>' : ''}
      <div class="hint" style="margin:10px 0 4px">Your logo appears at the top of the app and on every PDF.</div>
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
    <h2>Invoice details</h2>
    <div class="card">
      ${f('invPrefix', 'Invoice number prefix', { cap: 'characters', hint: 'For example INV-. Leave blank for numbers only.' })}
      ${f('invNext', 'Next invoice number', { mode: 'numeric', hint: 'Start at 1 or any number you like. It goes up by one each time an invoice is created.' })}
      ${f('invDigits', 'Digits in the number', { mode: 'numeric', hint: '3 gives 001, 4 gives 0001, 1 gives no leading zeros.' })}
      <div class="notice" style="margin:0 0 14px">Next invoice will be numbered <b id="invPreview">${esc(invNumberFor(settings.invNext))}</b></div>
      ${f('payDays', 'Payment terms (days)', { mode: 'numeric' })}
      <button type="button" class="item tog ${settings.vatReg === 'Yes' ? 'on' : ''}" data-act="vatReg"><span class="box"></span><span><span class="t">VAT registered</span><span class="s" style="display:block">${settings.vatReg === 'Yes' ? 'VAT is added to invoices' : 'Tick if the business is VAT registered – VAT will then be added to invoices'}</span></span></button>
      ${settings.vatReg === 'Yes' ? f('vatRate', 'VAT rate (%)', { mode: 'decimal' }) + f('vatNumber', 'VAT number') + `<label class="f"><span>VAT quarters end in</span><select data-s="vatQtr"><option value="2" ${settings.vatQtr === '2' ? 'selected' : ''}>March, June, September, December</option><option value="0" ${settings.vatQtr === '0' ? 'selected' : ''}>January, April, July, October</option><option value="1" ${settings.vatQtr === '1' ? 'selected' : ''}>February, May, August, November</option></select><small>Used by “Print for accountant” on the Invoices tab. It is on your VAT registration certificate.</small></label>` + '<p class="small muted">Enter your prices above <b>excluding VAT</b>. VAT is added on the invoice and shown as its own line. The VAT number is printed on the invoice, which is then headed “VAT Invoice”.</p>' : ''}
      <div class="row"><div class="grow">${f('yearDay', 'Tax year starts: day', { mode: 'numeric', maxlen: 2 })}</div><div class="grow"><label class="f"><span>Month</span><select data-s="yearMonth">${['January','February','March','April','May','June','July','August','September','October','November','December'].map((mn, k) => `<option value="${k + 1}" ${String(+settings.yearMonth || 4) === String(k + 1) ? 'selected' : ''}>${mn}</option>`).join('')}</select></label></div></div>
      <p class="small muted" style="margin-top:-6px">The first day of your company’s tax / accounting year (6 April for sole traders; a company can be different). Used for “This tax year” and “Last tax year” in Print for accountant.</p>
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
    <h2>Quotes</h2>
    <div class="card">
      <div class="f"><span>Price list</span>
        <p class="small muted" style="margin:0 0 8px">${(settings.qList || []).length ? (settings.qList.length + ' items.') : 'Not set up yet.'} Boilers, flue kits, copper, fittings, thermostats and labour, each with your cost and mark-up. Quotes pick from it and show your profit to you only.</p>
        <button type="button" class="btn block" data-act="pricesOpen">Open price list</button></div>
      ${f('quoteIncluded', 'What is included as standard (one item per line)', { area: 1 })}
      ${f('quoteTerms', 'Terms shown on the quote (one per line)', { area: 1 })}
    </div>
    <h2>Tools</h2>
    <div class="card">
      ${[['toolGas', 'Gas rate calculator'], ['toolPipe', 'Gas pipe sizing'], ['toolIv', 'Tightness test volume'], ['toolHeat', 'Heat loss and radiator sizing']].map(([k, l]) => `<label class="f"><span>${l}</span><select data-s="${k}"><option value="on" ${settings[k] === 'off' ? '' : 'selected'}>Show</option><option value="off" ${settings[k] === 'off' ? 'selected' : ''}>Hide</option></select></label>`).join('')}
      <small class="muted">Hidden tools disappear from the Tools list. Hide all three and the Tools button leaves the home screen.</small>
    </div>
    <h2>Annual check reminders</h2>
    <div class="card">
      <label class="f"><span>Message wording</span><textarea data-s="remText" rows="4">${esc(settings.remText || REM_DEFAULT)}</textarea><small>Used for the Text, WhatsApp and Email buttons on the Annual checks due screen. {name}, {business}, {what}, {address} and {date} are filled in for you.</small></label>
      <label class="f"><span>Start listing checks</span><select data-s="remDays">${[['28', '4 weeks before they are due'], ['42', '6 weeks before they are due'], ['56', '8 weeks before they are due'], ['84', '12 weeks before they are due']].map(([k, l]) => `<option value="${k}" ${String(settings.remDays || '56') === k ? 'selected' : ''}>${l}</option>`).join('')}</select><small>A landlord gas safety check can be done up to 2 months early and keep the same yearly date.</small></label>
      <label class="f"><span>Send reminders automatically by email</span><select data-s="remAuto"><option value="off" ${settings.remAuto === 'on' ? '' : 'selected'}>Off</option><option value="on" ${settings.remAuto === 'on' ? 'selected' : ''}>On</option></select><small>When on, customers with an email address saved get an email about 8 weeks before their check is due, and again 2 weeks before. It comes from reminders@ombgas.com with your business name, and their replies come to <b>${esc(settings.email || 'your email in Settings')}</b>. Customers you mark Booked in, Not needed or Stop are skipped, and every email has an unsubscribe link. You need to be signed in so it can run.${settings.remAuto === 'on' && !settings.email ? ' <b style="color:var(--gold2)">Add your email address under Business first, or replies will have nowhere to go.</b>' : ''}</small></label>
      ${settings.remAuto === 'on' ? '<button class="btn block" data-act="remTest">Send me a sample reminder</button><div style="height:8px"></div>' : ''}
      <button class="btn block ghost" data-act="remReset">Put the original wording back</button>
    </div>
    <h2>Backup</h2>
    <div class="card">
      <p class="small muted" style="margin-top:0">Customers and records are stored on this phone. Keep a copy somewhere safe. The app reminds you once a month. A backup holds your customers' details, so keep it somewhere private. You can add a password to it. Bank details are never included.</p>
      <p class="small" style="margin:0 0 10px">Last full backup: <b>${bkGet().last ? ukDate(bkGet().last) : 'none yet'}</b></p>
      <button class="btn block" data-act="expCust">Export customers (spreadsheet)</button>
      <div style="height:8px"></div>
      <button class="btn block" data-act="expInv">Export invoices (spreadsheet)</button>
      <div style="height:8px"></div>
      <button class="btn block" data-act="expAll">Back up everything</button>
      <div style="height:8px"></div>
      <label class="btn block ghost" style="text-align:center">Restore from a backup<input id="restoreFile" type="file" accept=".json,application/json" hidden></label>
    </div>
    <h2>Sample data</h2>
    <div class="card">
      <p class="small muted" style="margin-top:0">${SAMPLE.has() ? 'Sample customers and example forms are on this phone, marked “Sample”. Open them to see how the forms and PDFs look.' : 'Adds two made-up customers and an example of every form so you can see how they look.'}</p>
      ${SAMPLE.has() ? '<button class="btn block" data-act="sampleOff">Remove sample data</button>' : '<button class="btn block" data-act="sampleOn">Add sample data</button>'}
    </div>
    <h2>App version</h2>
    <div class="card">
      <p class="small muted" style="margin-top:0">This phone is running <b id="verHere" style="color:var(--txt)">${APP_VERSION}</b> · newest online: <b id="verNew" style="color:var(--txt)">checking…</b></p>
      <button class="btn block" data-act="forceUpdate">Update app now</button>
      <p class="small" id="updMsg" style="margin:8px 0 0;font-weight:600"></p>
      <p class="small muted" style="margin-bottom:0">Clears the saved copy of the app and reloads the newest version. Your records, customers and photos are not touched.</p>
    </div>
    ${installCard(true)}
    ${CLOUD.on ? accountCard() : ''}`;
}
function accountCard() {
  const a = CLOUD.access(), sub = CLOUD.sub();
  const plan = !sub ? 'Checking…' : a.comped ? 'Free pass – full access' : a.paid ? (a.pastDue ? 'Subscribed – last payment failed, please update your card' : 'Subscribed') : a.trial ? `Free trial – ${a.days} day${a.days === 1 ? '' : 's'} left` : 'Not subscribed';
  return `<h2>Account</h2><div class="card">
      <p class="small" style="margin-top:0">Signed in as <b>${esc(CLOUD.email())}</b><br><span class="muted">${esc(plan)}</span></p>
      <button class="btn block" data-act="syncNow">Sync now</button>
      <p class="small muted" id="syncMsg">${esc(CLOUD.st.msg)}</p>
      ${a.comped ? '' : `<button class="btn block" data-act="billing">${a.paid ? 'Manage subscription' : 'Subscribe'}</button>`}
      ${CLOUD.isAdmin() ? '<div style="height:8px"></div><button class="btn block" data-act="openAdmin">Admin – sign-ups and free passes</button>' : ''}
      <div style="height:8px"></div><button class="btn block ghost" data-act="secCheck">Check connection security</button>
      <pre id="secOut" class="small muted" style="white-space:pre-wrap;word-break:break-all;margin:8px 0 0"></pre>
      <div style="height:8px"></div><button class="btn block ghost" data-act="logout">Log out</button>
      <p class="small muted" style="margin-bottom:0">Everything you enter is saved on this phone first, so it works with no signal, and syncs to your account whenever you are online.</p>
    </div>`;
}

/* ---------- owner's admin page: who has signed up, and free passes ---------- */
function renderAdmin(v) {
  const A = ui.admin || {}, rows = A.rows;
  const state = r => r.comped ? 'free pass' : r.status === 'trialing' ? (Date.parse(r.trial_end) > Date.now() ? 'on trial' : 'trial ended') : r.status === 'active' ? 'paying' : r.status === 'past_due' ? 'payment failed' : 'cancelled';
  const cnt = k => rows.filter(r => state(r) === k).length;
  v.innerHTML = `<h1>Admin</h1>
    <a href="#" data-nav="settings" style="color:var(--gold2)">← Back to settings</a>
    ${A.err ? `<div class="notice err">${esc(A.err)}</div>` : ''}
    ${!rows ? '<p class="muted">Loading…</p>' : `
    <div class="card"><dl class="kv">
      <dt>Sign-ups</dt><dd>${rows.length}</dd><dt>On free trial</dt><dd>${cnt('on trial')}</dd><dt>Paying</dt><dd>${cnt('paying')}</dd>
      <dt>Free passes</dt><dd>${cnt('free pass')}</dd><dt>Trial ended</dt><dd>${cnt('trial ended')}</dd><dt>Payment failed / cancelled</dt><dd>${cnt('payment failed') + cnt('cancelled')}</dd>
    </dl><button class="btn block" data-act="adminReload" style="margin-top:10px">Refresh</button></div>
    <h2>Give someone a free pass</h2>
    <div class="card"><label class="f"><span>Their email address</span><input id="adminEmail" type="email" inputmode="email" autocapitalize="none" autocomplete="off" placeholder="kyle@example.com"><small>Works before or after they sign up. They get full access with no payment.</small></label>
      <button class="btn gold block" data-act="adminCompEmail">Give free pass</button></div>
    <h2>Feedback${A.fb ? ' (' + A.fb.filter(x => x.status === 'new').length + ' new)' : ''}</h2>
    ${A.fbErr ? `<div class="notice">${esc(A.fbErr)}</div>` : ''}
    ${(A.fb || []).slice(0, 30).map(x => `<div class="card"><div class="small muted">${esc(x.kind)} · ${esc(x.status)} · ${esc(x.email || '')} · ${ukDate((x.created_at || '').slice(0, 10))} · ${esc(x.app_version || '')} · ${esc(x.screen || '')}</div>
      <div style="margin:6px 0;white-space:pre-wrap">${esc(x.message)}</div>
      <div class="row">${['new', 'fixing', 'done'].map(s => `<button class="btn grow ${x.status === s ? 'gold' : 'ghost'}" data-act="adminFbStatus" data-id="${x.id}" data-v="${s}">${s}</button>`).join('')}</div></div>`).join('') || (A.fbErr ? '' : '<p class="muted">No feedback yet.</p>')}
    <h2>Everyone</h2>
    ${rows.map(r => `<div class="card"><div class="t" style="font-weight:700">${esc(r.email)}</div>
      <div class="small muted">${esc(state(r))}${r.confirmed ? '' : ' · email not confirmed'} · joined ${ukDate((r.created_at || '').slice(0, 10))}${r.last_sign_in ? ' · last in ' + ukDate(r.last_sign_in.slice(0, 10)) : ''}${r.status === 'trialing' && !r.comped ? ' · trial ends ' + ukDate((r.trial_end || '').slice(0, 10)) : ''}</div>
      <button class="btn block ${r.comped ? 'ghost' : ''}" style="margin-top:8px" data-act="adminComp" data-id="${r.user_id}" data-v="${r.comped ? '' : '1'}">${r.comped ? 'Remove free pass' : 'Give free pass'}</button>${r.comped || r.status === 'active' ? '' : `<button class="btn block" style="margin-top:8px" data-act="adminExtend" data-id="${r.user_id}">Extend trial by 14 days</button>`}</div>`).join('') || '<p class="muted">Nobody yet.</p>'}`}`;
}
async function adminLoad() {
  ui.admin = ui.admin || {}; ui.admin.err = '';
  try { ui.admin.fb = await CLOUD.rpc('admin_feedback'); } catch (e) { ui.admin.fb = ui.admin.fb || null; ui.admin.fbErr = /does not exist|schema cache|404/i.test(e.message) ? 'Feedback table not set up yet.' : ''; }
  try { ui.admin.rows = await CLOUD.rpc('admin_overview'); } catch (e) { ui.admin.err = /not allowed/i.test(e.message) ? 'This account is not an admin.' : 'Could not load: ' + e.message; ui.admin.rows = ui.admin.rows || []; }
  if (ui.view === 'admin') render();
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
  else if (s === last - 1 && !isQuo(r)) body = (job ? `<div class="notice">This sign-off is used on all ${job.length} forms in this visit.</div>` : '') + stepSign();
  else if (t === 'legionella') body = [null, legSystem, legTemps, legTanks, legRisk, legFindings][s]();
  else if (t === 'warning') body = [null, warnFaults][s]();
  else if (t === 'aircon') body = [null, acSystem, acRefrig][s]();
  else if (t === 'quote') body = [null, quoBoiler, quoExtras][s]();
  else if (t === 'commission') body = [null, comBoiler, comWater, comReadings, comHandover][s]();
  else if (t === 'service') body = [null, svcBoiler, svcChecks, svcSafety, svcOperating, svcFinish][s]();
  else body = [null, stepAppliances, stepInstall, stepAlarms, stepDefects, stepNext][s]();
  const delBtn = r.status === 'draft' && s === 0 ? `<div style="height:22px"></div><button class="btn danger block" data-act="delRec">${job && job.length > 1 ? 'Delete this draft visit (' + job.length + ' forms)' : 'Delete this draft'}</button>` : '';
  v.innerHTML = prog + body + delBtn;
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
/* ---------- repeat visit: copy the appliance details (make, model, GC number…) from the last visit to the same property ---------- */
const PREV_GAS = ['location', 'locationOther', 'type', 'typeOther', 'manufacturer', 'model', 'gc', 'ownership', 'flue'];
const PREV_SVC = ['location', 'locationOther', 'make', 'makeOther', 'model', 'systemType', 'systemOther', 'serial', 'gc', 'flue'];
const pickKeys = (o, keys) => Object.fromEntries(keys.map(k => [k, (o && o[k]) || '']));
function prevVisit(r) {
  const t = typeOf(r); if (t !== 'gas' && t !== 'service') return null;
  const addr = String(r.jobAddress || '').trim().toLowerCase(), nm = String(r.customer.name || '').trim().toLowerCase();
  if (!addr || (!r.customerId && !nm)) return null;
  const hasData = x => t === 'gas' ? (x.appliances || []).some(a => a.model || a.manufacturer) : !!(x.model || x.make);
  return records.filter(x => x.id !== r.id && typeOf(x) === t && String(x.jobAddress || '').trim().toLowerCase() === addr
    && ((r.customerId && x.customerId === r.customerId) || String(x.customer.name || '').trim().toLowerCase() === nm) && hasData(x))
    .sort((a, b) => String(b.inspectionDate).localeCompare(String(a.inspectionDate)) || (b.updated || 0) - (a.updated || 0))[0] || null;
}
function prevCard(r) {
  const p = prevVisit(r); if (!p) return '';
  const t = typeOf(r), blank = t === 'gas' ? !r.appliances.some(a => a.model || a.manufacturer) : !(r.model || r.make);
  if (!blank) return '';
  const list = t === 'gas' ? (p.appliances || []).slice(0, +p.applianceCount || 1).map(a => [a.manufacturer, a.model].filter(Boolean).join(' ')).filter(Boolean) : [[p.make === 'Other' ? p.makeOther : p.make, p.model].filter(Boolean).join(' ')];
  return `<div class="card"><p class="small" style="margin-top:0"><b>You were here before</b> (${esc(ukDate(p.inspectionDate))}): ${esc(list.join(' · ') || 'appliance details saved')}</p>
    <button class="btn gold block" data-act="copyPrev">Copy the appliance details from last time</button>
    <p class="small muted" style="margin-bottom:0">Fills in the make, model, Gas Council number, location and type. Test readings and signatures are left blank for you to do again.</p></div>`;
}
function applyPrev(r) {
  const p = prevVisit(r); if (!p) return;
  if (typeOf(r) === 'gas') {
    const n = Math.min(+p.applianceCount || 1, 4);
    r.applianceCount = String(n);
    r.appliances = Array.from({ length: n }, (_, i) => ({ ...blankAppliance(), ...pickKeys(p.appliances[i], PREV_GAS) }));
    r.appliances.forEach(a => { if (!a.ownership) a.ownership = 'Landlord'; });
  } else Object.assign(r, pickKeys(p, PREV_SVC));
  persistRec(r); toast('Appliance details copied – check they are still right');
}
/* ---------- finding a property: type to search the customer's addresses (or every customer's, if none is chosen yet) ---------- */
const addrKey = a => String(a || '').toLowerCase().replace(/\s+/g, ' ').trim();
function propPool(r) {
  const cu = customers.find(c => c.id === r.customerId), out = [], seen = new Set();
  const add = (a, c) => { const k = c.id + '|' + addrKey(a); if (a && !seen.has(k)) { seen.add(k); out.push({ a, c }); } };
  if (cu) { (cu.properties || []).forEach(p => add(p, cu)); records.forEach(x => { if (x.customerId === cu.id) add(x.jobAddress, cu); }); }
  else customers.forEach(c => (c.properties || []).forEach(p => add(p, c)));
  return { cu, out };
}
function sugHtml(r, q, act = 'pickSug') {
  const { cu, out } = propPool(r), toks = addrKey(q).split(' ').filter(Boolean);
  if (!toks.length) return '';
  const cur = addrKey(r.jobAddress);
  const hits = out.filter(x => addrKey(x.a) !== cur && toks.every(t => addrKey(x.a).includes(t) || (!cu && addrKey(x.c.name).includes(t))));
  if (!hits.length) return '<p class="small muted" style="margin:6px 0">No saved address matches – just carry on typing the new one.</p>';
  return hits.slice(0, 8).map(x => { const ls = x.a.split('\n'); return `<button type="button" class="item cpick" data-act="${act}" data-c="${x.c.id}" data-a="${esc(x.a)}"><div class="t">${esc(ls[0])}</div><div class="s">${esc([...ls.slice(1), ...(cu ? [] : [x.c.name])].join(', '))}</div></button>`; }).join('') + (hits.length > 8 ? `<p class="small muted" style="margin:4px 0">${hits.length - 8} more – keep typing to narrow it down.</p>` : '');
}
/* type-ahead for the client name: the more you type, the fewer customers are suggested */
function nameSugHtml(r, q, act = 'pickCustId') {
  const toks = addrKey(q).split(' ').filter(Boolean); if (!toks.length) return '';
  const sel = customers.find(c => c.id === r.customerId);
  const hits = customers.filter(c => !(sel && sel.id === c.id && addrKey(c.name) === addrKey(q)) && toks.every(t => addrKey([c.name, c.phone, c.email].join(' ')).includes(t)))
    .sort((a, b) => (addrKey(b.name).startsWith(toks[0]) ? 1 : 0) - (addrKey(a.name).startsWith(toks[0]) ? 1 : 0) || (b.fav ? 1 : 0) - (a.fav ? 1 : 0) || a.name.localeCompare(b.name));
  if (!hits.length) return '';
  return `<div class="small muted" style="margin:6px 0 4px">Existing customers – tap one to fill in their details:</div>` + hits.slice(0, 6).map(c => `<button type="button" class="item cpick" data-act="${act}" data-id="${c.id}"><div class="t">${c.fav ? '<span style="color:var(--bad)">♥</span> ' : ''}${esc(c.name)}</div><div class="s">${esc([c.phone, ((c.properties || [])[0] || c.billing || '').split('\n')[0]].filter(Boolean).join(' · ') || 'No details saved')}</div></button>`).join('') + (hits.length > 6 ? `<p class="small muted" style="margin:4px 0">${hits.length - 6} more – keep typing to narrow it down.</p>` : '');
}
/* "Navigate": opens Google Maps (the Maps app on a phone) with driving directions to the address */
const mapsUrl = a => 'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=' + encodeURIComponent(String(a || '').replace(/\s*\n\s*/g, ', ').trim());
const navBtnHtml = a => String(a || '').trim().length >= 4 ? `<a class="btn block" style="text-align:center;text-decoration:none;margin-top:10px" href="${esc(mapsUrl(a))}" target="_blank" rel="noopener">&#128205; Navigate to this property</a>` : '';
function stepCustomer() {
  const r = ui.rec, cu = customers.find(c => c.id === r.customerId);
  return `
    ${ui.job ? `<div class="notice">These customer and property details are used on all ${ui.job.length} forms in this visit.</div>` : ''}
    ${custPicker(r)}
    <div class="card">
      ${txt('customer.name', 'Client name', { req: 1 })}
      <div id="nameSug"></div>
      ${txt('customer.phone', 'Telephone', { type: 'tel', mode: 'tel' })}
      ${txt('customer.email', 'Email (to send the PDF)', { type: 'email', mode: 'email', cap: 'none' })}
      ${addrBox('rec', 'customer.billing', 'Client / billing address')}
    </div>
    <h2>Property inspected</h2>
    ${cu && (cu.properties || []).length > 5 ? `<input class="search" id="propSearch" placeholder="Search this customer’s ${cu.properties.length} properties – street, town or postcode" autocomplete="off"><div id="propList"></div>`
      : cu && (cu.properties || []).length ? `<div class="chips">${cu.properties.map((p, i) => `<button class="chip" data-act="pickProp" data-i="${i}">${esc(addrFirst(p))}</button>`).join('')}</div>` : ''}
    <div class="card">
      ${addrBox('rec', 'jobAddress', 'Job address', { req: 1 })}
      <div id="addrSug"></div>
      <button class="btn block" data-act="sameAddr">Same as billing address</button>
      <div id="navBtn">${navBtnHtml(r.jobAddress)}</div>
    </div>
    ${prevCard(r)}
    <div class="card">${txt('inspectionDate', isLeg(r) ? 'Date of assessment' : isAc(r) || isCom(r) ? 'Date of commissioning' : isQuo(r) ? 'Date of quotation' : 'Date of inspection', { type: 'date' })}</div>`;
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
      ${a.type === 'Other' ? txt(P('typeOther'), 'Describe the appliance', { req: 1 }) : ''}
      ${makeField(P('manufacturer'), i, a.type)}
      ${txt(P('model'), 'Model', { req: 1 })}
      ${/^(cooker|hob|oven|range cooker)$/i.test(a.type || '') ? '' : txt(P('gc'), 'Gas Council number', { cap: 'characters' })}
      ${choice(P('ownership'), 'Who owns the appliance?', OPT.ownership, { req: 1, wrap: 1 })}
      ${choice(P('flue'), 'Flue type', OPT.flue, { req: 1, wrap: 1 })}
      ${choice(P('serviced'), 'Serviced at the same time?', OPT.yn, { req: 1 })}
    </div>
    <h2>Inspection</h2>
    <div class="card">
      ${choice(P('test'), 'Which tests can be performed?', OPT.test, { req: 1, wrap: 1 })}
      ${a.test && a.test !== 'Gas Rate' ? txt(P('op'), 'Operating pressure (mbar)', { req: 1, mode: 'decimal', hint: 'Working pressure at the burner or appliance inlet' }) : ''}
      ${isWorcester(a.manufacturer) ? txt(P('fanPress'), 'Fan pressure (mbar)', { mode: 'decimal', hint: 'Worcester Bosch – optional. Enter it as 4.62 and it is recorded as -4.62 mbar' }) : ''}
      ${a.test && a.test !== 'Operating Pressure' ? txt(P('hi'), 'Gas rate / heat input (kW)', { req: 1, mode: 'decimal' }) + calcPanel(ui.rec.id + '-app' + i, P('hi')) : ''}
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
/* one-tap answers under a text box (so a box that must be filled can say N/A without typing) */
const quick = (path, vals) => `<div class="chips" style="margin:-4px 0 12px">${vals.map(v => `<button type="button" class="chip ${getP(ui.rec, path) === v ? 'on' : ''}" data-k="${path}" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div>`;
function stepDefects() {
  const r = ui.rec, n = +r.defectCount || 0;
  return `<div class="card">${choice('defectCount', 'How many defects are there to note?', OPT.defectCount, { req: 1 })}</div>
  ${Array.from({ length: n }, (_, i) => `<h2>Defect ${i + 1}</h2><div class="card">
    ${txt(`defects.${i}.text`, 'Identified defect', { req: 1, area: 1, rows: 3 })}
    ${choice(`defects.${i}.cls`, 'Classification', OPT.cls, { req: 1 })}
    ${txt(`defects.${i}.action`, 'Remedial action taken', { req: 1, area: 1, rows: 3 })}${quick(`defects.${i}.action`, ['N/A', 'None taken', 'Customer advised'])}
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
  /* the engineer's saved signature goes on automatically the first time a form reaches this step (Clear still works afterwards) */
  if (!r.engineerSig && settings.engSig && !r.engAuto) { r.engAuto = true; r.engineerSig = PH.sigStore(settings.engSig); persistRec(r); }
  const sig = (key, label, req) => `<div class="f ${ui.showErr && req && !r[key] ? 'bad' : ''}"><span>${label}${req ? ' <b>*</b>' : ''}</span>
    <div class="sigwrap"><canvas data-sig="${key}"></canvas><div class="line"></div><div class="ph" data-ph="${key}">Sign here</div></div>
    <div class="sigactions"><span class="small muted">Use your finger</span><button data-act="sigClear" data-key="${key}">Clear</button></div></div>`;
  return `
    <div class="card">
      <p class="small muted" style="margin-top:0">Engineer: <b style="color:var(--txt)">${esc(settings.engineerName || '(set in Settings)')}</b>${isLeg(r) || isAc(r) ? '' : ` · Gas Safe ID <b style="color:var(--txt)">${esc(settings.gasSafeId || '(set in Settings)')}</b>`}</p>
      ${sig('engineerSig', "Engineer's signature", true)}
      ${settings.engSig && !r.engineerSig ? `<button type="button" class="btn block" style="margin-bottom:10px" data-act="engSigUse">Use my saved signature</button>` : ''}
      <button type="button" class="item tog ${settings.engSig ? 'on' : ''}" data-act="engSigTog" style="margin-bottom:0"><span class="box"></span><span><span class="t">Remember my signature</span><span class="s" style="display:block">${settings.engSig ? 'Saved – it is added to your new forms automatically. Tap to remove it.' : 'Sign above, then tick to add it to all your future forms automatically.'}</span></span></button>
    </div>
    <div class="card">
      ${choice('customerPresent', 'Was the customer present to sign?', OPT.yn, { req: 1 })}
      ${r.customerPresent === 'No' ? '<p class="small muted">The PDF will show “No-one present at time of visit”.</p>' : ''}
      ${r.customerPresent === 'Yes' ? txt('customerName', 'Client name', { req: 1 }) + (() => { const on = !!(r.customerName || '').trim() && (r.customerName || '').trim() === (r.customer.name || '').trim(); return `<button type="button" class="item tog ${on ? 'on' : ''}" data-act="sameName" style="margin-bottom:14px"><span class="box"></span><span><span class="t">Same as the customer name</span><span class="s" style="display:block">${r.customer.name ? esc(r.customer.name) : 'Fills in the name from the customer details'}</span></span></button>`; })() + sig('customerSig', 'Client signature', true) : ''}
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
  else if (t === 'quote') { const T = QUO.totals(r, settings); rows += dl('Boiler', [QUO.makeText(r), r.model, r.kw ? r.kw + ' kW' : ''].filter(Boolean).join(' ')) + dl('Quote total', QUO.money(T.total) + (T.rate ? ' inc. VAT' : '')); }
  else if (t === 'commission') rows += dl('Boiler', [COM.makeText(r), r.model].filter(Boolean).join(' ')) + dl('Type', r.kind) + dl('Max CO / CO₂', [r.maxCo ? r.maxCo + ' ppm' : '', r.maxCo2 ? r.maxCo2 + ' %' : ''].filter(Boolean).join(' · ')) + dl('Next service', ukDate(r.renewal));
  else if (t === 'warning') rows += dl('Faults', r.faults.slice(0, +r.faultCount || 1).map((f, i) => `${i + 1}. ${f.type || '?'} – ${f.cls || '?'}${f.riddor === 'YES' ? ' (RIDDOR)' : ''}`).join('\n'));
  else if (t === 'service') rows += dl('Boiler', [SVC.makeText(r), r.model].filter(Boolean).join(' ')) + dl('Visit', r.reason) + dl('Checks failed', String(SVC.failCount(r))) + dl('Safe to use', r.safe) + dl('Warning notice', r.warning) + dl('Next service', ukDate(r.renewal));
  else rows += dl('Appliances', r.appliances.slice(0, n).map((a, i) => `${i + 1}. ${typeText(a) || '?'} – ${a.safe === 'Yes' ? 'safe' : a.safe === 'No' ? 'NOT SAFE' : '?'}`).join('\n')) + dl('Defects', r.defectCount) + dl('Next check', ukDate(r.renewal));
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
    invRow = row(inv.id, 'Invoice ' + esc(inv.number), `${money(T.total)} · <span class="badge ${invStatus(inv)}">${invStatus(inv)}</span>`, `<div style="display:flex;gap:8px;flex:none">${side('invOpenVisit', '', 'Open')}${side('invFromVisit', '', 'Edit')}</div>`);
    if (selOn(inv.id)) paid = `<button type="button" class="item tog ${inv.paid ? 'on' : ''}" data-act="invPaidVisit" style="margin-bottom:10px"><span class="box"></span><span><span class="t">Paid</span><span class="s" style="display:block">${inv.paid ? 'Paid ' + ukDate(inv.paidDate) + ' – PAID stamp on the invoice' : 'Tick if paid on the day – adds a PAID stamp'}</span></span></button>${methodSeg(inv)}`;
  } else if (bm.length && noInv(m)) invRow = `<div class="notice" style="margin:0 0 10px">No invoice for this job – it counts as complete.</div><button class="btn block" style="margin-bottom:10px" data-act="invUndoNone">Add an invoice after all</button>`;
  else if (bm.length) invRow = `<button class="btn block" style="margin-bottom:10px" data-act="invFromVisit">Add an invoice</button><button class="btn ghost block" style="margin-bottom:10px" data-act="invNoneVisit">Invoice not required</button>`;
  const n = m.filter(x => selOn(x.id)).length + (inv && selOn(inv.id) ? 1 : 0);
  return `<div class="card pdfok" style="margin-top:12px"><div style="font-weight:700;margin-bottom:10px">Ready to send</div>
    ${recRows}${invRow}${paid}
    <button class="btn gold block" data-act="sendSel" ${n ? '' : 'disabled'}>${n ? `Email / share ${n} document${n > 1 ? 's' : ''}` : 'Tick something to send'}</button>
    <p class="small muted" style="margin-bottom:0">Opens your phone’s share sheet with the ticked PDFs attached – pick any app – Outlook, Gmail, WhatsApp…${m[0].customer.email ? ' The customer’s email address (' + esc(m[0].customer.email) + ') is copied for you – long-press the To box and paste it.' : ''}</p></div>`;
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
/* open the email app without leaving the page (a plain location change leaves a blank screen in some browsers, e.g. Firefox with no mail app set) */
const mailAddr = a => encodeURIComponent(String(a || '').trim()).replace(/%40/g, '@').replace(/%2C/g, ',');
function openMail(url) {
  /* this browser could not hand the PDFs to the share sheet, so say so clearly instead of jumping straight into an email with nothing attached */
  const old = document.getElementById('mailBox'); if (old) old.remove();
  const d = document.createElement('div'); d.id = 'mailBox';
  d.innerHTML = `<div class="instbox"><div class="insthead"><div><b>PDFs saved to your phone</b><span>This browser can’t attach them for you</span></div></div>
    <p class="small">They are in your <b>Downloads</b> folder. Open the email, then tap the paperclip and choose them. For one-tap sharing with the PDFs attached (WhatsApp, Outlook, Gmail…), open this app in <b>Chrome</b>.</p>
    <a class="btn gold block" style="text-align:center;text-decoration:none" href="${url.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" rel="noopener" id="mailGo">Open the email</a>
    <div class="instrow"><button class="btn ghost" id="mailX">Close</button></div></div>`;
  document.body.appendChild(d);
  d.querySelector('#mailX').onclick = () => d.remove(); d.querySelector('#mailGo').onclick = () => setTimeout(() => d.remove(), 600);
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
      ${billable(m).length ? (noInv(m) ? `<button class="btn block" data-act="invUndoNone">Add an invoice after all</button>` : `<button class="btn block" data-act="invNoneVisit">Invoice not required</button>`) + `<div style="height:8px"></div>` : ''}
      ${ui.rec.status === 'draft' ? '' : `<button class="btn danger block" data-act="delRec">${multi ? 'Delete all ' + m.length + ' forms in this visit' : 'Delete this record'}</button>`}
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
/* ---------- Boiler commissioning checklist steps ---------- */
const tick = (path, label) => `<button type="button" class="item tog ${getP(ui.rec, path) === 'Yes' ? 'on' : ''}" data-k="${path}" data-v="${getP(ui.rec, path) === 'Yes' ? '' : 'Yes'}"><span class="box"></span><span><span class="t">${label}</span></span></button>`;
/* ---------- Boiler quotation steps ---------- */
function quoBoiler() {
  const r = ui.rec;
  const mk = QUO_MAKES();
  const hit = mk.includes(r.make);
  return `<div class="card">
    ${qFinder('boiler', 'Find from your price list')}
    ${choice('kind', 'Boiler type', QUO.KIND, { req: 1, wrap: 1 })}
    <div class="f ${ui.showErr && !r.make ? 'bad' : ''}" data-f="make"><span>Boiler make <b>*</b></span><div class="seg wrap">${mk.map(x => `<button type="button" class="${r.make === x ? 'on' : ''}" data-k="make" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>
    ${r.make === 'Other' ? txt('makeOther', 'Boiler make (other)', { req: 1 }) : ''}
    ${txt('model', 'Boiler model', { req: 1 })}
    <div class="row">${txt('kw', 'Output (kW)', { mode: 'decimal' })}${txt('boilerPrice', 'Boiler price (£)', { req: 1, mode: 'decimal' })}</div>
    <div class="f" data-f="warranty"><span>Manufacturer warranty</span><div class="seg wrap">${QUO.WARRANTY.map(x => `<button type="button" class="${r.warranty === x ? 'on' : ''}" data-k="warranty" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>
  </div>
  <h2>Flue</h2>
  <div class="card">
    ${qSelect('flue', 'Type of flue kit', qOf('Flue'), false)}
    ${txt('flueDesc', 'Flue kit', { ph: 'Pick from the list, or type your own' })}
    ${txt('fluePrice', 'Flue price (£)', { mode: 'decimal' })}
  </div>`;
}
const QUO_MAKES = () => SVC.MAKE;
const qAll = () => (settings.qList && settings.qList.length) ? settings.qList : QUO.itemsFromRows([QUO.SHEET_HEAD].concat(QUO.STARTER));
const qOf = type => qAll().filter(x => x.type === type);
const qPrice = x => { const v = QUO.saleText(x, settings); return v ? ' · £' + v : ''; };
const qExtraList = () => qAll().filter(x => !QUO.MAIN.includes(x.type));
function qSelect(kind, title, list, group) {
  if (!list.length) return '';
  let opts;
  if (group) { const by = {}, key = x => (group === 'type' ? x.type : x.make) || 'Other'; list.forEach((x, i) => (by[key(x)] = by[key(x)] || []).push([x, i]));
    opts = Object.keys(by).sort().map(m => `<optgroup label="${esc(m)}">${by[m].map(([x, i]) => `<option value="${i}">${esc((group === 'type' && x.make ? x.make + ' ' : '') + x.name + (x.kind && group !== 'type' ? ' · ' + x.kind : '') + qPrice(x))}</option>`).join('')}</optgroup>`).join('');
  } else opts = list.map((x, i) => `<option value="${i}">${esc(x.name + qPrice(x))}</option>`).join('');
  return `<div class="f"><span>${title}</span><select data-qpick="${kind}"><option value="">Choose…</option>${opts}</select></div>`;
}
function qSeed() {
  if (!settings.qList || !settings.qList.length) settings.qList = QUO.itemsFromRows([QUO.SHEET_HEAD].concat(QUO.STARTER));
  const old = QUO.parseItems(settings.qItemsText);
  if (old.length) { old.forEach(o => { if (!settings.qList.some(x => x.name.toLowerCase() === o.name.toLowerCase())) settings.qList.push({ id: QUO.newId(), type: 'Other', make: '', name: o.name, kind: '', kw: '', warranty: '', unit: '', cost: '', markup: '', price: String(o.price || '') }); }); settings.qItemsText = ''; saveSettings(); }
  let ch = false; settings.qList.forEach(x => { if (!x.id) { x.id = QUO.newId(); ch = true; } }); if (ch) saveSettings();
}
function renderPrices(v) {
  qSeed();
  const list = settings.qList, cats = QUO.TYPES.concat(list.map(x => x.type).filter((t, i, a) => !QUO.TYPES.includes(t) && a.indexOf(t) === i));
  const cat = ui.pCat || 'Boiler', items = list.filter(x => x.type === cat), M = settings.qMarkup || {};
  const money = n => n === null ? '' : '£' + (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '');
  const row = x => {
    const sale = QUO.saleOf(x, settings), mk = QUO.markupOf(x, settings), open = ui.pEdit === x.id;
    const sub = (QUO.num(x.cost) !== null ? 'cost ' + money(QUO.num(x.cost)) + ' + ' + mk + '% = ' : '') + (sale !== null ? '<b>' + money(sale) + '</b>' : 'no price yet') + (x.unit ? ' / ' + esc(x.unit) : '') + (QUO.num(x.price) !== null ? ' (fixed)' : '');
    const i = (k, l, o = {}) => `<label class="f"><span>${l}</span><input data-pi="${k}" data-id="${x.id}" value="${esc(x[k] || '')}" ${o.mode ? `inputmode="${o.mode}"` : ''} ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.list ? `list="${o.list}"` : ''}></label>`;
    return `<div class="card" style="margin-bottom:10px"><button type="button" class="item" data-act="pEdit" data-id="${x.id}" style="width:100%;text-align:left"><span><span class="t">${esc(((x.make ? x.make + ' ' : '') + (x.name || 'New item')) + (x.kw && x.type === 'Boiler' ? ' · ' + x.kw + ' kW' : '') + (x.warranty && x.type === 'Boiler' ? ' · ' + x.warranty : ''))}</span><span class="s" style="display:block">${sub}</span></span></button>
    ${open ? `<div style="margin-top:12px">
      ${i('type', 'Category', { list: 'pCats' })}${x.type === 'Boiler' || x.make ? '' : ''}
      ${i('make', 'Make')}${i('name', 'Model / item')}
      ${x.type === 'Boiler' ? `<div class="row"><label class="f grow"><span>Boiler type</span><select data-pi="kind" data-id="${x.id}"><option value=""></option>${QUO.KIND.map(k => `<option ${x.kind === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label>${i('kw', 'kW', { mode: 'decimal' })}</div>
      <label class="f"><span>Manufacturer warranty</span><select data-pi="warranty" data-id="${x.id}"><option value=""></option>${QUO.WARRANTY.map(k => `<option ${x.warranty === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label>` : ''}
      <div class="row">${i('cost', 'My cost (£)', { mode: 'decimal' })}${i('markup', 'Mark-up %', { mode: 'decimal', ph: mk + ' (' + (QUO.num(x.markup) === null ? 'standard' : 'own') + ')' })}</div>
      ${i('price', 'Fixed sale price (£), optional', { mode: 'decimal', ph: 'Leave empty to use cost + mark-up' })}
      ${i('unit', 'Unit', { ph: 'each, metre, pack…' })}
      <p class="small muted" style="margin:0 0 10px">Sale price before VAT: <b>${sale === null ? 'needs a cost price' : money(sale)}</b>${sale !== null && QUO.num(x.cost) ? ` · profit ${money(sale - QUO.num(x.cost))}` : ''}</p>
      <button type="button" class="btn ghost" data-act="pDel" data-id="${x.id}">Delete this item</button></div>` : ''}</div>`;
  };
  v.innerHTML = `<h1>Price list</h1>
    <p class="small muted" style="margin-top:0">Add your cost and mark-up and the app works out the price you quote. Tap an item to change it.</p>
    <div class="card"><label class="f"><span>Standard mark-up on everything (%)</span><input data-s="qMarkupDef" inputmode="decimal" value="${esc(settings.qMarkupDef)}"></label>
    <label class="f" style="margin-bottom:0"><span>Mark-up for ${esc(cat)} (%)</span><input data-pmk="${esc(cat)}" inputmode="decimal" value="${esc(M[cat] || '')}" placeholder="${esc(settings.qMarkupDef || '0')} (standard)"></label></div>
    <div class="seg wrap" style="margin:14px 0">${cats.map(c => `<button type="button" class="${c === cat ? 'on' : ''}" data-act="pCat" data-c="${esc(c)}">${esc(c)} (${list.filter(x => x.type === c).length})</button>`).join('')}</div>
    <button type="button" class="btn block" data-act="pAdd" style="margin-bottom:12px">+ Add to ${esc(cat)}</button>
    ${items.length ? items.map(row).join('') : '<p class="muted">Nothing here yet.</p>'}
    <datalist id="pCats">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist>
    <h2>Excel</h2><div class="card">
      <p class="small muted" style="margin:0 0 8px">Easier for filling in lots of prices at once. Download, type in the cost and mark-up columns, and import it back. Importing replaces the list.</p>
      <button type="button" class="btn block" data-act="qExport">Download price list (Excel)</button><div style="height:8px"></div>
      <label class="btn block ghost" style="display:block;text-align:center">Import price list<input type="file" id="qImport" accept=".xlsx,.xls,.csv" hidden></label><div style="height:8px"></div>
      <button type="button" class="btn block ghost" data-act="qClearList">Reset to the built-in list</button></div>
    <button class="btn block ghost" data-nav="settings" style="margin-top:14px">Back to settings</button>`;
}
/* make (or category) dropdown + search box + the matching items to tap */
const QF_LIST = { boiler: () => qOf('Boiler'), extra: qExtraList };
function qFindRes(kind) {
  const f = (ui.qf = ui.qf || {})[kind] || {}, list = QF_LIST[kind]();
  if (f.done) return '';
  const _l = list, grp = kind === 'boiler' ? 'make' : 'type', words = String(f.q || '').toLowerCase().split(/\s+/).filter(Boolean);
  const hits = list.map((x, i) => [x, i]).filter(([x]) => (!f.g || x[grp] === f.g) && words.every(w => (x.make + ' ' + x.name + ' ' + x.kw + 'kw ' + x.kind + ' ' + x.type).toLowerCase().includes(w)));
  if (!f.g && !words.length) return '<p class="small muted" style="margin:6px 0 0">Choose a ' + (kind === 'boiler' ? 'make' : 'category') + ' or start typing to search.</p>';
  if (!hits.length) return '<p class="small muted" style="margin:6px 0 0">Nothing matches. Type the details in yourself below.</p>';
  return '<div class="qres">' + hits.slice(0, 12).map(([x, i]) => `<button type="button" class="btn ghost" style="display:block;width:100%;text-align:left;margin-bottom:6px" data-act="qFind" data-kind="${kind}" data-i="${i}">${esc((kind === 'extra' && x.make ? x.make + ' ' : '') + x.name + (kind === 'boiler' && x.kind ? ' · ' + x.kind : '') + (kind === 'boiler' && x.warranty ? ' · ' + x.warranty + ' warranty' : '') + qPrice(x))}</button>`).join('') + (hits.length > 12 ? `<p class="small muted" style="margin:0">${hits.length - 12} more. Type more to narrow it down.</p>` : '') + '</div>';
}
function qFinder(kind, title) {
  const list = QF_LIST[kind](); if (!list.length) return '';
  const grp = kind === 'boiler' ? 'make' : 'type', f = (ui.qf = ui.qf || {})[kind] || {}, gs = list.map(x => x[grp] || 'Other').filter((g, i, a) => a.indexOf(g) === i).sort();
  return `<div class="f"><span>${title}</span>
    <select data-qg="${kind}"><option value="">${kind === 'boiler' ? 'All makes' : 'All categories'}</option>${gs.map(g => `<option ${f.g === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select>
    <input type="search" data-qs="${kind}" placeholder="Search, e.g. 4000 25 or hive" value="${esc(f.q || '')}" autocomplete="off" style="margin-top:8px">
    <div id="qres-${kind}">${qFindRes(kind)}</div></div>`;
}
async function qLib() {
  if (window.XLSX) return window.XLSX;
  await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'lib/xlsx.core.min.js'; s.onload = ok; s.onerror = () => no(new Error('Could not load the spreadsheet tool. Check your connection and try again.')); document.head.appendChild(s); });
  return window.XLSX;
}
async function qExport() {
  try {
    const X = await qLib(), items = (settings.qList && settings.qList.length) ? settings.qList.slice() : qAll();
    if (!(settings.qList && settings.qList.length)) QUO.parseItems(settings.qItemsText).forEach(x => items.push({ type: 'Other', make: '', name: x.name, kind: '', kw: '', warranty: '', cost: '', price: x.price }));
    const ws = X.utils.aoa_to_sheet(QUO.rowsFromItems(items));
    ws['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 46 }, { wch: 13 }, { wch: 6 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 14 }];
    const help = X.utils.aoa_to_sheet([['How to use this price list'], ['1. On the Price list sheet, fill in My cost (what you pay) and Mark-up %. The app works out the sale price (before VAT). Only type a Sale price if you want a fixed price instead.'], ['2. Category: Boiler, Flue, Labour, Copper & pipe, Fittings, Controls & thermostats and so on, or make up your own. Boiler type: Combination, System or Heat only.'], ['3. Add your own rows at the bottom. Delete any you do not use.'], ['4. Save the file, then in the app go to Settings, Quotes, Import price list.'], ['Your cost prices are only ever shown to you. They never appear on a customer quote.']]);
    help['!cols'] = [{ wch: 110 }];
    const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, 'Price list'); X.utils.book_append_sheet(wb, help, 'How to use');
    const out = X.write(wb, { bookType: 'xlsx', type: 'array' });
    await saveFile(out, 'Quote price list.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  } catch (e) { toast(e.message || 'Could not make the spreadsheet'); }
}
async function qImport(file) {
  try {
    const X = await qLib(), wb = X.read(await file.arrayBuffer(), { type: 'array' });
    const name = wb.SheetNames.find(n => /price/i.test(n)) || wb.SheetNames[0];
    const items = QUO.itemsFromRows(X.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' }));
    if (!items.length) { toast('No items found. Use the sheet you downloaded from here.'); return; }
    settings.qList = items; saveSettings(); render();
    toast(items.length + ' items imported');
  } catch (e) { toast(e.message || 'Could not read that file'); }
}
function qPick(kind, idx) {
  const r = ui.rec, it = { boiler: qOf('Boiler'), flue: qOf('Flue'), labour: qOf('Labour'), extra: qExtraList() }[kind], x = it[idx];
  if (!x) return;
  if (kind === 'boiler') {
    r.kind = x.kind || r.kind; r.model = x.name; r.kw = x.kw || r.kw;
    if (SVC.MAKE.includes(x.make)) { r.make = x.make; r.makeOther = ''; } else if (x.make) { r.make = 'Other'; r.makeOther = x.make; }
    if (QUO.WARRANTY.includes(x.warranty)) r.warranty = x.warranty;
    if (QUO.saleText(x, settings)) r.boilerPrice = QUO.saleText(x, settings); r.boilerCost = x.cost || '';
  } else if (kind === 'flue') { r.flueDesc = x.name; if (QUO.saleText(x, settings)) r.fluePrice = QUO.saleText(x, settings); r.flueCost = x.cost || ''; }
  else if (kind === 'labour') { r.labourDesc = x.name; if (QUO.saleText(x, settings)) r.labourPrice = QUO.saleText(x, settings); r.labourCost = x.cost || ''; }
  else { (r.lines = r.lines || []).push({ name: (x.make ? x.make + ' ' : '') + x.name, qty: '1', price: QUO.saleText(x, settings), cost: x.cost || '' }); }
  if (kind === 'boiler' || kind === 'extra') (ui.qf = ui.qf || {})[kind] = { done: 1 };
  if (kind === 'extra') (ui.qOpen = ui.qOpen || {}).extra = false;
  ui.pdf = null; persistRec(r); const y = window.scrollY; render(); window.scrollTo(0, y);
}
function quoTotHtml() {
  const r = ui.rec, T = QUO.totals(r, settings), m = QUO.money;
  return `<div class="row sp"><span>Subtotal</span><b>${m(T.sub)}</b></div>${T.rate ? `<div class="row sp"><span>VAT at ${T.rate}%</span><b>${m(T.vat)}</b></div>` : ''}<div class="row sp"><span>Total</span><b>${m(T.total)}</b></div>${(() => { const c = QUO.costOf(r); return c === null ? '' : `<p class="small muted" style="margin:10px 0 0">Only you see this. Your cost ${m(c)} · profit ${m(T.sub - c)} (${T.sub ? Math.round((T.sub - c) / T.sub * 100) : 0}%)</p>`; })()}`;
}
const qInList = l => (settings.qList || []).some(x => { const n = String(l.name || '').trim().toLowerCase(); return n && (x.name.toLowerCase() === n || ((x.make ? x.make + ' ' : '') + x.name).toLowerCase() === n); });
function qCommitTick(l, i) {
  if (!String(l.name || '').trim() || !String(l.price || '').trim()) return '';
  if (qInList(l)) return `<p class="small muted" data-qtick="${i}" data-kind="in" style="margin:0 0 10px">✓ In your price list</p>`;
  return `<button type="button" class="item tog" data-act="qCommit" data-qtick="${i}" data-kind="tick" data-i="${i}" style="margin-bottom:10px"><span class="box"></span><span><span class="t">Commit to price list</span><span class="s" style="display:block">Save it so you can pick it on future quotes</span></span></button>`;
}
function quoExtras() {
  const r = ui.rec; qSeed();
  const open = !!(ui.qOpen && ui.qOpen.extra);
  const lines = (r.lines || []).map((l, i) => `<div class="card" style="margin-bottom:10px">
    <div style="display:flex;gap:8px;align-items:flex-end"><div style="flex:1">${txt('lines.' + i + '.name', 'Item', { ph: 'For example magnetic filter' })}</div><button type="button" class="btn ghost" data-act="qRmLine" data-i="${i}" aria-label="Remove this item" style="width:auto;min-height:48px;margin-bottom:14px">✕</button></div>
    <div class="row">${txt('lines.' + i + '.qty', 'Qty', { mode: 'numeric' })}${txt('lines.' + i + '.price', 'Price each (£)', { mode: 'decimal' })}</div>
    ${qCommitTick(l, i)}</div>`).join('');
  return `${lines}
  ${open ? `<div class="card" style="margin-bottom:10px">${qFinder('extra', 'Add from your price list')}<button type="button" class="btn ghost block" data-act="qOpen" data-k="extra">Close</button></div>` : ''}
  <div class="row" style="margin-bottom:6px"><button type="button" class="btn grow" data-act="qOpen" data-k="extra">+ From price list</button><button type="button" class="btn ghost grow" data-act="qAddLine" data-name="" data-price="">+ Own item</button></div>
  <h2>Labour</h2>
  <div class="card">
    ${qSelect('labour', 'Choose labour', qOf('Labour'), false)}
    <div class="row">${txt('labourDesc', 'Description')}${txt('labourPrice', 'Price (£)', { req: 1, mode: 'decimal' })}</div>
  </div>
  <div class="card">${txt('homeNotes', 'Specific to this home (optional, shown on the quote)', { area: 1, rows: 2 })}</div>
  <div class="card">${choice('textSize', 'Text size on the quote (Large is easier for older customers)', ['Normal', 'Large'])}</div>
  <div class="card" id="quoTot">${quoTotHtml()}</div>`;
}
function comBoiler() {
  const r = ui.rec;
  return `<div class="card">
    ${choice('make', 'Boiler make', SVC.MAKE, { req: 1, wrap: 1 })}
    ${r.make === 'Other' ? txt('makeOther', 'Make', { req: 1 }) : ''}
    ${txt('model', 'Boiler model', { req: 1 })}
    ${txt('serial', 'Serial number', { req: 1, cap: 'characters' })}
    ${txt('gc', 'Gas Council number', { cap: 'characters' })}
    ${choice('kind', 'Boiler type', COM.KIND, { req: 1, wrap: 1 })}
  </div>
  <h2>Compliance</h2>
  <div class="card">
    ${choice('regsOk', 'Heating and hot water system complies with the Building Regulations?', COM.YN, { req: 1, yn: 1 })}
    ${txt('regsNo', 'Building Regulations notification number (if applicable)', { cap: 'characters' })}
    ${choice('interlock', 'Time, temperature control and boiler interlock provided for central heating and hot water?', COM.YN, { req: 1, yn: 1 })}
  </div>
  <h2>Boiler Plus options</h2>
  <p class="small muted" style="margin-top:0">Tick everything that applies.</p>
  <div class="card">${COM.plusFor(r).map(([k, l]) => tick(k, l)).join('')}</div>
  <h2>System components</h2>
  <div class="card">${COM.PARTS.map(([k, l]) => choice(k, l, COM.PFN, { req: 1, wrap: 1 })).join('')}</div>`;
}
/* Brand / product pickers for the water treatment: common ones as buttons, anything else typed under Other and remembered */
const COM_MEMO = ['cleanerBrand', 'cleanerProduct', 'inhibBrand', 'inhibProduct'];
function comPick(path, label, kind, brandPath) {
  const r = ui.rec, v = String(getP(r, path) ?? '').trim();
  const base = kind ? (COM.WATER[getP(r, brandPath)] || {})[kind] || [] : Object.keys(COM.WATER);
  const memo = ((settings.comMemo || {})[path] || []).filter(x => !base.some(b => b.toLowerCase() === x.toLowerCase()));
  const opts = [...base, ...memo];
  const hit = opts.find(x => x.toLowerCase() === v.toLowerCase());
  const key = r.id + '.' + path, other = !hit && (v !== '' || (ui.comOther && ui.comOther[key]));
  const act = kind ? 'data-k="' + path + '"' : 'data-act="comBrand" data-path="' + path + '"';
  const bd = ui.showErr && !v;
  return `<div class="f ${bd ? 'bad' : ''}" data-f="${path}"><span>${label} <b>*</b></span><div class="seg wrap">` +
    opts.map(x => `<button type="button" class="${hit === x ? 'on' : ''}" ${act} data-v="${esc(x)}">${esc(x)}</button>`).join('') +
    `<button type="button" class="${other ? 'on' : ''}" data-act="comOther" data-path="${path}">Other</button></div></div>` +
    (other ? txt(path, label + ' (type it in)', { req: 1, cap: 'words' }) : '');
}
function comWater() {
  const r = ui.rec;
  return `<div class="card">
    ${choice('flushed', 'System flushed, cleaned and a suitable inhibitor applied after final fill (BS 7593 and the boiler maker\'s instructions)?', COM.YN, { req: 1, yn: 1 })}
    ${r.flushed === 'Yes' ? `<h2>System cleaner</h2>${comPick('cleanerBrand', 'Brand')}${comPick('cleanerProduct', 'Product', 'cleaner', 'cleanerBrand')}<h2>Inhibitor</h2>${comPick('inhibBrand', 'Brand')}${comPick('inhibProduct', 'Product', 'inhib', 'inhibBrand')}` : ''}
    ${choice('filter', 'Primary water system filter', COM.PFN, { req: 1, wrap: 1 })}
  </div>`;
}
function comReadings() {
  const r = ui.rec, combi = COM.isCombi(r);
  return `<h2>${combi ? 'Central heating mode' : 'Central heating'}</h2>
  <div class="card">
    ${txt('chRate', 'Gas rate, central heating mode', { req: 1, mode: 'decimal' })}
    ${choice('chUnit', 'Gas rate unit', COM.UNIT)}
    ${choice('chFactory', 'Central heating output left at factory settings?', COM.YN, { req: 1 })}
    ${r.chFactory === 'No' ? txt('chMax', 'Maximum central heating output selected (kW)', { req: 1, mode: 'decimal' }) : ''}
    ${txt('chPress', 'Dynamic gas inlet pressure (mbar)', { req: 1, mode: 'decimal' })}
    ${txt('chFlow', 'Central heating flow temperature (°C)', { req: 1, mode: 'decimal' })}
    ${txt('chReturn', 'Central heating return temperature (°C)', { req: 1, mode: 'decimal' })}
    ${choice('balanced', 'System correctly balanced or rebalanced?', COM.YN, { req: 1, yn: 1 })}
  </div>
  ${combi ? `<h2>Hot water mode</h2>
  <div class="card">
    ${txt('dhwRate', 'Gas rate', { req: 1, mode: 'decimal' })}
    ${choice('dhwUnit', 'Gas rate unit', COM.UNIT)}
    ${txt('dhwPress', 'Dynamic gas inlet pressure at maximum rate (mbar)', { req: 1, mode: 'decimal' })}
    ${txt('coldTemp', 'Cold water inlet temperature (°C)', { req: 1, mode: 'decimal' })}
    ${choice('outletsOk', 'Hot water checked at all outlets?', COM.YN, { req: 1, yn: 1 })}
    ${txt('hotTemp', 'Hot water temperature at the outlets (°C)', { req: 1, mode: 'decimal' })}
  </div>` : ''}
  <h2>Combustion readings</h2>
  <div class="card">
    <p class="small muted" style="margin-top:0">At maximum rate. Take the minimum rate readings as well where the boiler allows it. The CO/CO₂ ratio is worked out for you.</p>
    ${txt('maxCo', 'CO at maximum rate (ppm)', { req: 1, mode: 'decimal' })}
    ${txt('maxCo2', 'CO₂ at maximum rate (%)', { req: 1, mode: 'decimal' })}
    ${txt('minCo', 'CO at minimum rate (ppm)', { mode: 'decimal' })}
    ${txt('minCo2', 'CO₂ at minimum rate (%)', { mode: 'decimal' })}
    ${choice('flueCheck', 'Flue integrity check done, with correct readings?', COM.FLUE, { req: 1 })}
  </div>`;
}
function comHandover() {
  const r = ui.rec, combi = COM.isCombi(r);
  return `${combi ? `<h2>Combination boiler water</h2>
  <div class="card">
    ${choice('hardWater', 'Installation in a hard water area (over 200 ppm)?', COM.YN, { req: 1 })}
    ${choice('scale', 'Water scale reducer / softener', COM.PFN, { req: 1, wrap: 1 })}
    ${r.scale === 'Fitted' || r.scale === 'Pre-existing' ? txt('scaleType', 'Type, brand and product', {}) : ''}
    ${choice('waterMeter', 'Water meter fitted?', COM.YN, { req: 1 })}
    ${choice('dhwVessel', 'Hot water expansion vessel', COM.PFN, { req: 1, wrap: 1 })}
    ${choice('prv', 'Pressure reducing valve', COM.PFN, { req: 1, wrap: 1 })}
  </div>` : ''}
  <h2>Condensate disposal</h2>
  <div class="card">
    ${choice('condOk', 'Condensate drain installed to the manufacturer\'s instructions and BS 5546 / BS 6798?', COM.YN, { req: 1, yn: 1 })}
    ${choice('condTerm', 'Point of termination (external only where internal is impractical)', COM.TERM, { req: 1 })}
    ${choice('condMethod', 'Method of disposal', COM.DISP, { req: 1 })}
  </div>
  <h2>Handover</h2>
  <div class="card">
    ${choice('demoDone', 'Boiler and system controls demonstrated to, and understood by, the customer?', COM.YN, { req: 1, yn: 1 })}
    ${choice('litLeft', 'Literature explained and left with the customer?', COM.YN, { req: 1, yn: 1 })}
    ${choice('regAdvised', 'Customer told to register the boiler with the manufacturer within one month?', COM.YN, { req: 1, yn: 1 })}
    ${txt('renewal', 'Next service due by', { type: 'date', hint: 'Pre-filled as 12 months from today. Servicing keeps the warranty valid.' })}
  </div>
  <h2>Notes</h2>
  <div class="card">${txt('notes', 'Engineer notes', { area: 1, rows: 4 })}</div>`;
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
    ${txt(`defects.${i}.action`, 'Recommendation', { req: 1, area: 1, rows: 3 })}${quick(`defects.${i}.action`, ['N/A', 'None needed'])}
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
  const r = ui.rec;
  return `<p class="small muted" style="margin-top:0">Mark each check Pass, Fail or N/A. If a check fails, say what the fault is.</p>
  <div class="card">${SVC.APP.map(svcCheck).join('')}</div>
  <h2>System filter</h2>
  <div class="card">
    ${choice('filterPresent', 'Is a system filter present?', SVC.YN, { req: 1, yn: 1 })}
    ${r.filterPresent === 'YES' ? choice('filterCleaned', 'Has the system filter been cleaned?', SVC.YN, { req: 1, yn: 1 }) : ''}
  </div>`;
}
function svcSafety() {
  return `<div class="card">${SVC.SAFE.map(svcCheck).join('')}</div>`;
}
/* the gas tightness test is done last on a service, so it sits on the final page before sign-off */
function svcTightness() {
  const r = ui.rec;
  return `<h2 style="margin-top:0">Gas tightness</h2>
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
    ${r.grTaken === 'YES' ? txt('grValue', 'Gas rate (kW)', { req: 1, mode: 'decimal' }) + calcPanel(ui.rec.id + '-svc', 'grValue') + choice('grResult', 'Is the gas rate correct / acceptable?', SVC.PF, { req: 1 }) : ''}
  </div>
  <h2>Flue gas analysis</h2>
  <div class="card">
    ${choice('fgDone', 'Has a flue gas analysis been performed?', SVC.YN, { req: 1 })}
    ${r.fgDone === 'YES' ? rd('fgCoMin', 'fgCoMax', 'CO ppm') + rd('fgCo2Min', 'fgCo2Max', 'CO2 %') + rd('fgRatioMin', 'fgRatioMax', 'CO/CO2 ratio') + choice('fgResult', 'Was the outcome of the analysis acceptable?', SVC.PF, { req: 1 }) : ''}
  </div>`;
}
function svcFinish() {
  const r = ui.rec;
  return `${svcTightness()}${WARN.needed(r) ? '<div class="notice err">Something on this service has failed, so a Danger / Do Not Use Warning Notice will be needed' + (ui.rec.safe === 'NO' ? ' and the record will be stamped FAIL – DO NOT USE' : '') + '. You will be asked to fill it in at the review step.</div>' : ''}<div class="card">
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
const SVC_PRICE = { gas: 'priceGas', service: 'priceSvc', legionella: 'priceLeg', aircon: 'priceAc', commission: 'priceCom' };
const INV_DESC = { gas: 'Landlord gas safety check and record', service: 'Gas boiler service', legionella: 'Legionella risk assessment', aircon: 'Air conditioning commissioning', commission: 'Boiler commissioning' };
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const priceStr = v => (numOf(v) > 0 ? numOf(v).toFixed(2) : '');
const invStatus = i => (i.paid ? 'paid' : i.due && i.due < todayISO() ? 'overdue' : 'unpaid');
const markSent = inv => { if (inv && !inv.sent) { inv.sent = Date.now(); persistInv(inv); } };
const invForVisit = m => invoices.find(i => (i.recIds || []).some(id => m.some(r => r.id === id)));
/* "Invoice not required" (a favour, a free job): flagged on the visit's records, any invoice is deleted, and the job just shows as complete */
const noInv = m => billable(m).some(r => r.noInvoice);
function setNoInvoice(m, on) {
  billable(m).forEach(r => { r.noInvoice = on; persistRec(r); });
  const inv = on ? invForVisit(m) : null;
  if (inv) {
    const n = parseInt((String(inv.number).match(/(\d+)$/) || [])[1], 10);
    if (!inv.sent && !inv.paid && n && n === (parseInt(settings.invNext, 10) || 1) - 1) { settings.invNext = String(n); saveSettings(); }   // give the number back so there is no gap in the sequence
    invoices = invoices.filter(x => x.id !== inv.id); saveInvoices(); deleteRemote('invoice', inv.id);
    if (ui.invPdf && ui.invPdf.id === inv.id) ui.invPdf = null;
  }
  return inv;
}
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
  const first = greetName(r0.customer.name), addr = addrLine(r0.jobAddress || '');
  const subject = `${m.map(r => SUBJ[typeOf(r)]).join(', ')} and invoice ${inv.number} – ${addrFirst(r0.jobAddress || '')}`;
  const text = `Hi ${first},\n\nPlease find attached your records and invoice for ${addr}, carried out on ${ukDate(r0.inspectionDate)}:\n${m.map(r => `- ${docLine(r)}`).join('\n')}\n- Invoice ${inv.number}: ${money(T.total)}${inv.paid ? ' (paid – thank you)' : ', payment due by ' + ukDate(inv.due)}\n\nKind regards,\n${signOff()}`;
  try { if (navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files, title: subject, text }); markSent(inv); return; } }
  catch (err) { if (err.name === 'AbortError') return; console.warn(err); }
  parts.forEach(p => { const el = document.createElement('a'); el.href = URL.createObjectURL(p.blob); el.download = p.name; document.body.appendChild(el); el.click(); el.remove(); });
  openMail(`mailto:${mailAddr(r0.customer.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text + '\n\n(Attach the downloaded PDFs)')}`);
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
      <button class="btn block" data-act="invOpenVisit">Open invoice (PDF)</button><div style="height:8px"></div>
      <button class="btn block" data-act="invFromVisit">Edit invoice</button>
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
  const el = o.type === 'date' ? dateInp(`data-n="${path}"`, v) : o.area
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
    <div style="height:8px"></div>
    <button class="btn block" data-act="prtOpen">Print for accountant (VAT quarter / bulk)</button>
    <div style="height:14px"></div>
    <div class="chips">${chip('all', 'All')}${chip('unpaid', 'Unpaid')}${chip('paid', 'Paid')}</div>
    ${shown.length ? shown.map(i => `
      <button class="item" data-act="openInv" data-id="${i.id}">
        <div class="row sp"><span class="t">${esc(i.customer.name || 'No customer')}</span><span class="badge ${invStatus(i)}">${invStatus(i)}</span></div>
        <div class="s">${esc(addrFirst(i.jobAddress || '') || 'No address')}</div>
        <div class="row sp"><span class="s">${esc(i.number)} · ${ukDate(i.date)}${i.paid ? '' : ' · due ' + ukDate(i.due)}</span><span class="t">${money(invTotals(i).total)}</span></div>
      </button>`).join('') : `<div class="empty">${invoices.length ? 'No invoices in this view.' : 'No invoices yet.<br>Finish a visit and tap “Create invoice” on the last screen, or start one here.'}</div>`}`;
}

/* saved properties for the customer on this invoice: tap one to use it (a search box appears when there are lots) */
function invPropPick(i) {
  const cu = customers.find(c => c.id === i.customerId), ps = cu ? (cu.properties || []) : [];
  if (ps.length > 5) return `<div class="small muted" style="margin:4px 0">Saved properties for ${esc(cu.name)} – search and tap one:</div><input class="search" id="invPropSearch" placeholder="Search ${ps.length} properties – street, town or postcode" autocomplete="off"><div id="invPropList"></div>`;
  if (ps.length) return `<div class="small muted" style="margin:4px 0">Saved properties for ${esc(cu.name)} – tap the one the work was done at:</div><div class="chips">${ps.map((p, k) => `<button type="button" class="chip ${addrKey(p) === addrKey(i.jobAddress) ? 'on' : ''}" data-act="invPickProp" data-i="${k}">${esc(addrFirst(p))}</button>`).join('')}</div>`;
  return '';
}
function renderInvEdit(v) {
  const i = ui.inv, blankPrice = i.lines.some(l => !numOf(l.p));
  v.innerHTML = `
    <div class="row sp"><h1 style="margin-bottom:6px">${esc(i.number)}</h1><span class="badge ${invStatus(i)}">${invStatus(i)}</span></div>
    <button type="button" class="btn block" data-act="invOpenNow" style="margin:6px 0 12px">View invoice (PDF)</button>
    ${numOf(i.vatRate) > 0 && !String(i.vatNumber || '').trim() ? `<div class="notice">No VAT number on this invoice. Add it in <a href="#" data-nav="settings" style="color:inherit;font-weight:700">Settings</a> or type it in the VAT box below.</div>` : ''}
    ${blankPrice ? `<div class="notice">A line has no price. Type it below, or set standard prices in <a href="#" data-nav="settings" style="color:inherit;font-weight:700">Settings</a>.</div>` : ''}
    <h2>Customer</h2>
    <div class="card">
      ${inf('customer.name', 'Client name', { ph: customers.length ? 'Start typing a name to pick a saved customer' : '' })}
      <div id="invNameSug"></div>
      ${i.customerId ? `<button type="button" class="btn ghost block" data-act="invPickCust" data-id="" style="margin:4px 0 10px">Clear – this is a different customer</button>` : ''}
      ${inf('customer.email', 'Email', { type: 'email', mode: 'email', cap: 'none' })}
      ${addrBox('inv', 'customer.billing', 'Billing address')}
      ${invPropPick(i)}
      ${addrBox('inv', 'jobAddress', 'Property the work was done at')}
      <div id="invAddrSug"></div>
      <button type="button" class="btn block" data-act="invSameAddr">Same as billing address</button>
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
    ${(i.recIds || []).length ? `<button class="btn block" data-act="invNone">Invoice not required</button>
    <p class="small muted" style="margin:6px 0 14px">Deletes this invoice and marks the job as complete with no invoice. You can add one again later.</p>` : ''}
    <button class="btn danger block" data-act="invDel">Delete this invoice</button>`;
}

/* open an invoice's PDF to look at it: straight away if it is already made, otherwise make it first.
   The blank window is opened first, inside the tap, so the phone does not block the pop-up while the PDF is built. */
async function openInvPdf(inv) {
  if (!inv) { toast('No invoice yet'); return; }
  const have = ui.invPdf && ui.invPdf.id === inv.id ? ui.invPdf : null;
  if (have) { window.open(URL.createObjectURL(have.blob), '_blank'); return; }
  const w = window.open('', '_blank');
  try {
    const blob = await buildInvPdf(inv, settings); ui.invPdf = { id: inv.id, blob, name: invFileName(inv) };
    if (w) w.location.href = URL.createObjectURL(blob); else { toast('Invoice ready – tap Open again'); render(); }
  } catch (err) { console.error(err); if (w) w.close(); toast('Could not create the invoice PDF: ' + err.message); }
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
  const first = greetName(i.customer.name), addr = addrLine(i.jobAddress || '');
  const subject = `Invoice ${i.number} – ${settings.businessName}`;
  const text = `Hi ${first},\n\nPlease find attached invoice ${i.number}${addr ? ' for the work at ' + addr : ''}.\n${i.paid ? 'This invoice has been paid – thank you.' : `Total due: ${money(T.total)}\nPayment is due by ${ukDate(i.due)}.`}\n\nKind regards,\n${signOff()}`;
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: subject, text }); markSent(i); return; } }
  catch (err) { if (err.name === 'AbortError') return; console.warn(err); }
  invDownload();
  openMail(`mailto:${mailAddr(i.customer.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text + '\n\n(Attach the downloaded PDF)')}`);
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

/* ---------- print for accountant (bulk invoices for a VAT quarter) ---------- */
const isoOf = (y, m, d) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
function vatQuarterOf(iso, off) {
  const y = +iso.slice(0, 4), m = +iso.slice(5, 7) - 1; let qe = m;
  while (qe % 3 !== off) qe++;
  return { from: isoOf(y, qe - 2, 1), to: isoOf(y, qe + 1, 0) };
}
function prtPresets() {
  const t = todayISO(), y = +t.slice(0, 4), m = +t.slice(5, 7) - 1, d = +t.slice(8, 10), off = [0, 1, 2].includes(+settings.vatQtr) ? +settings.vatQtr : 2;
  const q0 = vatQuarterOf(t, off), q1 = vatQuarterOf(addDays(q0.from, -1), off), q2 = vatQuarterOf(addDays(q1.from, -1), off);
  const ym = Math.min(12, Math.max(1, parseInt(settings.yearMonth, 10) || 4)) - 1, yd = Math.min(31, Math.max(1, parseInt(settings.yearDay, 10) || 6));
  const yStart = yr => isoOf(yr, ym, yd), ty = t >= yStart(y) ? y : y - 1;
  return [
    ['q1', 'Last VAT quarter', q1], ['q0', 'This VAT quarter', q0], ['q2', 'Quarter before that', q2],
    ['m1', 'Last month', { from: isoOf(y, m - 1, 1), to: isoOf(y, m, 0) }], ['m0', 'This month', { from: isoOf(y, m, 1), to: isoOf(y, m + 1, 0) }],
    ['ty', 'This tax year', { from: yStart(ty), to: addDays(yStart(ty + 1), -1) }], ['ly', 'Last tax year', { from: yStart(ty - 1), to: addDays(yStart(ty), -1) }]
  ];
}
function prtApplyPreset(k) { const f = prtPresets().find(x => x[0] === k); if (f) { ui.prt.preset = k; ui.prt.from = f[2].from; ui.prt.to = f[2].to; } ui.prtPdf = null; }
function prtList() {
  const p = ui.prt;
  return invoices.filter(i => {
    const dt = p.basis === 'paid' ? (i.paid ? i.paidDate : '') : i.date;
    if (!dt || dt < p.from || dt > p.to) return false;
    if (p.basis !== 'paid' && ((p.status === 'paid' && !i.paid) || (p.status === 'unpaid' && i.paid))) return false;
    return true;
  });
}
function renderInvPrint(v) {
  const p = ui.prt, list = prtList(), T = list.map(invTotals), sum = k => r2(T.reduce((a, t) => a + t[k], 0));
  const chip = (k, l) => `<button class="chip ${p.preset === k ? 'on' : ''}" data-act="prtPreset" data-k="${k}">${l}</button>`;
  const seg = (k, opts) => `<div class="seg wrap">${opts.map(([val, l]) => `<button type="button" class="${p[k] === val ? 'on' : ''}" data-act="prtSet" data-pk="${k}" data-pv="${val}">${l}</button>`).join('')}</div>`;
  const pdf = ui.prtPdf;
  v.innerHTML = `
    <h1>Print for accountant</h1>
    <p class="small muted" style="margin-top:0">Choose the period, then create one PDF with all the invoices to print or send.</p>
    <h2>Period</h2>
    <div class="chips">${prtPresets().map(([k, l]) => chip(k, l)).join('')}</div>
    <div class="card">
      <div class="row"><div class="grow"><label class="f"><span>From</span>${dateInp('data-pd="from"', p.from)}</label></div><div class="grow"><label class="f"><span>To</span>${dateInp('data-pd="to"', p.to)}</label></div></div>
      <label class="f"><span>Pick invoices by</span></label>
      ${seg('basis', [['inv', 'Invoice date'], ['paid', 'Date paid']])}
      <small class="muted" style="display:block;margin:6px 0 0">${p.basis === 'paid' ? 'Only paid invoices, by the date they were paid (for cash accounting).' : 'By the date on the invoice (the normal VAT tax point).'}</small>
      ${p.basis === 'paid' ? '' : `<div style="height:12px"></div><label class="f"><span>Which ones</span></label>${seg('status', [['all', 'All'], ['paid', 'Paid only'], ['unpaid', 'Unpaid only']])}`}
    </div>
    <div class="card"><div class="small muted">In this print</div>
      <div style="font-weight:700;font-size:18px">${list.length} invoice${list.length === 1 ? '' : 's'}</div>
      ${list.length ? `<dl class="kv" style="grid-template-columns:1fr auto;margin-top:8px"><dt>Sales (excl VAT)</dt><dd style="text-align:right">${money(sum('net'))}</dd><dt>VAT</dt><dd style="text-align:right">${money(sum('vat'))}</dd><dt style="color:var(--gold2);font-weight:700">Total</dt><dd style="text-align:right;font-weight:700">${money(sum('total'))}</dd></dl>` : '<div class="small muted">Nothing in this period – try another period or change “Pick invoices by”.</div>'}
    </div>
    <h2>Layout</h2>
    ${seg('mode', [['compact', 'Statement + breakdowns'], ['full', 'Statement + full invoices'], ['summary', 'Statement only']])}
    <p class="small muted">${{
      compact: '<b>Saves the most paper and ink.</b> Black and white. A one-line-per-invoice statement with VAT totals, then every invoice’s items and totals, several to a page.',
      full: 'The statement on top, then each invoice exactly as you send it to the customer (gold design, one per page). Uses the most paper and ink.',
      summary: 'Just the statement with the VAT totals – one or two pages.'
    }[p.mode]}</p>
    <div style="height:6px"></div>
    <button class="btn gold block" data-act="prtMake" ${list.length ? '' : 'disabled'}>Create PDF</button>
    ${pdf ? `<div class="card pdfok" style="margin-top:12px"><div style="font-weight:700;margin-bottom:10px">PDF ready – ${esc(pdf.name)}</div>
      <button class="btn gold block" data-act="prtPrint">Print</button><div style="height:8px"></div>
      <button class="btn block" data-act="prtShare">Share / save</button><div style="height:8px"></div>
      <button class="btn block" data-act="prtDl">Download PDF</button></div>
      <p class="small muted">${isPhone() ? 'Print opens your phone’s share sheet – choose Print there, or send the PDF to your accountant.' : 'Print opens the print window.'} Tip: print double-sided to halve the paper.</p>` : ''}
    <div style="height:14px"></div>
    <button class="btn ghost block" data-nav="invoices">Back to invoices</button>`;
}
const isPhone = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
/* phone / tablet: the share sheet (it has Print on it). Computer: the print window. */
async function prtPrint() {
  const p = ui.prtPdf; if (!p) return;
  if (isPhone()) { await saveFile(p.blob, p.name, 'application/pdf'); return; }
  const url = URL.createObjectURL(p.blob), fr = document.createElement('iframe');
  fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  fr.onload = () => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (err) { window.open(url, '_blank'); } setTimeout(() => { fr.remove(); URL.revokeObjectURL(url); }, 120000); };
  fr.src = url; document.body.appendChild(fr);
}
async function prtMake() {
  const p = ui.prt, list = prtList();
  if (!list.length) { toast('No invoices in that period'); return; }
  toast('Creating PDF…');
  try {
    const blob = await buildStatementPdf(list, settings, { periodText: `${ukDate(p.from)} to ${ukDate(p.to)}`, basisText: p.basis === 'paid' ? 'Paid invoices, by date paid' : { all: 'All invoices, by invoice date', paid: 'Paid invoices, by invoice date', unpaid: 'Unpaid invoices, by invoice date' }[p.status], mode: p.mode });
    ui.prtPdf = { blob, name: `Invoices ${ukDate(p.from).replace(/\//g, '-')} to ${ukDate(p.to).replace(/\//g, '-')}.pdf` };
    const y = window.scrollY; render(); window.scrollTo(0, document.body.scrollHeight); toast(`PDF ready – ${list.length} invoice${list.length === 1 ? '' : 's'}`);
  } catch (err) { console.error(err); toast('Could not create the PDF: ' + err.message); }
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
/* when the subscription has ended the app is read-only: look, download and export, but no new or changed records */
const LOCKED_WRITES = new Set(['custNoRem', 'newRec', 'pickGo', 'newCust', 'editCust', 'saveCust', 'recForCust', 'delCust', 'delRec', 'delDraft', 'addWarn', 'rmWarn', 'newInvBlank', 'invFromVisit', 'invAddLine', 'invRmLine', 'invPaid', 'invPaidVisit', 'invSentVisit', 'invMakePdf', 'invPrep', 'invDel', 'sameName', 'engSigTog', 'engSigUse', 'invNone', 'invNoneVisit', 'invUndoNone', 'discType', 'vatReg', 'sigClear', 'photoRm', 'legAddDef', 'legRmDef', 'legAuto', 'ageUnknown', 'mfrOther', 'tightTimer', 'calcToggle', 'calcSet', 'calcTimer', 'calcUse', 'sameAddr', 'copyPrev', 'pickProp', 'pickSug', 'pickCustId', 'goIssue', 'favCust', 'rmCoLogo', 'rmLogo', 'invMethod', 'invPickCust', 'invPickProp', 'invPickSug']);
const lockedMsg = () => toast('Your subscription has ended. Subscribe to create or change records.');
document.addEventListener('click', async e => {
  /* tap the logo / name at the top to go back to the home screen – a form you are part way through is kept as a draft */
  if (e.target.closest('header.bar .bar-logo, header.bar .bar-title')) {
    if (ui.view === 'form' && ui.rec) { const was = ui.rec.status; exitForm(); if (was === 'draft') toast('Saved as a draft'); }
    else if (ui.view !== 'home' && !document.getElementById('gate')) { ui.view = 'home'; ui.search = ''; ui.job = null; render(); }
    return;
  }
  const nav = e.target.closest('[data-nav]');
  if (nav) { e.preventDefault(); ui.view = nav.dataset.nav; ui.search = ''; render(); return; }
  const kv = e.target.closest('button[data-k][data-v]');
  if (kv) { if (CLOUD.locked()) { lockedMsg(); return; } onChoice(kv.dataset.k, kv.dataset.v); return; }
  const dtb = e.target.closest('.dtb');
  if (dtb) { const n = dtb.querySelector('.dth'); try { n.showPicker(); } catch (err) { /* the tap itself opens it on phones */ } return; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, r = ui.rec;
  if (CLOUD.locked() && (LOCKED_WRITES.has(a) || (a === 'makePdf' && r && r.status !== 'complete'))) { lockedMsg(); return; }
  if (a === 'custNoRem') { ui.cust.noRemind = !ui.cust.noRemind; const y = window.scrollY; render(); window.scrollTo(0, y); return; }
  if (a === 'remTest') { remTest(); return; }
  if (a === 'qCommit') { const l = (ui.rec.lines || [])[+b.dataset.i]; if (l && !qInList(l)) { qSeed(); settings.qList.push({ id: QUO.newId(), type: 'Other', make: '', name: l.name.trim(), kind: '', kw: '', warranty: '', unit: '', cost: String(l.cost || ''), markup: '', price: String(l.price).trim() }); saveSettings(); toast('Added to your price list'); } const y = window.scrollY; render(); window.scrollTo(0, y); return; }
  if (a === 'qOpen') { ui.qOpen = ui.qOpen || {}; ui.qOpen[b.dataset.k] = !ui.qOpen[b.dataset.k]; if (ui.qf) ui.qf[b.dataset.k] = {}; const y = window.scrollY; render(); window.scrollTo(0, y); return; }
  if (a === 'qFind') { qPick(b.dataset.kind, +b.dataset.i); return; }
  if (a === 'pricesOpen') { qSeed(); ui.pCat = ui.pCat || 'Boiler'; ui.pEdit = ''; ui.view = 'prices'; render(); return; }
  if (a === 'pCat') { ui.pCat = b.dataset.c; ui.pEdit = ''; render(); return; }
  if (a === 'pEdit') { ui.pEdit = ui.pEdit === b.dataset.id ? '' : b.dataset.id; const y = window.scrollY; render(); window.scrollTo(0, y); return; }
  if (a === 'pAdd') { const it = { id: QUO.newId(), type: ui.pCat || 'Other', make: '', name: '', kind: '', kw: '', warranty: '', unit: '', cost: '', markup: '', price: '' }; settings.qList.unshift(it); saveSettings(); ui.pEdit = it.id; render(); return; }
  if (a === 'pDel') { if (confirm('Delete this item?')) { settings.qList = settings.qList.filter(x => x.id !== b.dataset.id); saveSettings(); ui.pEdit = ''; render(); } return; }
  if (a === 'qExport') { qExport(); return; }
  if (a === 'qClearList') { if (confirm('Remove the whole price list and start again from the built-in one?')) { settings.qList = []; saveSettings(); qSeed(); render(); toast('Price list reset'); } return; }
  if (a === 'sampleOn') { const n = SAMPLE.add(); render(); toast(n + ' sample forms added'); return; }
  if (a === 'sampleOff') { if (confirm('Remove the sample customers and forms?')) { SAMPLE.remove(); render(); toast('Sample data removed'); } return; }
  if (a === 'remOpen') { ui.view = 'due'; render(); window.scrollTo(0, 0); return; }
  if (a === 'remSent') { const id = b.dataset.id; setTimeout(() => { const o = remGet(); o.s[id] = todayISO(); remSet(o); if (ui.view === 'due') { const y = window.scrollY; render(); window.scrollTo(0, y); } }, 600); return; }
  if (a === 'remDone') { const rr = records.find(x => x.id === b.dataset.id); if (rr) remSetState(rr, b.dataset.v); toast(b.dataset.v === 'booked' ? 'Marked as booked in' : 'Removed from the list'); render(); return; }
  if (a === 'remStop') { if (confirm('Stop reminders for this property? You can still do its next check as normal.')) { const o = remGet(); o.stop[b.dataset.key] = 1; remSet(o); const rr = records.find(x => x.id === b.dataset.id); if (rr) remSetState(rr, 'stop'); render(); } return; }
  if (a === 'remReset') { settings.remText = ''; saveSettings(); render(); return; }
  if (a === 'help') { if (ui.view !== 'help') { ui.helpFrom = ui.view; } ui.helpQ = ''; ui.view = 'help'; render(); return; }
  if (a === 'news') { if (ui.view !== 'news') ui.helpFrom = ui.view; ui.view = 'news'; render(); return; }
  if (a === 'feedback') { ui.fbFrom = ui.view === 'help' ? (ui.helpFrom || 'help') : ui.view; if (ui.view !== 'help') ui.helpFrom = ui.view; ui.view = 'feedback'; render(); return; }
  if (a === 'fbKind') { ui.fb = ui.fb || { kind: 'fault', text: '' }; ui.fb.kind = b.dataset.kind; const y = window.scrollY; render(); window.scrollTo(0, y); return; }
  if (a === 'fbSend') {
    const F = ui.fb || { kind: 'fault', text: '' }, txt = (F.text || '').trim();
    if (!txt) { toast('Type your message first'); return; }
    if (!CLOUD.on || !CLOUD.signedIn()) { location.href = 'mailto:support@ombgas.com?subject=' + encodeURIComponent('OMB Gas ' + APP_VERSION + ' ' + F.kind) + '&body=' + encodeURIComponent(txt); return; }
    const q = fbQueue(); q.push({ kind: F.kind, message: txt.slice(0, 4000), app_version: APP_VERSION, device: String(navigator.userAgent || '').slice(0, 200), screen: fbWhere() }); fbSave(q);
    ui.fb = { kind: 'fault', text: '' };
    const n = await fbFlush();
    toast(n ? 'Sent. Thank you!' : 'Saved. It will send when you are online.');
    ui.view = ui.helpFrom && ui.helpFrom !== 'help' && ui.helpFrom !== 'feedback' && (ui.helpFrom !== 'form' || ui.rec) ? ui.helpFrom : 'home'; render(); return;
  }
  if (a === 'adminFbStatus') { try { await CLOUD.rpc('admin_feedback_status', { target: b.dataset.id, val: b.dataset.v }); toast('Updated'); } catch (e) { toast('Could not update: ' + e.message); } adminLoad(); return; }
  if (a === 'newsDismiss') { nsSet(); render(); return; }
  if (a === 'helpBack') { ui.view = ui.helpFrom && ui.helpFrom !== 'help' && (ui.helpFrom !== 'form' || ui.rec) ? ui.helpFrom : 'home'; render(); return; }
  switch (a) {
    case 'newRec': ui.pick = { types: { [b.dataset.type]: true }, customer: null }; if (b.dataset.type === 'quote') { startJob(); break; } ui.view = 'pick'; render(); break;
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
    case 'comOther': {
      (ui.comOther = ui.comOther || {})[r.id + '.' + b.dataset.path] = true;
      const cur = String(getP(r, b.dataset.path) ?? '').trim(), known = Object.keys(COM.WATER).concat(...Object.values(COM.WATER).map(w => [...w.cleaner, ...w.inhib]));
      if (known.some(x => x.toLowerCase() === cur.toLowerCase())) { setP(r, b.dataset.path, ''); ui.pdf = null; persistRec(r); }
      const y = window.scrollY; render(); window.scrollTo(0, y); break;
    }
    case 'comBrand': {
      const p = b.dataset.path; setP(r, p, b.dataset.v);
      const prod = p === 'cleanerBrand' ? 'cleanerProduct' : 'inhibProduct'; setP(r, prod, '');
      if (ui.comOther) { delete ui.comOther[r.id + '.' + p]; delete ui.comOther[r.id + '.' + prod]; }
      ui.pdf = null; persistRec(r); const y = window.scrollY; render(); window.scrollTo(0, y); break;
    }
    case 'qAddLine': { (r.lines = r.lines || []).push({ name: b.dataset.name || '', qty: '1', price: b.dataset.price || '' }); ui.pdf = null; persistRec(r); const y = window.scrollY; render(); window.scrollTo(0, y); break; }
    case 'qRmLine': { r.lines.splice(+b.dataset.i, 1); ui.pdf = null; persistRec(r); const y = window.scrollY; render(); window.scrollTo(0, y); break; }
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
    case 'copyPrev': applyPrev(r); { const y = window.scrollY; render(); window.scrollTo(0, y); } break;
    case 'engSigTog': {
      if (settings.engSig) { settings.engSig = ''; saveSettings(); toast('Saved signature removed'); }
      else {
        if (!r.engineerSig) { toast('Sign in the box first'); break; }
        const src = await PH.sigResolve(r.engineerSig); if (!src) { toast('Sign in the box first'); break; }
        settings.engSig = src; saveSettings(); r.engAuto = true; persistRec(r); toast('Signature saved – it will be added to your future forms');
      }
      const y = window.scrollY; render(); window.scrollTo(0, y); break;
    }
    case 'engSigUse': { r.engineerSig = PH.sigStore(settings.engSig); r.engAuto = true; persistRec(r); ui.pdf = null; const y = window.scrollY; render(); window.scrollTo(0, y); break; }
    case 'sameName': {
      const nm = (r.customer.name || '').trim(), on = (r.customerName || '').trim() === nm && nm;
      if (!on && !nm) { toast('Enter the customer’s name on the first screen'); break; }
      r.customerName = on ? '' : nm; persistRec(r); ui.pdf = null; const y = window.scrollY; render(); window.scrollTo(0, y); break;
    }
    case 'sameAddr': r.jobAddress = r.customer.billing; persistRec(r); render(); break;
    case 'pickSug': {
      const c = customers.find(x => x.id === b.dataset.c); if (!c) break;
      if (r.customerId !== c.id) { r.customerId = c.id; r.customer = { name: c.name, phone: c.phone, email: c.email, billing: c.billing }; }
      r.jobAddress = b.dataset.a; persistRec(r); render(); break;
    }
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
    case 'delDraft': {
      const x = records.find(q => q.id === b.dataset.id);
      if (x && confirm('Delete this draft' + (x.customer && x.customer.name ? ' for ' + x.customer.name : '') + '? This cannot be undone.')) {
        PH.dropAll(PH.recIds(x)); records = records.filter(q => q.id !== x.id); delete ui.pdfs[x.id]; saveRecords(); deleteRemote('record', x.id); render();
      }
      break;
    }
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
    case 'addCustProp': ui.cust.properties = (ui.cust.properties || []).concat(['']); render(); break;
    case 'rmCustProp': { const ps = (ui.cust.properties || []).slice(); ps.splice(+b.dataset.i, 1); ui.cust.properties = ps; render(); break; }
    case 'saveCust': saveCust(); break;
    case 'custTools': { saveCust(true); const cu = customers.find(c => c.id === ui.cust.id); if (cu) toolsForCustomer(cu); break; }
    case 'recForCust': { saveCust(true); const cu = customers.find(c => c.id === ui.cust.id); ui.pick = { types: {}, customer: cu }; ui.pickFromCust = true; ui.view = 'pick'; render(); break; }
    case 'delCust': if (confirm('Delete this customer? Their past records are kept.')) { customers = customers.filter(c => c.id !== ui.cust.id); saveCustomers(); deleteRemote('customer', ui.cust.id); ui.view = 'customers'; render(); } break;
    case 'rmCoLogo': settings.logo = ''; saveSettings(); render(); break;
    case 'rmLogo': settings.gasSafeLogo = ''; saveSettings(); render(); break;
    case 'expCust': exportCustomers(); break;
    case 'forceUpdate': forceUpdate(); break;
    case 'expAll': exportBackup(); break;
    case 'bkLater': { const d = new Date(); d.setDate(d.getDate() + 7); bkSet({ snooze: d.toISOString().slice(0, 10) }); render(); break; }
    case 'installApp': if (_installEvt) { _installEvt.prompt(); try { await _installEvt.userChoice; } catch (e) { } _installEvt = null; render(); } instPopClose(); break;
    case 'laterInstall': LS.set('omb_instsnooze', Date.now() + 3 * 864e5); instPopClose(); break;
    case 'neverInstall': LS.set('omb_noinstall', true); instPopClose(); render(); break;
    case 'hideInstall': LS.set('omb_noinstall', true); render(); break;
    case 'openAdmin': ui.view = 'admin'; ui.admin = { rows: null, err: '' }; render(); adminLoad(); break;
    case 'adminReload': ui.admin.rows = null; render(); adminLoad(); break;
    case 'adminComp': try { await CLOUD.rpc('admin_set_comped', { target: b.dataset.id, val: !!b.dataset.v }); toast(b.dataset.v ? 'Free pass given' : 'Free pass removed'); } catch (e) { toast(e.message); } adminLoad(); break;
    case 'adminExtend': try { await CLOUD.rpc('admin_extend_trial', { target: b.dataset.id, days: 14 }); toast('Trial extended by 14 days'); } catch (e) { toast(e.message); } adminLoad(); break;
    case 'adminCompEmail': { const em = (document.getElementById('adminEmail').value || '').trim(); if (!/^\S+@\S+\.\S+$/.test(em)) { toast('Enter a valid email address'); break; } try { await CLOUD.rpc('admin_comp_email', { addr: em, val: true }); toast('Free pass saved for ' + em); document.getElementById('adminEmail').value = ''; } catch (e) { toast(e.message); } adminLoad(); break; }
    case 'syncNow': await syncAll(true); break;
    case 'billing': try { if (CLOUD.access().paid) await CLOUD.fn('portal'); else await CLOUD.fn('checkout'); } catch (e) { toast(e.message); } break;
    case 'secCheck': {
      const o = document.getElementById('secOut'); if (!o) break;
      const res = performance.getEntriesByType('resource').map(e => e.name);
      const bad = res.filter(n => /^http:/i.test(n));
      const imgs = [...document.querySelectorAll('[src],[href]')].map(e => e.src || e.href).filter(u => typeof u === 'string' && /^http:/i.test(u));
      o.textContent = 'Page: ' + location.href + '\nSecure context: ' + window.isSecureContext + '\nFiles loaded: ' + res.length +
        '\nInsecure files: ' + (bad.length ? bad.join('\n') : 'none') + '\nInsecure links on page: ' + (imgs.length ? imgs.join('\n') : 'none') +
        '\nService worker: ' + (navigator.serviceWorker && navigator.serviceWorker.controller ? 'active' : 'none') +
        '\nOnline: ' + navigator.onLine + '\nStandalone: ' + isStandalone();
      break;
    }
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
    case 'prtOpen': ui.prt = ui.prt || { preset: 'q1', from: '', to: '', basis: 'inv', status: 'all', mode: 'compact' }; prtApplyPreset(ui.prt.preset === 'custom' ? 'q1' : ui.prt.preset); ui.view = 'invPrint'; render(); break;
    case 'prtPreset': { const y = window.scrollY; prtApplyPreset(b.dataset.k); render(); window.scrollTo(0, y); break; }
    case 'prtSet': { const y = window.scrollY; ui.prt[b.dataset.pk] = b.dataset.pv; ui.prtPdf = null; render(); window.scrollTo(0, y); break; }
    case 'prtMake': await prtMake(); break;
    case 'prtPrint': await prtPrint(); break;
    case 'prtShare': await saveFile(ui.prtPdf.blob, ui.prtPdf.name, 'application/pdf'); break;
    case 'prtDl': { const a2 = document.createElement('a'); a2.href = URL.createObjectURL(ui.prtPdf.blob); a2.download = ui.prtPdf.name; document.body.appendChild(a2); a2.click(); a2.remove(); break; }
    case 'invBack': {
      persistInv(ui.inv);
      if (ui.invFrom === 'visit' && !(ui.invPdf && ui.invPdf.id === ui.inv.id)) { try { ui.invPdf = { id: ui.inv.id, blob: await buildInvPdf(ui.inv, settings), name: invFileName(ui.inv) }; } catch (err) { console.error(err); toast('Could not create the invoice PDF: ' + err.message); } }
      ui.view = ui.invFrom === 'visit' ? 'form' : 'invoices'; render(); break;
    }
    case 'invPickCust': {
      const c = customers.find(x => x.id === b.dataset.id), i = ui.inv;
      i.customerId = c ? c.id : '';
      if (c) { i.customer = { name: c.name, phone: c.phone, email: c.email, billing: c.billing }; if ((c.properties || []).length === 1) i.jobAddress = c.properties[0]; }
      ui.invPdf = null; persistInv(i); const y = window.scrollY; render(); window.scrollTo(0, y); break;
    }
    case 'invPickProp': {
      const i = ui.inv, c = customers.find(x => x.id === i.customerId), p = c && (c.properties || [])[+b.dataset.i];
      if (!p) break; i.jobAddress = p; ui.invPdf = null; persistInv(i); const y = window.scrollY; render(); window.scrollTo(0, y); break;
    }
    case 'invPickSug': {
      const c = customers.find(x => x.id === b.dataset.c), i = ui.inv; if (!c) break;
      if (i.customerId !== c.id) { i.customerId = c.id; i.customer = { name: c.name, phone: c.phone, email: c.email, billing: c.billing }; }
      i.jobAddress = b.dataset.a; ui.invPdf = null; persistInv(i); const y = window.scrollY; render(); window.scrollTo(0, y); break;
    }
    case 'invSameAddr': {
      const i = ui.inv, bill = (i.customer.billing || '').trim();
      if (!bill) { toast('Type the billing address first'); break; }
      i.jobAddress = bill; ui.invPdf = null; persistInv(i); const y = window.scrollY; render(); window.scrollTo(0, y); toast('Property address set to the billing address'); break;
    }
    case 'invNone': {
      const i = ui.inv, m = (i.recIds || []).map(id => records.find(r => r.id === id)).filter(Boolean);
      if (!confirm(`Invoice not required? This deletes invoice ${i.number} and marks the job as complete with no invoice.`)) break;
      setNoInvoice(m, true); ui.view = ui.invFrom === 'visit' ? 'form' : 'invoices'; ui.inv = null; render(); toast('Invoice deleted – job marked as no invoice needed'); break;
    }
    case 'invNoneVisit': {
      const m = jobRecs() || [ui.rec], ex = invForVisit(m);
      if (ex && !confirm(`Invoice not required? This deletes invoice ${ex.number}.`)) break;
      const y = window.scrollY; setNoInvoice(m, true); render(); window.scrollTo(0, y); toast('Marked as no invoice needed'); break;
    }
    case 'invUndoNone': {
      const m = jobRecs() || [ui.rec], bm = billable(m); setNoInvoice(m, false);
      if (bm.length && !invForVisit(m) && bm.every(r => numOf(settings[SVC_PRICE[typeOf(r)]]) > 0)) persistInv(newInvoice(m));
      await ensureInvPdf(m); const y = window.scrollY; render(); window.scrollTo(0, y); break;
    }
    case 'invAddLine': {
      ui.inv.lines.push({ d: '', q: '1', p: '' }); ui.invPdf = null; persistInv(ui.inv); render();
      const el = document.querySelector(`[data-n="lines.${ui.inv.lines.length - 1}.d"]`);
      if (el) { el.scrollIntoView({ block: 'center' }); try { el.focus({ preventScroll: true }); } catch (e) {} }
      break; }
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
    case 'invOpenVisit': await openInvPdf(invForVisit(jobRecs() || [ui.rec])); break;
    case 'invOpenNow': await openInvPdf(ui.inv); break;
    case 'invView': window.open(URL.createObjectURL(ui.invPdf.blob), '_blank'); break;
    case 'invDel': if (confirm('Delete this invoice from this phone? This cannot be undone.')) { invoices = invoices.filter(x => x.id !== ui.inv.id); saveInvoices(); deleteRemote('invoice', ui.inv.id); ui.view = ui.invFrom === 'visit' ? 'form' : 'invoices'; ui.inv = null; render(); } break;
  }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (CLOUD.locked() && ui.view !== 'settings' && t.id !== 'custSearch' && t.id !== 'helpSearch' && t.id !== 'fbText' && t.id !== 'invPropSearch') { lockedMsg(); render(); return; }
  if (t.classList && t.classList.contains('dtx')) { dtxInput(t, e); return; }
  { const aw = t.closest && t.closest('.addrw'); if (aw) { addrInput(aw, t); return; } }
  if (t.dataset.s === 'sortCode') t.value = fmtSort(t.value);
  if (t.id === 'fbText') { ui.fb = ui.fb || { kind: 'fault', text: '' }; ui.fb.text = t.value; return; }
  if (t.id === 'helpSearch') { ui.helpQ = t.value; const hl = document.getElementById('helpList'); if (hl) hl.innerHTML = helpListHtml(t.value); return; }
  if (t.id === 'custSearch') { ui.search = t.value; paintCustList(); return; }
  if (t.id === 'invPropSearch') { const el = document.getElementById('invPropList'); if (el) el.innerHTML = sugHtml(ui.inv, t.value, 'invPickSug'); return; }
  if (t.id === 'propSearch') { const el = document.getElementById('propList'); if (el) el.innerHTML = sugHtml(ui.rec, t.value); return; }
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
    if (t.dataset.k === 'customer.name') { const el = document.getElementById('nameSug'); if (el) el.innerHTML = nameSugHtml(ui.rec, t.value); }
    if (t.dataset.k === 'jobAddress') { const nb = document.getElementById('navBtn'); if (nb) nb.innerHTML = navBtnHtml(t.value); }
    if (t.dataset.k === 'jobAddress') { const el = document.getElementById('addrSug'); if (el) el.innerHTML = t.value.trim().length >= 2 ? sugHtml(ui.rec, t.value) : ''; }
    if (/^tight(Start|End|Mins)$/.test(t.dataset.k)) {
      if (!isSvc(ui.rec)) ui.rec.tightnessResult = tightText(ui.rec.tightStart, ui.rec.tightEnd, ui.rec.tightMins);
      const tl = document.getElementById('tightLive'); if (tl) tl.innerHTML = tightLiveHtml(ui.rec);
      const tg = document.getElementById('tightGo'), th = document.getElementById('tightHint');
      if (tg) tg.disabled = tightNeedsStart(ui.rec);
      if (th) { th.textContent = tightNeedsStart(ui.rec) ? 'Enter the start pressure, then press Start. Press Stop when the test time is up, then enter the end pressure.' : 'Press Start, then Stop when the test time is up and enter the end pressure.'; th.style.color = tightNeedsStart(ui.rec) ? 'var(--warn)' : ''; }
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
    if (t.dataset.n === 'customer.name') { const sg = document.getElementById('invNameSug'); if (sg) sg.innerHTML = nameSugHtml(ui.inv, t.value, 'invPickCust'); }
    const had = !!ui.invPdf; ui.invPdf = null;
    const el = $('#invTotals'); if (el) el.innerHTML = invTotalsHtml(ui.inv);
    if (had) { const bx = $('#invPdfBox'); if (bx) bx.innerHTML = invPdfHtml(); }
    return;
  }
  if (t.dataset.s) { settings[t.dataset.s] = t.value; saveSettings(); if (/^rem(Auto|Days|Text)$/.test(t.dataset.s)) { syncAll(); if (t.dataset.s === 'remAuto') { const y = window.scrollY; render(); window.scrollTo(0, y); return; } } if (/^inv(Prefix|Next|Digits)$/.test(t.dataset.s)) { const pv = document.getElementById('invPreview'); if (pv) pv.textContent = invNumberFor(settings.invNext); } if (t.dataset.s === 'discValue' || /^price/.test(t.dataset.s)) { clearTimeout(settingsRefresh._t); settingsRefresh._t = setTimeout(settingsRefresh, 900); } return; }
  if (t.dataset.c) { ui.cust[t.dataset.c] = t.value; }
});
document.addEventListener('input', e => {
  const t = e.target; if (!t.dataset || !t.dataset.qs) return;
  (ui.qf = ui.qf || {})[t.dataset.qs] = Object.assign(ui.qf[t.dataset.qs] || {}, { q: t.value, done: 0 });
  const el = document.getElementById('qres-' + t.dataset.qs); if (el) el.innerHTML = qFindRes(t.dataset.qs);
});
document.addEventListener('change', async e => {
  if (CLOUD.locked() && ui.view !== 'settings' && e.target.id !== 'custSearch' && e.target.id !== 'helpSearch' && e.target.id !== 'fbText') { lockedMsg(); render(); return; }
  const t = e.target;
  if (t.id === 'qImport' && t.files && t.files[0]) { const fl = t.files[0]; t.value = ''; qImport(fl); return; }
  if (t.dataset.pi) { const it = (settings.qList || []).find(x => x.id === t.dataset.id); if (it) { it[t.dataset.pi] = t.value.trim(); if (t.dataset.pi === 'type' && !it.type) it.type = 'Other'; saveSettings(); const y = window.scrollY; if (t.dataset.pi === 'type') ui.pCat = it.type; render(); window.scrollTo(0, y); } return; }
  if (t.dataset.pmk !== undefined) { settings.qMarkup = settings.qMarkup || {}; settings.qMarkup[t.dataset.pmk] = t.value.trim(); saveSettings(); const y = window.scrollY; render(); window.scrollTo(0, y); return; }
  if (t.dataset.s === 'qMarkupDef' && ui.view === 'prices') { const y = window.scrollY; setTimeout(() => { render(); window.scrollTo(0, y); }, 0); }
  if (t.dataset.qg) { (ui.qf = ui.qf || {})[t.dataset.qg] = Object.assign(ui.qf[t.dataset.qg] || {}, { g: t.value, done: 0 }); const e = document.getElementById('qres-' + t.dataset.qg); if (e) e.innerHTML = qFindRes(t.dataset.qg); return; }
  if (t.dataset.qpick) { if (t.value !== '') qPick(t.dataset.qpick, +t.value); return; }
  if (ui.view === 'form' && ui.rec && ui.rec.type === 'quote' && /^lines\.\d+\.(name|price|qty)$/.test(t.dataset.k || '')) {
    const l = ui.rec.lines[+t.dataset.k.split('.')[1]];
    const i = +t.dataset.k.split('.')[1], card = document.querySelector('[data-qtick="' + i + '"]'), h = l ? qCommitTick(l, i) : '';
    if ((card ? card.dataset.kind : '') !== (h.includes('data-kind="in"') ? 'in' : h ? 'tick' : '')) { const y = window.scrollY; render(); window.scrollTo(0, y); }
  }
  if (ui.view === 'form' && ui.rec && ui.rec.type === 'quote') { const tt = document.getElementById('quoTot'); if (tt) tt.innerHTML = quoTotHtml(); }
  if (ui.view === 'form' && ui.rec && ui.rec.type === 'commission' && COM_MEMO.includes(t.dataset.k) && t.value.trim()) {
    const v = t.value.trim(), m = settings.comMemo = settings.comMemo || {}, l = m[t.dataset.k] = m[t.dataset.k] || [];
    if (!l.some(x => x.toLowerCase() === v.toLowerCase())) { l.unshift(v); l.length = Math.min(l.length, 8); saveSettings(); }
  }
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
  if (t.classList && t.classList.contains('dth')) { const x = t.parentNode.parentNode.querySelector('.dtx'); if (x && document.activeElement !== x) { x.value = ukDisp(t.value); x.style.borderColor = ''; } }
  if (t.dataset.pd && ui.prt) { ui.prt[t.dataset.pd] = t.value; if (ui.prt.from > ui.prt.to && ui.prt.to) { if (t.dataset.pd === 'from') ui.prt.to = t.value; else ui.prt.from = t.value; } ui.prt.preset = 'custom'; ui.prtPdf = null; const y = window.scrollY; render(); window.scrollTo(0, y); return; }
  if (t.id === 'restoreFile' && t.files[0]) { restoreBackup(t.files[0]); t.value = ''; return; }
  if (t.id === 'coLogo' && t.files[0]) {
    const img = new Image(), url = URL.createObjectURL(t.files[0]);
    img.onload = () => {   // trim blank/white margins, then fill the whole square tile edge to edge
      const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height, m = Math.min(1, 1200 / Math.max(w0, h0));
      const tw = Math.max(1, Math.round(w0 * m)), th = Math.max(1, Math.round(h0 * m));
      const t = document.createElement('canvas'); t.width = tw; t.height = th;
      const tc = t.getContext('2d', { willReadFrequently: true }); tc.drawImage(img, 0, 0, tw, th);
      const px = tc.getImageData(0, 0, tw, th).data; let x0 = tw, y0 = th, x1 = -1, y1 = -1;
      for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
        const i = (y * tw + x) * 4, blank = px[i + 3] < 20 || (px[i] > 235 && px[i + 1] > 235 && px[i + 2] > 235);
        if (!blank) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      if (x1 < 0) { x0 = 0; y0 = 0; x1 = tw - 1; y1 = th - 1; }
      const cw = x1 - x0 + 1, ch = y1 - y0 + 1, S = 400, sc = Math.min(S / cw, S / ch), dw = cw * sc, dh = ch * sc;
      const cv = document.createElement('canvas'); cv.width = cv.height = S;
      const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, S, S);
      const e = tc.getImageData(x0, y0, 1, 1).data;   // colour at the logo's own corner, so any gap blends in
      if (e[3] > 200) { c.fillStyle = 'rgb(' + e[0] + ',' + e[1] + ',' + e[2] + ')'; c.fillRect(0, 0, S, S); }
      c.drawImage(t, x0, y0, cw, ch, (S - dw) / 2, (S - dh) / 2, dw, dh);
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
  if (/^appliances\.\d+\.type$/.test(path)) {   // changing the type: drop a manufacturer that belongs to a different list
    const ap = getP(r, path.replace(/\.type$/, '')), mk = String(ap.manufacturer || '').trim().toLowerCase();
    if (mk && !makesFor(val).some(x => x.toLowerCase() === mk)) { ap.manufacturer = ''; if (ui.mfrOther) delete ui.mfrOther[r.id + '.' + path.split('.')[1]]; }
    if (val !== 'Other') ap.typeOther = '';
    if (/^(cooker|hob|oven)$/i.test(val)) ap.gc = '';
  }
  if (path === 'applianceCount') { const n = +val; while (r.appliances.length < n) r.appliances.push(blankAppliance()); if (ui.appTab >= n) ui.appTab = n - 1; }
  if (path === 'defectCount') { const n = +val; while (r.defects.length < n) r.defects.push(blankDefect()); }
  persistRec(r);
  const y = window.scrollY; render(); window.scrollTo(0, y);
}
function goNext() {
  const r = ui.rec, s = ui.step;
  const issues = validate(r).filter(x => x.step === s && (isLeg(r) || isSvc(r) || isWarn(r) || isAc(r) || isCom(r) || isQuo(r) || s !== 1 || x.app === ui.appTab));
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
  const props = (c.properties || []).map(x => String(x || '').trim()).filter(Boolean);
  const out = { id: c.id, name: c.name.trim(), phone: c.phone, email: c.email, billing: c.billing, properties: props, updated: Date.now(), _dirty: true };
  if (c.noRemind) out.noRemind = true;
  if (c.fav) out.fav = true;
  if (c.remSt && Object.keys(c.remSt).length) out.remSt = c.remSt;
  if (c.reports && c.reports.length) out.reports = c.reports;
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
    if (bm.length && !noInv(m) && !invForVisit(m) && bm.every(r => numOf(settings[SVC_PRICE[typeOf(r)]]) > 0)) persistInv(newInvoice(m));
    await ensureInvPdf(m);
    render(); toast(m.length > 1 ? `${m.length} PDFs created` : 'PDF created'); syncAll();
  } catch (err) { console.error(err); toast('Could not create the PDF: ' + err.message); }
}
async function sharePdf(r) {
  r = r || ui.rec;
  copyEmail((r.customer || {}).email);
  const { blob, name } = ui.pdfs[r.id], [doc, due] = FORM_DOC[typeOf(r)];
  const file = new File([blob], name, { type: 'application/pdf' });
  const first = greetName(r.customer.name), addr = addrLine(r.jobAddress || '');
  const subject = `${SUBJ[typeOf(r)]} – ${addrFirst(r.jobAddress || '')}`;
  const text = isQuo(r) ? `Hi ${first},\n\nThank you for the chance to quote. Please find attached your quotation for ${addr}. It is valid for 30 days.\n\nIf you would like to go ahead, just reply to this email and I will call you to arrange a date for the installation.\n\nKind regards,\n${signOff()}`
    : `Hi ${first},\n\nPlease find attached your ${doc} for ${addr}, carried out on ${ukDate(r.inspectionDate)}.${due ? '\n' + due + ' ' + ukDate(r.renewal) + '.' : ''}\n\nKind regards,\n${signOff()}`;
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: subject, text }); return; }
  } catch (err) { if (err.name === 'AbortError') return; console.warn(err); }
  downloadPdf(r);
  openMail(`mailto:${mailAddr(r.customer.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text + '\n\n(Attach the downloaded PDF)')}`);
}
async function sharePdfAll(sel) {
  const m = sel || jobRecs() || [ui.rec], r0 = m[0];
  const files = m.map(r => new File([ui.pdfs[r.id].blob], ui.pdfs[r.id].name, { type: 'application/pdf' }));
  const first = greetName(r0.customer.name), addr = addrLine(r0.jobAddress || '');
  const subject = `${m.map(r => SUBJ[typeOf(r)]).join(', ')} – ${addrFirst(r0.jobAddress || '')}`;
  const text = `Hi ${first},\n\nPlease find attached your records for ${addr}, carried out on ${ukDate(r0.inspectionDate)}:\n${m.map(r => `- ${docLine(r)}`).join('\n')}\n\nKind regards,\n${signOff()}`;
  try {
    if (navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files, title: subject, text }); return; }
  } catch (err) { if (err.name === 'AbortError') return; console.warn(err); }
  m.forEach(r => downloadPdf(r));
  openMail(`mailto:${mailAddr(r0.customer.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text + '\n\n(Attach the downloaded PDFs)')}`);
}
function downloadPdf(r) {
  r = r || ui.rec; const p = ui.pdfs[r.id];
  const a = document.createElement('a'); a.href = URL.createObjectURL(p.blob); a.download = p.name; document.body.appendChild(a); a.click(); a.remove();
}
/* ---------- export / backup ---------- */
async function saveFile(content, name, mime) {
  const blob = new Blob([content], { type: mime }), file = new File([blob], name, { type: mime });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return true; } }
  catch (err) { if (err.name === 'AbortError') return false; console.warn(err); }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  return true;
}
function exportCustomers() {
  if (!customers.length) { toast('No customers to export yet'); return; }
  const q = v => '"' + String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ', ') + '"';
  const rows = [['Name', 'Phone', 'Email', 'Billing address', 'Property addresses']].concat(
    [...customers].sort((a, b) => a.name.localeCompare(b.name)).map(c => [c.name, c.phone, c.email, c.billing, (c.properties || []).join(' | ')]));
  saveFile('\ufeff' + rows.map(r => r.map(q).join(',')).join('\r\n'), `Customers ${todayISO()}.csv`, 'text/csv');
}
/* optional password on a backup: AES-256-GCM with a key made from the password (PBKDF2). Nothing is sent anywhere. */
const b64 = bytes => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result.split(',')[1]); f.readAsDataURL(new Blob([bytes])); });
const unb64 = async t => new Uint8Array(await (await fetch('data:application/octet-stream;base64,' + t)).arrayBuffer());
async function pwKey(pw, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function lockBackup(text, pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await pwKey(pw, salt), new TextEncoder().encode(text));
  return JSON.stringify({ app: 'omb-gas', encrypted: true, v: 1, salt: await b64(salt), iv: await b64(iv), data: await b64(new Uint8Array(enc)) });
}
async function unlockBackup(d, pw) {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: await unb64(d.iv) }, await pwKey(pw, await unb64(d.salt)), await unb64(d.data));
  return new TextDecoder().decode(plain);
}
/* a small box asking for the password; resolves to the password, '' for none, or null if cancelled */
function pwBox(kind) {
  return new Promise(res => {
    const o = document.createElement('div'); o.className = 'bkm';
    const make = kind === 'make';
    o.innerHTML = `<form class="gate-card">
      <h2>${make ? 'Back up your data' : 'This backup has a password'}</h2>
      ${make ? `<p class="gate-small">The file holds your customers' names, addresses and phone numbers. Only save it somewhere private, like your own email or cloud drive. Your bank details are not included.</p>
      <label>Password (optional)<input name="pw" type="password" autocomplete="new-password"></label>
      <label>Type it again<input name="pw2" type="password" autocomplete="new-password"></label>
      <p class="gate-small"><b>If you forget the password the backup cannot be opened, and nobody can recover it.</b> Write it down somewhere safe.</p>`
      : `<label>Password<input name="pw" type="password" autocomplete="current-password"></label>`}
      <p class="gate-err" hidden></p>
      <button class="btn gold block" data-w="pw">${make ? 'Back up with a password' : 'Open backup'}</button>
      ${make ? '<button type="button" class="btn block ghost" data-w="none">Back up without a password</button>' : ''}
      <button type="button" class="link" data-w="no">Cancel</button></form>`;
    const done = v => { o.remove(); res(v); };
    const err = m => { const e = o.querySelector('.gate-err'); e.textContent = m; e.hidden = false; };
    o.addEventListener('click', e => { const w = e.target.closest('[data-w]'); if (!w) return; if (w.dataset.w === 'no') done(null); else if (w.dataset.w === 'none') done(''); });
    o.querySelector('form').addEventListener('submit', e => {
      e.preventDefault(); const f = new FormData(e.target), pw = f.get('pw') || '';
      if (!make) return pw ? done(pw) : err('Type the password.');
      if (!pw) return err('Type a password, or tap "Back up without a password".');
      if (pw.length < 8) return err('Use at least 8 characters.');
      if (pw !== f.get('pw2')) return err('The two passwords are not the same.');
      done(pw);
    });
    document.body.appendChild(o); const i = o.querySelector('input'); if (i) i.focus();
  });
}
async function exportBackup() {
  const pw = await pwBox('make'); if (pw === null) return;
  const { syncToken, bankName, accName, sortCode, accNo, ...keep } = settings;   // bank details are never put in a backup file
  const strip = o => { const c = { ...o }; delete c._dirty; return c; };
  const photos = {};
  for (const r of records) for (const id of PH.allIds(r)) { if (!photos[id]) { const p = await PH.get(id); if (p) photos[id] = p; } }
  const data = { app: 'omb-gas', version: 1, exported: new Date().toISOString(), settings: keep, customers: customers.map(strip), records: records.map(strip), invoices, photos };
  let out = JSON.stringify(data);
  if (pw) { try { out = await lockBackup(out, pw); } catch (e) { toast('Could not lock the backup on this device'); return; } }
  if (await saveFile(out, `OMB backup ${todayISO()}${pw ? ' (password)' : ''}.json`, 'application/json')) { bkSet({ last: todayISO(), snooze: '' }); if (ui.view === 'home' || ui.view === 'settings') render(); }
}
async function restoreBackup(file) {
  try {
    let d = JSON.parse(await file.text());
    if (d.app !== 'omb-gas') throw new Error('not an OMB backup');
    if (d.encrypted) {
      const pw = await pwBox('open'); if (!pw) return;
      try { d = JSON.parse(await unlockBackup(d, pw)); } catch (e) { toast('Wrong password, or the file is damaged'); return; }
    }
    let addC = 0, addR = 0;
    for (const [id, p] of Object.entries(d.photos || {})) { if (!(await PH.get(id))) await PH.put(id, p); }
    (d.invoices || []).forEach(i => { const l = invoices.find(x => x.id === i.id); if (!l) invoices.push(i); else if ((i.updated || 0) > (l.updated || 0)) Object.assign(l, i); });
    saveInvoices();
    (d.customers || []).forEach(c => { const l = customers.find(x => x.id === c.id); if (!l) { customers.push(c); addC++; } else if ((c.updated || 0) > (l.updated || 0)) Object.assign(l, c); });
    (d.records || []).forEach(r => { const l = records.find(x => x.id === r.id); if (!l) { records.push(r); addR++; } else if ((r.updated || 0) > (l.updated || 0)) Object.assign(l, r); });
    Object.entries(d.settings || {}).forEach(([k, v]) => { if (k !== 'syncToken' && v && !settings[k]) settings[k] = v; });
    saveCustomers(); saveRecords(); saveSettings(); render();
    toast(`Restored ${addC} customer${addC === 1 ? '' : 's'} and ${addR} record${addR === 1 ? '' : 's'}` + (settings.accNo ? '' : '. Bank details are not kept in backups, so add them again in Settings'));
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
setTimeout(() => { fbFlush(); }, 6000);
