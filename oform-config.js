/* Oil heating forms built from a plain description: installation completion, landlord check, warning and advice notice,
   tank spillage and fire risk assessment, and condensing boiler assessment.
   The headings and questions follow the usual OFTEC-style oil heating forms. They are this app's own records:
   they carry no OFTEC branding or serial numbers and do not replace anything issued through OFTEC.
   Shared by app.js and pdf-oil.js.
   Field types: txt, num, area, date, pick (options, optional Other box), yn, ynna, pfn (pass / fail / n/a with fault details), info (a note). */
'use strict';
const OFORM = (() => {
  const PFN = ['PASS', 'FAIL', 'NA'], YN = ['YES', 'NO'], YNNA = ['YES', 'NO', 'N/A'];
  const CLASS = ['Immediately dangerous', 'At risk', 'Advisory'];
  const LOC = ['Kitchen', 'Utility room', 'Garage', 'Boiler house', 'Outbuilding', 'Outside (external boiler)', 'Airing cupboard', 'Loft', 'Other'];
  const MAKE = ['Grant', 'Worcester Bosch', 'Firebird', 'Warmflow', 'Viessmann', 'Trianco', 'Other'];
  const TYPE = ['Combi', 'System', 'Regular (heat only)', 'Other'];
  const FUEL = ['Kerosene', 'Gas oil', 'HVO', 'Other'];
  const FLUE = ['Conventional flue (chimney / liner)', 'Balanced flue (room sealed)', 'Fanned / pressure jet flue', 'Other'];
  const POSITION = ['Outside, on the ground', 'Outbuilding or garage', 'Inside the house', 'Other'];
  const MATERIAL = ['Plastic', 'Steel', 'Other'];

  const f = (k, l, t, o) => Object.assign({ k, l, t }, o || {});
  const pick = (k, l, o, x) => f(k, l, 'pick', Object.assign({ o, other: o.includes('Other') }, x || {}));
  const pf = (k, l) => f(k, l, 'pfn');
  const yn = (k, l, x) => f(k, l, 'yn', x);

  const SPECS = {
    oilcomp: {
      name: 'Oil firing installation completion report', short: 'Oil installation', subj: 'Oil Installation Completion Report',
      pdf: 'OIL FIRING INSTALLATION COMPLETION REPORT', sub: 'Record of a new or replacement oil heating installation and its commissioning.',
      prefix: 'OIC', dateLabel: 'Date of installation', price: 'priceOilInst', desc: 'Oil heating installation', renew: true, docNote: 'Your next oil boiler service is due by',
      foot: 'THIS REPORT RECORDS THE INSTALLATION AND COMMISSIONING OF THE OIL HEATING EQUIPMENT DESCRIBED ABOVE.',
      sections: [
        { h: 'Appliance', fields: [
          pick('instType', 'What was installed?', ['New installation', 'Replacement boiler', 'Boiler and tank', 'Other work']),
          pick('make', 'Appliance make', MAKE), f('model', 'Appliance model', 'txt'), pick('systemType', 'System type', TYPE), f('serial', 'Serial number', 'txt', { caps: 1 }),
          f('output', 'Appliance output (kW)', 'num', { u: 'kW' }), pick('fuel', 'Fuel', FUEL), pick('location', 'Where is the appliance located?', LOC),
          f('burner', 'Burner make and model', 'txt', { opt: 1 }), pick('flue', 'Flue type', FLUE)
        ] },
        { h: 'Oil storage and supply', fields: [
          yn('tankFitted', 'Was a tank installed or replaced?'),
          f('tankRisk', 'Tank spillage and fire risk assessment completed? (certificate number if any)', 'txt', { opt: 1 }),
          yn('bunded', 'Is the tank bunded?'),
          pf('isolate', 'Isolation valve and filter at the tank'), pf('fireValve', 'Fire valve and sensor'),
          pf('gauge', 'Sight gauge, vent pipe and overfill protection'), pf('pipework', 'Oil supply pipework: material, supports, sleeving, no joints under floors'),
          pf('leakTest', 'Oil supply tested and free from leaks')
        ] },
        { h: 'Flue, air and safety', fields: [
          pf('flueC', 'Flue sound, correct and sealed'), pf('flueTerm', 'Flue terminal position and clearances'), pf('vent', 'Ventilation / combustion air supply'),
          pf('base', 'Appliance location, clearances, base and hearth'), pf('electrics', 'Electrical supply, isolation and connections'), pf('coAlarm', 'Carbon monoxide alarm fitted and tested')
        ] },
        { h: 'Controls and system', fields: [
          yn('controls', 'Time and temperature controls fitted as the Building Regulations require?'), yn('interlock', 'Boiler interlock provided?'),
          yn('flushed', 'System flushed and a suitable inhibitor added?'), pf('condensate', 'Condensate pipework and disposal (condensing boilers)'),
          pf('expansion', 'System pressure and expansion vessel'), yn('regs', 'Installation complies with the Building Regulations?')
        ] },
        { h: 'Commissioning', fields: [
          f('nozzle', 'Nozzle size and spray angle', 'txt', { caps: 1, ph: 'e.g. 0.60 80°S' }), f('pump', 'Pump pressure (bar)', 'num', { u: 'bar' }),
          f('co2', 'CO₂ (%)', 'num', { u: '%' }), f('co', 'CO (ppm)', 'num', { u: 'ppm' }), f('flueTemp', 'Flue gas temperature (°C)', 'num', { u: '°C' }),
          f('smoke', 'Smoke number (0–9)', 'num'), f('analyser', 'Analyser make and serial number', 'txt', { opt: 1, caps: 1 }),
          yn('commissioned', 'Commissioned to the manufacturer’s instructions?')
        ] },
        { h: 'Handover', fields: [
          yn('shown', 'Customer shown how to use the controls?'), yn('lit', 'Manuals and literature left with the customer?'),
          yn('serviceAdv', 'Customer told the boiler needs servicing every year?'), yn('warranty', 'Warranty registration explained?'),
          f('notes', 'Notes', 'area', { opt: 1 }), f('renewal', 'First service due by', 'date', { top: 1 })
        ] }
      ],
      sum: r => [['Appliance', [OFORM.val(r, 'make'), r.f.model].filter(Boolean).join(' ')], ['Work', r.f.instType], ['Commissioned', r.f.commissioned], ['Checks failed', String(OFORM.failCount(r))], ['First service', r.renewal]],
      stamp: () => false
    },

    oillord: {
      name: 'Landlord oil installation check record', short: 'Landlord oil check', subj: 'Landlord Oil Installation Check',
      pdf: 'LANDLORD OIL INSTALLATION CHECK RECORD', sub: 'Annual safety check of the oil heating installation in a rented property.',
      prefix: 'OLC', dateLabel: 'Date of check', price: 'priceOilLord', desc: 'Landlord oil installation check and record', renew: true, docNote: 'Your next oil safety check is due by',
      foot: 'THIS RECORD SHOWS THE CONDITION OF THE OIL INSTALLATION AT THE TIME OF THE CHECK. KEEP IT FOR AT LEAST TWO YEARS.',
      sections: [
        { h: 'Property and appliance', fields: [
          f('tenant', 'Tenant name', 'txt', { opt: 1 }), f('tenantPhone', 'Tenant phone', 'txt', { opt: 1 }),
          pick('make', 'Appliance make', MAKE), f('model', 'Appliance model', 'txt'), f('serial', 'Serial number', 'txt', { caps: 1 }),
          pick('systemType', 'System type', TYPE), pick('fuel', 'Fuel', FUEL), pick('location', 'Where is the appliance located?', LOC), pick('flue', 'Flue type', FLUE)
        ] },
        { h: 'Checks', fields: [
          f('i1', 'The checks do not need intrusive work. Mark each as found on the day.', 'info'),
          pf('appCond', 'Appliance condition (visual)'), pf('burnerOp', 'Burner and appliance operate normally'), pf('flueC', 'Flue route and condition (visual)'),
          pf('flueTerm', 'Flue terminal'), pf('vent', 'Ventilation / combustion air supply'), pf('controls', 'Controls and safety devices'),
          pf('tank', 'Oil tank condition (visual)'), pf('bund', 'Bund, base and supports'), pf('pipework', 'Oil supply pipework (visual)'), pf('fireValve', 'Fire valve and isolation valve'),
          pf('leaks', 'No oil leaks or staining'), pf('coAlarm', 'Carbon monoxide alarm fitted and working')
        ] },
        { h: 'Result', fields: [
          yn('safe', 'Is the oil installation safe to use?', { stamp: 'NO' }),
          pick('defectClass', 'Defects found', ['None', 'Advisory', 'At risk', 'Immediately dangerous']),
          f('defects', 'Defects found and advice given', 'area', { when: ['defectClass', v => v && v !== 'None'] }),
          f('action', 'Remedial action taken', 'area', { opt: 1 }), yn('warnIssued', 'Has a warning and advice notice been issued?'), yn('tenantCopy', 'Copy left with the tenant?'),
          f('renewal', 'Next check due by', 'date', { top: 1 }), f('notes', 'Engineer notes', 'area', { opt: 1 })
        ] }
      ],
      sum: r => [['Appliance', [OFORM.val(r, 'make'), r.f.model].filter(Boolean).join(' ')], ['Tenant', r.f.tenant], ['Checks failed', String(OFORM.failCount(r))], ['Safe to use', r.f.safe], ['Defects', r.f.defectClass], ['Next check', r.renewal]],
      stamp: r => r.f.safe === 'NO' || r.f.defectClass === 'Immediately dangerous'
    },

    oilwarn: {
      name: 'Oil warning and advice notice', short: 'Oil warning notice', subj: 'Oil Warning and Advice Notice',
      pdf: 'OIL WARNING AND ADVICE NOTICE', sub: 'Notice of a dangerous or at-risk defect found on an oil heating installation.',
      prefix: 'OWN', dateLabel: 'Date of notice', price: '', desc: '', renew: false, docNote: '',
      foot: 'THE DEFECT DESCRIBED ABOVE HAS BEEN EXPLAINED TO THE PERSON RESPONSIBLE. DO NOT USE ANYTHING MARKED UNSAFE UNTIL IT HAS BEEN PUT RIGHT.',
      sections: [
        { h: 'Installation', fields: [
          pick('appType', 'What has the defect?', ['Oil boiler', 'Oil storage tank', 'Oil supply pipework', 'Oil-fired cooker', 'Other']),
          pick('location', 'Where is it?', LOC), f('make', 'Make', 'txt'), f('model', 'Model', 'txt', { opt: 1 }), f('serial', 'Serial number', 'txt', { opt: 1, caps: 1 })
        ] },
        { h: 'Defect', fields: [
          pick('cls', 'Classification', CLASS), f('defect', 'What is wrong?', 'area'), f('hazard', 'Why it is a danger or risk', 'area'),
          pick('actionTaken', 'What was done on the day?', ['Appliance turned off and labelled', 'Oil supply isolated', 'Advice given, left in use', 'Disconnected / made safe', 'Other']),
          yn('agreed', 'Did the person responsible agree to the action?')
        ] },
        { h: 'Advice', fields: [
          f('remedial', 'Action needed to put it right', 'area'), f('notes', 'Notes', 'area', { opt: 1 })
        ] }
      ],
      sum: r => [['Defect on', OFORM.val(r, 'appType')], ['Classification', r.f.cls], ['Action taken', OFORM.val(r, 'actionTaken')]],
      stamp: r => r.f.cls === 'Immediately dangerous', stampText: 'DANGER – DO NOT USE'
    },

    oilrisk: {
      name: 'Oil tank spillage and fire risk assessment', short: 'Oil tank risk assessment', subj: 'Oil Tank Spillage and Fire Risk Assessment',
      pdf: 'OIL TANK SPILLAGE AND FIRE RISK ASSESSMENT', sub: 'Assessment of the position of a domestic oil storage tank for spillage and fire risk.',
      prefix: 'ORA', dateLabel: 'Date of assessment', price: '', desc: '', renew: false, docNote: '',
      foot: 'THIS ASSESSMENT RECORDS THE TANK POSITION AND RISKS AT THE DATE SHOWN. IT SHOULD BE REPEATED IF THE TANK OR ITS SURROUNDINGS CHANGE.',
      sections: [
        { h: 'Tank', fields: [
          pick('position', 'Where is the tank?', POSITION), pick('material', 'Tank material', MATERIAL), yn('bunded', 'Is the tank bunded?'),
          f('capacity', 'Capacity (litres)', 'num', { u: 'litres' }), pick('fuel', 'Fuel stored', FUEL), f('tankMake', 'Tank make', 'txt', { opt: 1 }), f('tankAge', 'Age of tank', 'txt', { opt: 1 })
        ] },
        { h: 'Spillage risk', fields: [
          yn('water10', 'Within 10 m of a river, stream, ditch, pond or coastal water?'), yn('well50', 'Within 50 m of a well, borehole or spring that supplies drinking water?'),
          yn('drain', 'Close to a drain, soakaway or hard surface that drains to water?'), yn('slope', 'On or near sloping ground?'),
          yn('contain', 'Secondary containment (a bund) needed?'), f('spillNotes', 'Notes on spillage risk', 'area', { opt: 1 })
        ] },
        { h: 'Fire risk', fields: [
          f('distBuilding', 'Distance from the building (m)', 'num', { u: 'm' }), f('distBoundary', 'Distance from the boundary (m)', 'num', { u: 'm' }),
          f('distOther', 'Distance from other buildings or flammable material (m)', 'num', { opt: 1, u: 'm' }),
          yn('openings', 'Windows, doors or vents close to the tank?'), yn('fireNeeded', 'Fire protection needed?'), pick('fireProv', 'Fire protection provided', ['Fire wall or barrier', 'Tank moved or sited clear', 'Not needed', 'Other']),
          f('fireNotes', 'Notes on fire risk', 'area', { opt: 1 })
        ] },
        { h: 'Conclusion', fields: [
          yn('ok', 'Is the tank position acceptable?'), f('actions', 'Action needed', 'area', { opt: 1 }), f('notes', 'Notes', 'area', { opt: 1 })
        ] }
      ],
      sum: r => [['Tank', [OFORM.val(r, 'material'), r.f.capacity ? r.f.capacity + ' litres' : ''].filter(Boolean).join(' · ')], ['Bund needed', r.f.contain], ['Fire protection needed', r.f.fireNeeded], ['Position acceptable', r.f.ok]],
      stamp: () => false
    },

    oilcond: {
      name: 'Condensing oil boiler assessment', short: 'Condensing assessment', subj: 'Condensing Oil Boiler Assessment',
      pdf: 'CONDENSING OIL BOILER ASSESSMENT', sub: 'Assessment of whether a condensing boiler can be fitted in place of an existing oil boiler.',
      prefix: 'OCA', dateLabel: 'Date of assessment', price: '', desc: '', renew: false, docNote: '',
      foot: 'THIS ASSESSMENT RECORDS THE ENGINEER’S REASONS FOR THE BOILER CHOICE AT THE DATE SHOWN.',
      sections: [
        { h: 'Existing boiler', fields: [
          pick('make', 'Existing boiler make', MAKE), f('model', 'Existing boiler model', 'txt', { opt: 1 }), f('age', 'Age of existing boiler', 'txt', { opt: 1 }),
          pick('location', 'Where is it located?', LOC), pick('flue', 'Existing flue type', FLUE), f('newModel', 'Replacement boiler chosen', 'txt'), f('newKw', 'Replacement output (kW)', 'num', { u: 'kW' })
        ] },
        { h: 'Assessment', fields: [
          yn('flueOk', 'Is there a suitable position for a condensing boiler flue terminal?'), yn('condOk', 'Can the condensate be taken to a suitable drain or soakaway?'),
          yn('routeOk', 'Can the flue and condensate routes be fitted without major building work?'), yn('costOk', 'Is the extra cost of fitting a condensing boiler reasonable?'),
          f('reasons', 'Reasons a condensing boiler cannot be fitted', 'area', { when: ['reasonsNeeded', null] })
        ] },
        { h: 'Conclusion', fields: [
          yn('condensing', 'Is a condensing boiler being fitted?'), yn('informed', 'Customer told about the efficiency and running cost of the choice?'),
          f('notes', 'Notes', 'area', { opt: 1 })
        ] }
      ],
      sum: r => [['Existing', [OFORM.val(r, 'make'), r.f.model].filter(Boolean).join(' ')], ['Replacement', r.f.newModel], ['Condensing fitted', r.f.condensing]],
      stamp: () => false
    }
  };
  /* the "reasons" box is only needed when any assessment answer is NO */
  SPECS.oilcond.sections[1].fields[4].when = ['', r => ['flueOk', 'condOk', 'routeOk', 'costOk'].some(k => r[k] === 'NO')];

  const TYPES = Object.keys(SPECS);
  const of = r => (r && SPECS[r.type]) || null;
  const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const path = fd => (fd.top ? fd.k : 'f.' + fd.k);
  const steps = sp => ['Customer', ...sp.sections.map(x => x.h), 'Sign off', 'Review'];
  const visible = (fd, r) => !fd.when || fd.when[1](fd.when[0] ? r.f[fd.when[0]] : r.f);
  const val = (r, k) => { const fd = OFORM.fieldsOf(r).find(x => x.k === k), v = r.f[k]; return fd && fd.other && v === 'Other' ? (r.f[k + 'Other'] || 'Other') : (v || ''); };
  const fieldsOf = r => { const sp = of(r); return sp ? sp.sections.flatMap(s => s.fields) : []; };
  const blank = type => {
    const o = {}; SPECS[type].sections.forEach(s => s.fields.forEach(fd => { if (fd.t !== 'info' && !fd.top) { o[fd.k] = ''; if (fd.other) o[fd.k + 'Other'] = ''; if (fd.t === 'pfn') o[fd.k + '_d'] = ''; } }));
    return { f: o };
  };
  const failCount = r => fieldsOf(r).filter(fd => fd.t === 'pfn' && r.f[fd.k] === 'FAIL').length;
  const stamp = r => { const sp = of(r); return !!sp && !!sp.stamp(r); };

  function validate(rec) {
    const out = [], sp = of(rec);
    const need = (step, p, label) => { if (!String(getP(rec, p) ?? '').trim()) out.push({ step, path: p, label }); };
    need(0, 'customer.name', 'Customer name'); need(0, 'jobAddress', 'Job address');
    sp.sections.forEach((sec, i) => {
      const st = i + 1;
      sec.fields.forEach(fd => {
        if (fd.t === 'info' || !visible(fd, rec)) return;
        const p = path(fd), v = String(getP(rec, p) ?? '').trim();
        if (!fd.opt && !v) out.push({ step: st, path: p, label: fd.l });
        else if (v && fd.t === 'num' && !Number.isFinite(parseFloat(v.replace(',', '.')))) out.push({ step: st, path: p, label: fd.l + ' (enter a number)' });
        if (fd.other && v === 'Other') need(st, 'f.' + fd.k + 'Other', fd.l + ' (other)');
        if (fd.t === 'pfn' && v === 'FAIL') need(st, 'f.' + fd.k + '_d', fd.l + ' – fault details');
      });
    });
    const sg = sp.sections.length + 1;
    need(sg, 'customerPresent', 'Customer present?'); need(sg, 'engineerSig', "Engineer's signature");
    if (rec.customerPresent === 'Yes') { need(sg, 'customerName', 'Client name (signing)'); need(sg, 'customerSig', 'Client signature'); }
    return out;
  }

  function warnings(rec, s) {
    const w = [];
    if (!s.address || !s.phone || !s.engineerName) w.push('Business and engineer details are missing in Settings – they will be blank on the PDF.');
    if (!s.oftecReg) w.push('Your OFTEC registration number is not set in Settings – it will be blank on the PDF.');
    if (!rec.customer.email) w.push('No customer email – you can still share the PDF from your phone.');
    if (failCount(rec) && rec.f.safe === 'YES') w.push('A check has failed but the installation is marked safe to use – check this is right.');
    return w;
  }

  return { SPECS, TYPES, of, steps, visible, val, fieldsOf, path, blank, failCount, stamp, validate, warnings, PFN, YN, YNNA };
})();
