/* Air conditioning commissioning report – form definition, validation and helpers.
   Follows the standard "Air Conditioning Commissioning Report" layout: system information, refrigerant, notes and sign-off.
   Shared by app.js and pdf-ac.js. */
'use strict';
const AC = (() => {
  const STEPS = ['Customer', 'System', 'Refrigerant & checks', 'Sign off', 'Review'];
  const MAKE = ['Mitsubishi Electric', 'Daikin', 'Samsung', 'LG', 'Panasonic', 'Fujitsu', 'Toshiba', 'Hitachi', 'Midea', 'Other'];
  const IN_LOC = ['Living room', 'Bedroom', 'Kitchen', 'Office', 'Hallway', 'Other'];
  const OUT_LOC = ['Rear wall', 'Side wall', 'Front wall', 'Roof', 'Ground', 'Other'];
  const GAS = ['R32', 'R410A', 'R407C', 'R290', 'Other'];
  const PFN = ['PASS', 'FAIL', 'NA'];

  const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

  function blank() {
    return {
      make: '', makeOther: '',
      indoorModel: '', indoorSerial: '', indoorLoc: '', indoorLocOther: '',
      outdoorModel: '', outdoorSerial: '', outdoorLoc: '', outdoorLocOther: '',
      pressure: '', vacuum: '', charge: '', gasType: '', gasOther: '', pipeLen: '',
      drain: '', tempSet: '', electrical: ''
    };
  }

  const makeText = r => (r.make === 'Other' ? r.makeOther : r.make);
  const inLocText = r => (r.indoorLoc === 'Other' ? r.indoorLocOther : r.indoorLoc);
  const outLocText = r => (r.outdoorLoc === 'Other' ? r.outdoorLocOther : r.outdoorLoc);
  const gasText = r => (r.gasType === 'Other' ? r.gasOther : r.gasType);
  const failCount = r => (r.drain === 'FAIL' ? 1 : 0) + (r.electrical === 'FAIL' ? 1 : 0);

  function validate(rec) {
    const out = [];
    const need = (step, path, label) => { if (!String(getP(rec, path) ?? '').trim()) out.push({ step, path, label }); };
    const numeric = (step, path, label) => {
      const v = String(getP(rec, path) ?? '').trim();
      if (!v) out.push({ step, path, label }); else if (num(v) === null) out.push({ step, path, label: label + ' (enter a number)' });
    };
    need(0, 'customer.name', 'Customer name'); need(0, 'jobAddress', 'Job address');
    need(1, 'make', 'Manufacturer'); if (rec.make === 'Other') need(1, 'makeOther', 'Manufacturer (other)');
    need(1, 'indoorModel', 'Indoor model'); need(1, 'indoorSerial', 'Indoor serial number');
    need(1, 'indoorLoc', 'Indoor location'); if (rec.indoorLoc === 'Other') need(1, 'indoorLocOther', 'Indoor location (other)');
    need(1, 'outdoorModel', 'Outdoor model'); need(1, 'outdoorSerial', 'Outdoor serial number');
    need(1, 'outdoorLoc', 'Outdoor location'); if (rec.outdoorLoc === 'Other') need(1, 'outdoorLocOther', 'Outdoor location (other)');
    numeric(2, 'pressure', 'System pressure tested to (bar)'); numeric(2, 'vacuum', 'System held on vacuum (hours)'); numeric(2, 'charge', 'Gas charge added (g)');
    need(2, 'gasType', 'Type of gas'); if (rec.gasType === 'Other') need(2, 'gasOther', 'Type of gas (other)');
    numeric(2, 'pipeLen', 'Pipe length (m)');
    need(2, 'drain', 'Drain'); need(2, 'tempSet', 'Temperature settings (air)'); need(2, 'electrical', 'Electrical');
    need(3, 'customerPresent', 'Customer present?'); need(3, 'engineerSig', "Engineer's signature");
    if (rec.customerPresent === 'Yes') { need(3, 'customerName', 'Client name (signing)'); need(3, 'customerSig', 'Client signature'); }
    return out;
  }

  function warnings(rec, s) {
    const w = [];
    if (!s.address || !s.phone || !s.engineerName) w.push('Business and engineer details are missing in Settings – they will be blank on the PDF.');
    if (!rec.customer.email) w.push('No customer email – you can still share the PDF from your phone.');
    if (failCount(rec) && !String(rec.notes || '').trim()) w.push('A check has failed – describe the problem and what has been done about it in the engineer notes.');
    return w;
  }

  return { STEPS, MAKE, IN_LOC, OUT_LOC, GAS, PFN, num, blank, makeText, inLocText, outLocText, gasText, failCount, validate, warnings };
})();
