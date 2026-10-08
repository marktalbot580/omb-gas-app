/* Boiler commissioning checklist – form definition, validation and helpers.
   Records what the installer did when a new boiler was fitted and commissioned: the same facts as the industry
   commissioning checklist that manufacturers ask for with the warranty (compliance, Boiler Plus, water quality,
   operating readings, condensate, combustion readings, customer handover).
   Our own layout and wording. Shared by app.js and pdf-comm.js. */
'use strict';
const COM = (() => {
  const STEPS = ['Customer', 'Boiler & system', 'Water quality', 'Readings', 'Checks & handover', 'Sign off', 'Review'];
  const KIND = ['Combination', 'System', 'Regular'];
  const YN = ['Yes', 'No'];
  const PFN = ['Pre-existing', 'Fitted', 'Not required'];
  const UNIT = ['m³/hr', 'ft³/hr'];
  const TERM = ['Internal', 'External'];
  const DISP = ['Gravity', 'Pumped'];
  const FLUE = ['Yes', 'Not possible'];
  /* tick all that apply (stored as 'Yes' or '') */
  const PLUS = [
    ['bpWeather', 'Weather compensation'], ['bpLoad', 'Load compensation'],
    ['bpSmart', 'Smart thermostat with automation and optimisation'], ['bpFlueHr', 'Flue gas heat recovery'],
    ['bpCyl', 'Cylinder thermostat and programmer / timer'], ['bpHw', 'Combination boiler: time and temperature control to hot water (England)']
  ];
  const PARTS = [['zone', 'Zone valves'], ['trv', 'Thermostatic radiator valves'], ['bypass', 'Automatic bypass to system'], ['ufh', 'Underfloor heating']];

  const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

  function blank() {
    return {
      make: '', makeOther: '', model: '', serial: '', gc: '', kind: '',
      regsOk: '', regsNo: '', interlock: '',
      bpWeather: '', bpLoad: '', bpSmart: '', bpFlueHr: '', bpCyl: '', bpHw: '',
      zone: '', trv: '', bypass: '', ufh: '',
      flushed: '', cleanerBrand: '', cleanerProduct: '', inhibBrand: '', inhibProduct: '', filter: '',
      chRate: '', chUnit: 'm³/hr', chFactory: '', chMax: '', chPress: '', chFlow: '', chReturn: '', balanced: '',
      hardWater: '', scale: '', scaleType: '', waterMeter: '', dhwVessel: '', prv: '',
      dhwRate: '', dhwUnit: 'm³/hr', dhwPress: '', coldTemp: '', outletsOk: '', hotTemp: '',
      condOk: '', condTerm: '', condMethod: '',
      maxCo: '', maxCo2: '', minCo: '', minCo2: '', flueCheck: '',
      demoDone: '', litLeft: '', regAdvised: ''
    };
  }

  const makeText = r => (r.make === 'Other' ? r.makeOther : r.make);
  const isCombi = r => r.kind === 'Combination';
  /* CO/CO2 ratio: CO in ppm over CO2 as a fraction (1% = 10,000 ppm) */
  const ratio = (co, co2) => { const c = num(co), d = num(co2); return c !== null && d !== null && d > 0 ? c / (d * 10000) : null; };
  const ratioText = (co, co2) => { const x = ratio(co, co2); return x === null ? '' : x.toFixed(4); };

  function validate(rec) {
    const out = [];
    const need = (step, path, label) => { if (!String(getP(rec, path) ?? '').trim()) out.push({ step, path, label }); };
    const numeric = (step, path, label) => {
      const v = String(getP(rec, path) ?? '').trim();
      if (!v) out.push({ step, path, label }); else if (num(v) === null) out.push({ step, path, label: label + ' (enter a number)' });
    };
    need(0, 'customer.name', 'Customer name'); need(0, 'jobAddress', 'Job address');
    need(1, 'make', 'Boiler make'); if (rec.make === 'Other') need(1, 'makeOther', 'Boiler make (other)');
    need(1, 'model', 'Boiler model'); need(1, 'serial', 'Boiler serial number'); need(1, 'kind', 'Boiler type');
    need(1, 'regsOk', 'Complies with Building Regulations'); need(1, 'interlock', 'Time, temperature control and boiler interlock');
    PARTS.forEach(([k, l]) => need(1, k, l));
    need(2, 'flushed', 'System flushed, cleaned and inhibited');
    if (rec.flushed === 'Yes') { need(2, 'cleanerBrand', 'System cleaner brand'); need(2, 'cleanerProduct', 'System cleaner product'); need(2, 'inhibBrand', 'Inhibitor brand'); need(2, 'inhibProduct', 'Inhibitor product'); }
    need(2, 'filter', 'Primary water system filter');
    numeric(3, 'chRate', isCombi(rec) ? 'Gas rate (m³/hr or ft³/hr)' : 'Gas rate, central heating'); need(3, 'chFactory', 'Central heating output left at factory settings');
    if (rec.chFactory === 'No') numeric(3, 'chMax', 'Maximum central heating output selected (kW)');
    numeric(3, 'chPress', 'Dynamic gas inlet pressure (mbar)'); numeric(3, 'chFlow', 'Central heating flow temperature'); numeric(3, 'chReturn', 'Central heating return temperature');
    need(3, 'balanced', 'System balanced');
    if (isCombi(rec)) {
      numeric(3, 'dhwRate', 'Gas rate, hot water mode'); numeric(3, 'dhwPress', 'Gas inlet pressure at maximum rate (mbar)');
      numeric(3, 'coldTemp', 'Cold water inlet temperature'); need(3, 'outletsOk', 'Hot water checked at all outlets'); numeric(3, 'hotTemp', 'Hot water temperature');
    }
    numeric(3, 'maxCo', 'CO at maximum rate (ppm)'); numeric(3, 'maxCo2', 'CO₂ at maximum rate (%)'); need(3, 'flueCheck', 'Flue integrity check');
    if (isCombi(rec)) {
      need(4, 'hardWater', 'Hard water area'); need(4, 'scale', 'Water scale reducer / softener'); need(4, 'waterMeter', 'Water meter fitted');
      need(4, 'dhwVessel', 'Hot water expansion vessel'); need(4, 'prv', 'Pressure reducing valve');
    }
    need(4, 'condOk', 'Condensate drain installed correctly'); need(4, 'condTerm', 'Condensate point of termination'); need(4, 'condMethod', 'Condensate method of disposal');
    need(4, 'demoDone', 'Controls demonstrated to the customer'); need(4, 'litLeft', 'Literature explained and left'); need(4, 'regAdvised', 'Customer told to register the boiler');
    need(5, 'customerPresent', 'Customer present?'); need(5, 'engineerSig', "Engineer's signature");
    if (rec.customerPresent === 'Yes') { need(5, 'customerName', 'Client name (signing)'); need(5, 'customerSig', 'Client signature'); }
    return out;
  }

  function warnings(rec, s) {
    const w = [];
    if (!s.address || !s.phone || !s.engineerName) w.push('Business and engineer details are missing in Settings – they will be blank on the PDF.');
    if (!s.gasSafeReg) w.push('Your Gas Safe registration number is not set in Settings – it will be blank on the PDF.');
    if (!rec.customer.email) w.push('No customer email – you can still share the PDF from your phone.');
    [['maximum', rec.maxCo, rec.maxCo2], ['minimum', rec.minCo, rec.minCo2]].forEach(([n, co, co2]) => {
      const x = ratio(co, co2); if (x !== null && x > 0.004) w.push('The CO/CO₂ ratio at ' + n + ' rate is ' + x.toFixed(4) + ', above 0.004. Check it against the manufacturer\'s limit before you leave.');
    });
    return w;
  }

  return { STEPS, KIND, YN, PFN, UNIT, TERM, DISP, FLUE, PLUS, PARTS, num, blank, makeText, isCombi, ratio, ratioText, validate, warnings };
})();
