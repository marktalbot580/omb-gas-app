/* Oil boiler service / commissioning record and oil tank check – form definitions, validation and helpers.
   The checks follow the usual oil heating service and commissioning headings (appliance, oil supply, flue, combustion
   readings, safety). They are the app's own records: they do not replace anything issued through OFTEC.
   Shared by app.js and pdf-oil.js. */
'use strict';
const OIL = (() => {
  const STEPS = ['Customer', 'Boiler', 'Checks', 'Combustion', 'Finish', 'Sign off', 'Review'];
  const LOCATION = ['Kitchen', 'Utility room', 'Integral garage', 'Detached garage', 'Boiler house', 'Outbuilding', 'Outside (external boiler)', 'Cellar / basement', 'Other'];
  const MAKE = ['Grant', 'Firebird', 'Worcester Bosch', 'Warmflow', 'Boulter Buderus', 'Trianco', 'Viessmann', 'Other'];
  const TYPE = ['Combi', 'System', 'Regular (heat only)', 'Other'];
  const FUEL = ['Kerosene (28 sec)', 'Gas oil (35 sec)', 'HVO', 'Other'];
  const FLUE = ['Conventional flue (chimney / liner)', 'Balanced flue (through the wall)', 'Vertical flue (external boiler)', 'Other'];
  const REASON = ['Service', 'Commissioning', 'Repair'];
  const PFN = ['PASS', 'FAIL', 'NA'];
  const YN = ['YES', 'NO'];
  const YNNA = ['YES', 'NO', 'N/A'];
  const CLASS = ['None', 'Advisory', 'At risk', 'Immediately dangerous'];

  /* k = key, label = short name (PDF), q = question, f = prompt for the fault details */
  const APP = [
    { k: 'burner', label: 'Burner / combustion head', q: 'Condition of the burner and combustion head?', f: 'Details of the burner fault' },
    { k: 'nozzle', label: 'Nozzle', q: 'Nozzle changed or in good condition?', f: 'Details of the nozzle fault' },
    { k: 'electrodes', label: 'Electrodes / ignition', q: 'Ignition electrodes, leads and transformer in good order?', f: 'Details of the ignition fault' },
    { k: 'pump', label: 'Oil pump and hoses', q: 'Oil pump, filter and flexible hoses in good order?', f: 'Details of the pump or hose fault' },
    { k: 'heatEx', label: 'Heat exchanger / flueways', q: 'Heat exchanger and flueways cleaned and in good condition?', f: 'Details of the heat exchanger fault' },
    { k: 'controls', label: 'Controls', q: 'Do the controls, overheat thermostat and lockout operate correctly?', f: 'Details of the controls fault' },
    { k: 'electrics', label: 'Electrics', q: 'Electrical supply and connections in good order?', f: 'Details of the electrical fault' },
    { k: 'condensate', label: 'Condensate', q: 'Condensate pipework and trap clear and terminating correctly (condensing boilers)?', f: 'Details of the condensate fault' },
    { k: 'location', label: 'Location', q: 'Is the appliance location and clearance acceptable?', f: 'Details of the location fault' },
    { k: 'stability', label: 'Stability', q: 'Is the appliance stable and fixed correctly?', f: 'Details of the fixing fault' }
  ];
  const SAFE = [
    { k: 'flueC', label: 'Flue condition', q: 'Is the flue sound, sealed and free from blockage?', f: 'Details of the flue fault' },
    { k: 'flueTerm', label: 'Flue terminal', q: 'Is the flue terminal correct and clear?', f: 'Details of the flue terminal fault' },
    { k: 'vent', label: 'Ventilation', q: 'Is the ventilation / combustion air supply correct for the appliance?', f: 'Details of the ventilation fault' },
    { k: 'leaks', label: 'Oil leaks', q: 'Free from oil leaks or weeping on the appliance and pipework?', f: 'Details of the oil leak' },
    { k: 'supply', label: 'Oil supply', q: 'Oil supply pipework, isolation valve, filter and fire valve in good order?', f: 'Details of the oil supply fault' },
    { k: 'coAlarm', label: 'CO alarm', q: 'Is a carbon monoxide alarm fitted and working?', f: 'Details of the carbon monoxide alarm fault' }
  ];
  const ALL = [...APP, ...SAFE];

  const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

  function blank() {
    return {
      location: '', locationOther: '', make: '', makeOther: '', model: '', systemType: '', systemOther: '', fuel: '', fuelOther: '', flue: '', flueOther: '',
      serial: '', burner: '', reason: '', stripDown: '', age: '',
      chk: Object.fromEntries(ALL.map(c => [c.k, ''])), fault: Object.fromEntries(ALL.map(c => [c.k, ''])),
      nozzleSize: '', pumpPressure: '', filterChanged: '',
      fgDone: '', fgCo2: '', fgO2: '', fgCo: '', fgTemp: '', fgAmb: '', fgEff: '', fgSmoke: '', fgDraught: '', fgResult: '', analyser: '',
      manufacturer: '', safe: '', defectClass: '', defects: ''
    };
  }

  const makeText = r => (r.make === 'Other' ? r.makeOther : r.make);
  const locText = r => (r.location === 'Other' ? r.locationOther : r.location);
  const sysText = r => (r.systemType === 'Other' ? r.systemOther : r.systemType);
  const fuelText = r => (r.fuel === 'Other' ? r.fuelOther : r.fuel);
  const flueText = r => (r.flue === 'Other' ? r.flueOther : r.flue);
  const failCount = r => ALL.filter(c => r.chk && r.chk[c.k] === 'FAIL').length + (r.fgResult === 'FAIL' ? 1 : 0);
  /* the red NOT SAFE stamp: marked not safe, or classed immediately dangerous */
  const stamp = r => !!r && (r.safe === 'NO' || r.defectClass === 'Immediately dangerous');

  function validate(rec) {
    const out = [];
    const need = (step, path, label) => { if (!String(getP(rec, path) ?? '').trim()) out.push({ step, path, label }); };
    const numeric = (step, path, label) => {
      const v = String(getP(rec, path) ?? '').trim();
      if (!v) out.push({ step, path, label }); else if (num(v) === null) out.push({ step, path, label: label + ' (enter a number)' });
    };
    need(0, 'customer.name', 'Customer name'); need(0, 'jobAddress', 'Job address');
    need(1, 'location', 'Appliance location'); if (rec.location === 'Other') need(1, 'locationOther', 'Appliance location (other)');
    need(1, 'make', 'Appliance make'); if (rec.make === 'Other') need(1, 'makeOther', 'Appliance make (other)');
    need(1, 'model', 'Appliance model'); need(1, 'systemType', 'System type'); if (rec.systemType === 'Other') need(1, 'systemOther', 'System type (other)');
    need(1, 'serial', 'Serial number');
    need(1, 'fuel', 'Fuel type'); if (rec.fuel === 'Other') need(1, 'fuelOther', 'Fuel type (other)');
    need(1, 'flue', 'Flue type'); if (rec.flue === 'Other') need(1, 'flueOther', 'Flue type (other)');
    need(1, 'reason', 'Reason for visit'); need(1, 'stripDown', 'Full strip down service (Yes or No)');
    ALL.forEach(c => { need(2, 'chk.' + c.k, c.label); if (rec.chk[c.k] === 'FAIL') need(2, 'fault.' + c.k, c.label + ' – fault details'); });
    need(3, 'nozzleSize', 'Nozzle size'); numeric(3, 'pumpPressure', 'Pump pressure (bar)'); need(3, 'filterChanged', 'Oil filter cleaned or replaced?');
    need(3, 'fgDone', 'Flue gas analysis performed?');
    if (rec.fgDone === 'YES') {
      numeric(3, 'fgCo2', 'CO₂ (%)'); numeric(3, 'fgCo', 'CO (ppm)'); numeric(3, 'fgTemp', 'Flue gas temperature (°C)'); numeric(3, 'fgSmoke', 'Smoke number');
      need(3, 'fgResult', 'Flue gas analysis outcome');
    }
    need(4, 'manufacturer', 'Meets manufacturer’s instructions?'); need(4, 'safe', 'Safe to use?'); need(4, 'defectClass', 'Defect classification');
    if (rec.defectClass && rec.defectClass !== 'None') need(4, 'defects', 'Defects found and advice given');
    need(4, 'renewal', 'Next service due date');
    need(5, 'customerPresent', 'Customer present?'); need(5, 'engineerSig', "Engineer's signature");
    if (rec.customerPresent === 'Yes') { need(5, 'customerName', 'Client name (signing)'); need(5, 'customerSig', 'Client signature'); }
    return out;
  }

  function warnings(rec, s) {
    const w = [];
    if (!s.address || !s.phone || !s.engineerName) w.push('Business and engineer details are missing in Settings – they will be blank on the PDF.');
    if (!s.oftecReg) w.push('Your OFTEC registration number is not set in Settings – it will be blank on the PDF.');
    if (!rec.customer.email) w.push('No customer email – you can still share the PDF from your phone.');
    if (rec.safe === 'NO' && (!rec.defectClass || rec.defectClass === 'None')) w.push('The appliance is marked NOT safe to use but no defect is classified.');
    if (rec.safe === 'YES' && rec.defectClass === 'Immediately dangerous') w.push('A defect is classed immediately dangerous but the appliance is marked safe to use – check this is right.');
    if (rec.safe === 'YES' && failCount(rec)) w.push('A check has failed but the appliance is marked safe to use – check this is right.');
    return w;
  }

  return { STEPS, LOCATION, MAKE, TYPE, FUEL, FLUE, REASON, PFN, YN, YNNA, CLASS, APP, SAFE, ALL, num, blank, makeText, locText, sysText, fuelText, flueText, failCount, stamp, validate, warnings };
})();

