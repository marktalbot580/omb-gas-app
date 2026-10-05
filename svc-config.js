/* Gas boiler service record – form definition, validation and helpers.
   Questions follow the ServiceM8 "Gas Boiler Service Record" form. Shared by app.js and pdf-svc.js. */
'use strict';
/* Gas tightness test helpers – shared by the gas safety record, the service record and the PDFs. */
const tgNum = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
/* duration is stored as "m:ss" (older records may hold decimal minutes); returns total seconds or null */
function tgSecs(v) {
  const t = String(v ?? '').trim().replace(',', '.'); if (!t) return null;
  const m = t.match(/^(\d*):(\d*(?:\.\d+)?)$/); if (m) return (+m[1] || 0) * 60 + (+m[2] || 0);
  const n = parseFloat(t); return Number.isFinite(n) ? Math.round(n * 60) : null;
}
function tgDur(secs) {
  const s = Math.round(secs), m = Math.floor(s / 60), r = s % 60;
  return (m ? m + ' min' : '') + (m && r ? ' ' : '') + (r || !m ? r + ' s' : '');
}
/* fan pressure is always a negative reading: 4.62, -4.62 and −4.62 all become -4.62 */
function fanFmt(v) {
  const s = String(v ?? '').trim().replace(/^[-−–]/, '').replace(',', '.');
  return tgNum(s) === null ? String(v ?? '').trim() : (tgNum(s) === 0 ? '0' : '-' + s);
}
function tightText(start, end, dur) {
  const a = tgNum(start), b = tgNum(end);
  if (a === null && b === null) return '';
  const f = n => String(Math.round(n * 100) / 100);
  let t = 'Start ' + (a === null ? '?' : f(a)) + ' mbar, end ' + (b === null ? '?' : f(b)) + ' mbar';
  if (a !== null && b !== null) { const d = a - b; t += d === 0 ? ' (no drop)' : d > 0 ? ' (drop ' + f(d) + ' mbar)' : ' (rise ' + f(-d) + ' mbar)'; }
  const secs = tgSecs(dur); if (secs) t += ' over ' + tgDur(secs);
  return t;
}
const SVC = (() => {
  const STEPS = ['Customer', 'Boiler', 'Appliance checks', 'Safety checks', 'Operating checks', 'Finish', 'Sign off', 'Review'];
  const LOCATION = ['Kitchen', 'Bathroom', 'Airing cupboard', 'Utility', 'Bedroom', 'Garage', 'Loft', 'Compartment', 'Other'];
  const MAKE = ['Ideal', 'Worcester Bosch', 'Baxi', 'Ferroli', 'Vokera', 'Vaillant', 'Alpha', 'Viessmann', 'Biasi', 'Glow Worm', 'Other'];
  const SYSTEM = ['Combi', 'System', 'Heat only', 'Other'];
  const FLUE = ['Open Flue', 'Room Sealed FF (fanned flue)', 'Room Sealed BF (balanced flue)', 'Flueless', 'Vertex'];
  const REASON = ['Service', 'Repair'];
  const PFN = ['PASS', 'FAIL', 'NA'];
  const PF = ['PASS', 'FAIL'];
  const YN = ['YES', 'NO'];
  const YNNA = ['YES', 'NO', 'N/A'];
  const TIGHT = ['YES', 'NO', 'No access to meter', 'No access to communal bank of meters', 'N/A'];

  /* k = key, label = short name (PDF), q = question, f = prompt for the fault details */
  const APP = [
    { k: 'burner', label: 'Burner / injectors', q: 'Condition of burners / injectors?', f: 'Details of the burner / injector fault' },
    { k: 'heatEx', label: 'Heat exchanger', q: 'Condition of the heat exchanger?', f: 'Details of the heat exchanger fault' },
    { k: 'ignition', label: 'Ignition', q: 'Do the ignition components operate correctly?', f: 'Details of the ignition fault' },
    { k: 'electrics', label: 'Electrics', q: 'Condition of appliance electrics?', f: 'Details of the electrical fault' },
    { k: 'controls', label: 'Controls', q: 'Do the appliance controls operate correctly?', f: 'Details of the faulty controls' },
    { k: 'pipework', label: 'Pipework', q: 'Does all pipework meet regulations?', f: 'Details of the pipework faults' },
    { k: 'condensate', label: 'Condensate pipework', q: 'Does the condensate pipework terminate correctly? Is the condensate trap clean and sealed correctly?', f: 'Details of the condensate pipework fault' },
    { k: 'fan', label: 'Fan', q: 'Does the fan / air pressure switch operate correctly?', f: 'Details of the fan / air pressure switch fault' },
    { k: 'location', label: 'Location', q: 'Is the appliance’s location acceptable?', f: 'Details of the location fault' },
    { k: 'stability', label: 'Stability', q: 'Is the appliance stable and fixed correctly?', f: 'Details of the fixing / stability fault' }
  ];
  const SAFE = [
    { k: 'vent', label: 'Ventilation', q: 'Is the ventilation correct for the appliance?', f: 'Details of the ventilation fault' },
    { k: 'flueTerm', label: 'Flue termination', q: 'Is the flue terminal / termination correct?', f: 'Details of the flue termination fault' },
    { k: 'safety', label: 'Safety devices', q: 'Are the safety devices operating correctly?', f: 'Details of the fault with the safety devices', opts: PF }
  ];

  const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const setP = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); const t = ks.reduce((a, k) => a[k], o); t[last] = v; };
  const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

  function blank() {
    const keys = [...APP, ...SAFE].map(c => c.k);
    return {
      location: '', locationOther: '', make: '', makeOther: '', model: '', systemType: '', systemOther: '', serial: '', gc: '', flue: '', reason: '', age: '',
      chk: Object.fromEntries(keys.map(k => [k, ''])), fault: Object.fromEntries(keys.map(k => [k, ''])),
      tightDone: '', tightResult: '', tightStart: '', tightEnd: '', tightMins: '',
      bpTaken: '', bpResult: '', bpValue: '', grTaken: '', grResult: '', grValue: '',
      fgDone: '', fgResult: '', fgRatioMin: '', fgCoMin: '', fgCo2Min: '', fgRatioMax: '', fgCoMax: '', fgCo2Max: '',
      filterPresent: '', filterCleaned: '', manufacturer: '', safe: '', warning: ''
    };
  }

  const makeText = r => (r.make === 'Other' ? r.makeOther : r.make);
  const locText = r => (r.location === 'Other' ? r.locationOther : r.location);
  const sysText = r => (r.systemType === 'Other' ? r.systemOther : r.systemType);
  const failCount = r => [...APP, ...SAFE].filter(c => r.chk[c.k] === 'FAIL').length + (r.tightResult === 'FAIL' ? 1 : 0)
    + (r.bpResult === 'FAIL' ? 1 : 0) + (r.grResult === 'FAIL' ? 1 : 0) + (r.fgResult === 'FAIL' ? 1 : 0);

  function validate(rec) {
    const out = [];
    const need = (step, path, label) => { if (!String(getP(rec, path) ?? '').trim()) out.push({ step, path, label }); };
    need(0, 'customer.name', 'Customer name'); need(0, 'jobAddress', 'Job address');
    need(1, 'location', 'Appliance location'); if (rec.location === 'Other') need(1, 'locationOther', 'Appliance location (other)');
    need(1, 'make', 'Appliance make'); if (rec.make === 'Other') need(1, 'makeOther', 'Appliance make (other)');
    need(1, 'model', 'Appliance model'); need(1, 'systemType', 'System type'); if (rec.systemType === 'Other') need(1, 'systemOther', 'System type (other)');
    need(1, 'serial', 'Serial number'); need(1, 'flue', 'Flue type'); need(1, 'reason', 'Reason for visit'); need(1, 'age', 'Age of boiler');
    APP.forEach(c => { need(2, 'chk.' + c.k, c.label); if (rec.chk[c.k] === 'FAIL') need(2, 'fault.' + c.k, c.label + ' – fault details'); });
    SAFE.forEach(c => { need(3, 'chk.' + c.k, c.label); if (rec.chk[c.k] === 'FAIL') need(3, 'fault.' + c.k, c.label + ' – fault details'); });
    need(5, 'tightDone', 'Tightness test'); if (rec.tightDone === 'YES') { need(5, 'tightResult', 'Tightness test result'); need(5, 'tightStart', 'Tightness test start pressure'); need(5, 'tightEnd', 'Tightness test end pressure'); }
    need(4, 'bpTaken', 'Operating pressure taken?');
    if (rec.bpTaken === 'YES') { need(4, 'bpResult', 'Operating pressure result'); need(4, 'bpValue', 'Operating pressure (mbar)'); }
    if (/worcester/i.test(makeText(rec))) { if (rec.fpTaken === 'YES') { need(4, 'fpValue', 'Fan pressure (mbar)'); need(4, 'fpResult', 'Fan pressure result'); } }
    if (rec.grTaken === 'YES') { need(4, 'grResult', 'Gas rate result'); need(4, 'grValue', 'Gas rate (kW)'); }
    need(4, 'fgDone', 'Flue gas analysis performed?'); if (rec.fgDone === 'YES') need(4, 'fgResult', 'Flue gas analysis outcome');
    need(2, 'filterPresent', 'System filter present?'); if (rec.filterPresent === 'YES') need(2, 'filterCleaned', 'System filter cleaned?');
    need(5, 'manufacturer', 'Meets manufacturer’s instructions?'); need(5, 'safe', 'Safe to use?'); need(5, 'warning', 'Warning notice issued?');
    need(5, 'renewal', 'Next service due date');
    need(6, 'customerPresent', 'Customer present?'); need(6, 'engineerSig', "Engineer's signature");
    if (rec.customerPresent === 'Yes') { need(6, 'customerName', 'Client name (signing)'); need(6, 'customerSig', 'Client signature'); }
    return out;
  }

  function warnings(rec, s) {
    const w = [];
    if (!s.address || !s.phone || !s.gasSafeReg || !s.engineerName || !s.gasSafeId) w.push('Business and engineer details are missing in Settings – they will be blank on the PDF.');
    if (!rec.customer.email) w.push('No customer email – you can still share the PDF from your phone.');
    if (rec.safe === 'NO' && rec.warning === 'NO') w.push('The appliance is marked NOT safe to use but no warning notice has been issued.');
    if (rec.safe === 'YES' && failCount(rec)) w.push('A check has failed but the appliance is marked safe to use – check this is right.');
    return w;
  }

  /* When a gas safety record and a service are done together, copy across everything the gas check has already
     recorded for the boiler. A field is only filled if it is empty or still holds the value copied earlier,
     so anything typed on the service form is never overwritten. Returns true if anything changed. */
  function prefill(s, g) {
    const n = Math.max(1, Math.min(4, +g.applianceCount || 1));
    const a = (g.appliances || []).slice(0, n).find(x => /boiler/i.test(x.type || ''));
    if (!a) return false;
    const up = v => (v === 'Pass' ? 'PASS' : v === 'Fail' ? 'FAIL' : v === 'NA' ? 'NA' : '');
    const m = [];
    const add = (path, val) => { if (val !== undefined && val !== null && String(val).trim() !== '') m.push([path, val]); };
    add('location', a.location); if (a.location === 'Other') add('locationOther', a.locationOther);
    if (a.manufacturer && a.manufacturer.trim()) {
      const hit = MAKE.find(x => x !== 'Other' && x.toLowerCase() === a.manufacturer.trim().toLowerCase());
      if (hit) add('make', hit); else { add('make', 'Other'); add('makeOther', a.manufacturer.trim()); }
    }
    add('model', a.model); add('gc', a.gc); add('flue', a.flue);
    add('chk.vent', up(a.vent)); add('chk.flueTerm', up(a.terminal)); add('chk.safety', up(a.safety) === 'NA' ? '' : up(a.safety));
    const t = g.tightness;
    if (t === 'PASS' || t === 'FAIL') { add('tightDone', 'YES'); add('tightResult', t); add('tightStart', g.tightStart); add('tightEnd', g.tightEnd); add('tightMins', g.tightMins); }
    else if (t === 'NA') add('tightDone', 'N/A');
    else if (t) add('tightDone', t);
    if (/worcester/i.test(a.manufacturer || '') && a.fanPress) { add('fpTaken', 'YES'); add('fpValue', a.fanPress); }
    if (a.test === 'Gas Rate') add('bpTaken', 'N/A'); else if (a.op) { add('bpTaken', 'YES'); add('bpValue', a.op); }
    if (a.test === 'Operating Pressure') add('grTaken', 'N/A'); else if (a.hi) { add('grTaken', 'YES'); add('grValue', a.hi); }
    const reads = [['fgRatioMin', a.ratioMin], ['fgCoMin', a.coMin], ['fgCo2Min', a.co2Min], ['fgRatioMax', a.ratioMax], ['fgCoMax', a.coMax], ['fgCo2Max', a.co2Max]];
    if (reads.some(([, v]) => v)) { add('fgDone', 'YES'); reads.forEach(([k, v]) => add(k, v)); }
    add('safe', a.safe === 'Yes' ? 'YES' : a.safe === 'No' ? 'NO' : '');
    s._auto = s._auto || {};
    let changed = false;
    m.forEach(([path, val]) => {
      const cur = getP(s, path);
      if (!cur || cur === s._auto[path]) { if (cur !== val) { setP(s, path, val); changed = true; } s._auto[path] = val; }
    });
    return changed;
  }

  return { STEPS, LOCATION, MAKE, SYSTEM, FLUE, REASON, PFN, PF, YN, YNNA, TIGHT, APP, SAFE, num, blank, makeText, locText, sysText, failCount, validate, warnings, prefill };
})();
