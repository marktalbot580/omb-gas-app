/* Danger / Do Not Use Warning Notice – form definition, validation and helpers.
   Follows the ServiceM8 "Danger Do Not Use Warning Notice" form. Shared by app.js and pdf-warn.js.
   The notice is needed whenever a boiler service has a failed check, is not safe to use, or a warning notice was issued. */
'use strict';
const WARN = (() => {
  const STEPS = ['Customer', 'Faults', 'Sign off', 'Review'];
  const TYPES = ['Boiler', 'Fire', 'Range Cooker', 'Water Heater', 'Gas Meter', 'Cooker', 'Hob', 'Oven', 'Gas Pipework', 'Warm Air Unit'];
  const CLS = ['ID', 'AR'];
  const RIDDOR = ['RIDDOR II(1) - Gas Incident', 'RIDDOR II(2) - Dangerous Gas Fitting'];
  const blankFault = () => ({ location: '', locationOther: '', type: '', make: '', model: '', serial: '', gc: '', cls: '', riddor: '', riddorType: '', notes: '' });
  const locText = f => (f.location === 'Other' ? f.locationOther : f.location);
  const blank = () => ({ faultCount: '1', faults: [1, 2, 3, 4].map(blankFault) });

  /* a boiler service needs a warning notice if anything failed, it is not safe to use, or a notice was issued */
  const needed = s => !!s && (SVC.failCount(s) > 0 || s.safe === 'NO' || s.warning === 'YES');

  /* what went wrong on the service, as a list of short sentences */
  function reasons(s) {
    const out = [];
    [...SVC.APP, ...SVC.SAFE].forEach(c => { if (s.chk && s.chk[c.k] === 'FAIL') out.push(c.label + (s.fault && s.fault[c.k] ? ' – ' + s.fault[c.k] : ' failed')); });
    if (s.tightResult === 'FAIL') out.push('Gas tightness test failed');
    if (s.bpResult === 'FAIL') out.push('Operating pressure not acceptable');
    if (s.grResult === 'FAIL') out.push('Gas rate not acceptable');
    if (s.fgResult === 'FAIL') out.push('Flue gas analysis not acceptable');
    if (s.safe === 'NO') out.push('Appliance marked NOT safe to use');
    return out;
  }

  /* copy the boiler details and the failures from the service into the first fault (classification is left for the engineer) */
  function prefill(w, s) {
    const f = w.faults[0];
    f.location = s.location || ''; f.locationOther = s.locationOther || '';
    f.type = 'Boiler'; f.make = SVC.makeText(s) || ''; f.model = s.model || ''; f.serial = s.serial || ''; f.gc = s.gc || '';
    const r = reasons(s);
    f.notes = r.length ? 'Boiler service: ' + r.join('; ') + '.' : '';
    w.faultCount = '1';
  }

  /* ---- gas safety record: anything that failed (alarms are left out – they are recorded as defects) ---- */
  const isGas = r => !!r && (!r.type || r.type === 'gas');
  function gasProblems(g) {
    const out = [], n = Math.max(1, Math.min(4, +g.applianceCount || 1));
    (g.appliances || []).slice(0, n).forEach((a, i) => {
      const p = [];
      if (a.safe === 'No') p.push('not safe to use');
      if (a.vent === 'Fail') p.push('ventilation failed');
      if (a.terminal === 'Fail') p.push('flue / terminal failed');
      if (a.flueOp === 'Fail') p.push('flue operation failed');
      if (a.safety === 'Fail') p.push('safety devices failed');
      if (p.length) out.push({ kind: 'app', i, text: `Appliance ${i + 1} (${a.type || 'appliance'}): ${p.join(', ')}`, a, p });
    });
    const inst = [];
    if (g.installPipe === 'Fail') inst.push('installation pipework failed');
    if (g.supplyPipe === 'Fail') inst.push('supply pipework failed');
    if (g.ecv === 'Fail') inst.push('ECV access failed');
    if (g.bonding === 'Fail') inst.push('equipotential bonding failed');
    if (g.tightness === 'FAIL') inst.push('gas tightness test failed');
    if (inst.length) out.push({ kind: 'inst', text: 'Gas installation: ' + inst.join(', '), p: inst });
    (g.defects || []).slice(0, +g.defectCount || 0).forEach((d, i) => { if (d.cls === 'ID' || d.cls === 'AR') out.push({ kind: 'def', text: `Defect ${i + 1} (${d.cls}): ${d.text || ''}`, d }); });
    return out;
  }
  const neededFor = r => (!r ? false : r.type === 'service' ? needed(r) : isGas(r) ? gasProblems(r).length > 0 : false);
  const reasonsFor = r => (r.type === 'service' ? reasons(r) : gasProblems(r).map(x => x.text));
  /* the red FAIL – DO NOT USE stamp on the record itself */
  const stamp = r => (!r ? false : r.type === 'service' ? r.safe === 'NO' : isGas(r) ? gasProblems(r).length > 0 : false);

  /* one fault per appliance: its location, type, make, model and GC number, every failed check and every ID/AR defect noted on it.
     serialFor(appliance) may supply a serial number remembered from an earlier visit. Defects not tied to an appliance get their own fault. */
  function prefillGas(w, g, serialFor) {
    const drafts = [], n = Math.max(1, Math.min(4, +g.applianceCount || 1));
    const defs = (g.defects || []).slice(0, +g.defectCount || 0).filter(d => d.cls === 'ID' || d.cls === 'AR');
    const mine = i => defs.filter(d => d.app === i);
    const dtext = d => `Defect (${d.cls}): ${d.text || ''}${d.action ? ' (action taken: ' + d.action + ')' : ''}`;
    const fromApp = (a, ds) => {
      const f = blankFault();
      f.location = a.location || ''; f.locationOther = a.locationOther || ''; f.type = /boiler/i.test(a.type || '') ? 'Boiler' : TYPES.includes(a.type) ? a.type : '';
      f.make = a.manufacturer || ''; f.model = a.model || ''; f.gc = a.gc || ''; f.serial = a.serial || (serialFor && serialFor(a)) || '';
      f.cls = ds.some(d => d.cls === 'ID') ? 'ID' : ds.length ? 'AR' : '';
      return f;
    };
    const probs = gasProblems(g), failed = new Set(probs.filter(x => x.kind === 'app').map(x => x.i));
    for (let i = 0; i < n; i++) {
      const a = (g.appliances || [])[i], ds = mine(i), x = probs.find(p => p.kind === 'app' && p.i === i);
      if (!a || (!x && !ds.length)) continue;
      const f = fromApp(a, ds);
      f.notes = (x ? ['Gas safety check: ' + x.p.join(', ') + '.'] : []).concat(ds.map(dtext)).join(' ');
      drafts.push(f);
    }
    probs.filter(x => x.kind === 'inst').forEach(x => {
      const f = blankFault(); f.type = 'Gas Pipework'; f.make = 'n/a'; f.model = 'n/a'; f.serial = 'n/a'; f.gc = 'n/a'; f.notes = 'Gas safety check: ' + x.p.join(', ') + '.';
      drafts.push(f);
    });
    defs.filter(d => !(d.app >= 0 && d.app < n && (g.appliances || [])[d.app])).forEach(d => {
      const f = blankFault(); f.cls = d.cls; f.notes = 'Gas safety check. ' + dtext(d);
      drafts.push(f);
    });
    if (!drafts.length) drafts.push(blankFault());
    if (drafts.length > 4) { const rest = drafts.splice(3); drafts[3] = Object.assign(blankFault(), { notes: rest.map(f => f.notes).join(' ') }); }   // more than 4: the extras go into the last fault's notes
    w.faults = [1, 2, 3, 4].map((_, i) => drafts[i] || blankFault());
    w.faultCount = String(drafts.length);
  }
  const prefillFrom = (w, src, serialFor) => (src.type === 'service' ? prefill(w, src) : prefillGas(w, src, serialFor));

  function validate(rec) {
    const out = [];
    const need = (step, path, label, extra = {}) => { if (!String(getP(rec, path) ?? '').trim()) out.push({ step, path, label, ...extra }); };
    need(0, 'customer.name', 'Customer name'); need(0, 'jobAddress', 'Job address');
    rec.faults.slice(0, +rec.faultCount || 1).forEach((f, i) => {
      const P = k => `faults.${i}.${k}`, n = `Fault ${i + 1}: `;
      need(1, P('location'), n + 'location'); if (f.location === 'Other') need(1, P('locationOther'), n + 'location (other)');
      need(1, P('type'), n + 'appliance type'); need(1, P('make'), n + 'make'); need(1, P('model'), n + 'model'); need(1, P('serial'), n + 'serial number');
      need(1, P('cls'), n + 'ID or AR'); need(1, P('riddor'), n + 'RIDDOR notifiable?');
      if (f.riddor === 'YES') need(1, P('riddorType'), n + 'RIDDOR reporting type');
      need(1, P('notes'), n + 'reasons / notes');
    });
    need(2, 'customerPresent', 'Customer present?'); need(2, 'engineerSig', "Engineer's signature");
    if (rec.customerPresent === 'Yes') { need(2, 'customerName', 'Client name (signing)'); need(2, 'customerSig', 'Client signature'); }
    return out;
  }

  function warnings(rec, s) {
    const w = [];
    if (!s.address || !s.phone || !s.gasSafeReg || !s.engineerName || !s.gasSafeId) w.push('Business and engineer details are missing in Settings – they will be blank on the PDF.');
    if (!rec.customer.email) w.push('No customer email – you can still share the PDF from your phone.');
    return w;
  }

  return { STEPS, TYPES, CLS, RIDDOR, blankFault, locText, blank, needed, reasons, prefill, gasProblems, neededFor, reasonsFor, stamp, prefillFrom, validate, warnings };
})();