const TANK = (() => {
  const STEPS = ['Customer', 'Tank', 'Checks', 'Finish', 'Sign off', 'Review'];
  const POSITION = ['Outside, on the ground', 'Outbuilding or garage', 'Inside the house', 'Other'];
  const MATERIAL = ['Plastic', 'Steel', 'Other'];
  const PFN = ['PASS', 'FAIL', 'NA'];
  const YN = ['YES', 'NO'];
  const YNNA = ['YES', 'NO', 'N/A'];
  const WATER = ['No water found', 'Water found', 'Not tested'];
  const RISK = ['Low', 'Medium', 'High'];
  const CLASS = ['None', 'Advisory', 'At risk', 'Immediately dangerous'];

  const CHK = [
    { k: 'tankCond', label: 'Tank condition', q: 'Tank walls free from cracks, bulges, splits, corrosion and UV damage?', f: 'Details of the tank condition fault' },
    { k: 'base', label: 'Base and supports', q: 'Base level, solid and non-combustible, with the tank fully supported?', f: 'Details of the base fault' },
    { k: 'bund', label: 'Bund', q: 'Bund sound and free from oil and rain water?', f: 'Details of the bund fault' },
    { k: 'gauge', label: 'Gauge', q: 'Contents gauge or sight gauge working and not leaking?', f: 'Details of the gauge fault' },
    { k: 'ventPipe', label: 'Vent pipe', q: 'Tank vent pipe clear?', f: 'Details of the vent pipe fault' },
    { k: 'fill', label: 'Fill point', q: 'Fill point and cap secure, with overfill protection fitted?', f: 'Details of the fill point fault' },
    { k: 'isolate', label: 'Isolation valve and filter', q: 'Isolation valve and filter at the tank working and clean?', f: 'Details of the valve or filter fault' },
    { k: 'fireValve', label: 'Fire valve', q: 'Fire valve and sensor fitted correctly and operating?', f: 'Details of the fire valve fault' },
    { k: 'pipes', label: 'Oil pipework', q: 'Oil supply pipework supported, protected and free from leaks?', f: 'Details of the pipework fault' },
    { k: 'spills', label: 'Leaks and staining', q: 'Free from oil leaks, drips or staining around the tank and pipework?', f: 'Details of the leak' }
  ];

  const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

  function blank() {
    return {
      position: '', positionOther: '', material: '', materialOther: '', bunded: '', capacity: '', tankMake: '', tankAge: '', fuel: '',
      distBuilding: '', distBoundary: '', fireProt: '', nearWater: '',
      chk: Object.fromEntries(CHK.map(c => [c.k, ''])), fault: Object.fromEntries(CHK.map(c => [c.k, ''])),
      waterTest: '', safe: '', risk: '', defectClass: '', defects: ''
    };
  }

  const posText = r => (r.position === 'Other' ? r.positionOther : r.position);
  const matText = r => (r.material === 'Other' ? r.materialOther : r.material);
  const failCount = r => CHK.filter(c => r.chk && r.chk[c.k] === 'FAIL').length + (r.waterTest === 'Water found' ? 1 : 0);
  const stamp = r => !!r && (r.safe === 'NO' || r.defectClass === 'Immediately dangerous');

  function validate(rec) {
    const out = [];
    const need = (step, path, label) => { if (!String(getP(rec, path) ?? '').trim()) out.push({ step, path, label }); };
    const numeric = (step, path, label) => {
      const v = String(getP(rec, path) ?? '').trim();
      if (!v) out.push({ step, path, label }); else if (num(v) === null) out.push({ step, path, label: label + ' (enter a number)' });
    };
    need(0, 'customer.name', 'Customer name'); need(0, 'jobAddress', 'Job address');
    need(1, 'position', 'Where the tank is'); if (rec.position === 'Other') need(1, 'positionOther', 'Where the tank is (other)');
    need(1, 'material', 'Tank material'); if (rec.material === 'Other') need(1, 'materialOther', 'Tank material (other)');
    need(1, 'bunded', 'Bunded?'); numeric(1, 'capacity', 'Capacity (litres)'); need(1, 'fuel', 'Fuel stored');
    numeric(1, 'distBuilding', 'Distance from the building (m)'); numeric(1, 'distBoundary', 'Distance from the boundary (m)');
    need(1, 'fireProt', 'Fire protection in place?'); need(1, 'nearWater', 'Near water, a drain, well or borehole?');
    CHK.forEach(c => { need(2, 'chk.' + c.k, c.label); if (rec.chk[c.k] === 'FAIL') need(2, 'fault.' + c.k, c.label + ' – fault details'); });
    need(2, 'waterTest', 'Water in fuel test');
    need(3, 'safe', 'Safe to use?'); need(3, 'risk', 'Pollution risk'); need(3, 'defectClass', 'Defect classification');
    if (rec.defectClass && rec.defectClass !== 'None') need(3, 'defects', 'Defects found and advice given');
    need(3, 'renewal', 'Next check due date');
    need(4, 'customerPresent', 'Customer present?'); need(4, 'engineerSig', "Engineer's signature");
    if (rec.customerPresent === 'Yes') { need(4, 'customerName', 'Client name (signing)'); need(4, 'customerSig', 'Client signature'); }
    return out;
  }

  function warnings(rec, s) {
    const w = [];
    if (!s.address || !s.phone || !s.engineerName) w.push('Business and engineer details are missing in Settings – they will be blank on the PDF.');
    if (!s.oftecReg) w.push('Your OFTEC registration number is not set in Settings – it will be blank on the PDF.');
    if (!rec.customer.email) w.push('No customer email – you can still share the PDF from your phone.');
    if (rec.safe === 'NO' && (!rec.defectClass || rec.defectClass === 'None')) w.push('The tank is marked NOT safe to use but no defect is classified.');
    if (rec.safe === 'YES' && failCount(rec)) w.push('A check has failed but the tank is marked safe to use – check this is right.');
    if (rec.nearWater === 'YES' && rec.risk === 'Low') w.push('The tank is near water, a drain, well or borehole but the pollution risk is set to Low – check this is right.');
    return w;
  }

  return { STEPS, POSITION, MATERIAL, PFN, YN, YNNA, WATER, RISK, CLASS, CHK, num, blank, posText, matText, failCount, stamp, validate, warnings };
})();
