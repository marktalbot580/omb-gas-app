/* Legionella risk assessment – form definition, validation and helpers.
   Shared by app.js (the form) and pdf-leg.js (the PDF).
   Based on HSE guidance for landlords (ACOP L8 / HSG274 Part 2): keep hot water hot (stored at 60°C+,
   50°C+ at outlets), keep cold water cold (below 20°C), keep it moving, keep the system clean. */
'use strict';
const LEG = (() => {
  const STEPS = ['Customer', 'System', 'Temperatures', 'Tank & cylinder', 'Risk areas', 'Findings', 'Sign off', 'Review'];
  const COLD_SUPPLY = ['Mains feed', 'Storage tank'];
  /* older records may hold earlier wordings, so these tests look at the wording rather than the list position */
  const isMains = v => /^mains fed|^mains feed/i.test(String(v || ''));
  const isVented = v => /^vented/i.test(String(v || ''));
  const NO_CYL = ['Combi boiler', 'Instantaneous water heater', 'Instantaneous heaters'];
  const HOT_TYPE = ['Combi boiler', 'Vented hot water cylinder', 'Unvented hot water cylinder', 'Instantaneous water heater'];
  /* how a cylinder is heated: an immersion heater can be fitted to a vented or an unvented cylinder */
  const CYL_HEAT = ['Boiler', 'Immersion heater', 'Boiler and immersion'];
  const SHOWERS = ['None', 'Electric shower', 'Mixer / other shower'];
  const YN3 = ['Yes', 'No', 'NA'];
  const PRIORITY = ['Action required', 'Advisory'];
  const OVERALL = ['Low', 'Medium', 'High'];

  /* Every check is worded so that "Yes" is the satisfactory answer. */
  const TANK = [
    { k: 'tankAccess', d: 'Cold water tank is not accessible for inspection.', q: 'Is the tank accessible for inspection?', fix: 'Provide safe access to the cold water tank so it can be inspected and cleaned.' },
    { k: 'tankCool', d: 'Cold water tank is not in a cool place, or is exposed to heat sources or frost.', q: 'Is the tank in a cool place, protected from heat sources and frost?', fix: 'Move the tank away from heat sources, or shield and insulate it, so the water stays below 20°C.' },
    { k: 'tankInsul', d: 'Cold water tank is not insulated.', q: 'Is the tank insulated (lagged)?', fix: 'Insulate the tank (and its pipework) to keep the water cool.' },
    { k: 'tankLid', d: 'Cold water tank does not have a tight-fitting lid and/or insect screens on the vent and overflow pipes.', q: 'Does the tank have a tight-fitting lid, with insect screens on the vent and overflow pipes?', fix: 'Fit a tight-fitting lid and insect screens to the vent and overflow pipes.' },
    { k: 'tankClean', d: 'Water in the cold tank is not clean (dust, debris, rust, scale or organic matter present).', q: 'Is the water in the tank clean and free from dust, debris, rust, scale and organic matter?', fix: 'Drain, clean and disinfect the tank, then re-inspect.' }
  ];
  const CYL = [
    { k: 'cylAccess', d: 'Hot water cylinder is not accessible for inspection.', q: 'Is the hot water cylinder accessible for inspection?', fix: 'Provide safe access to the hot water cylinder.' },
    { k: 'cylDrain', d: 'No drain valve is fitted at the base of the hot water cylinder.', q: 'Is a drain valve fitted at the base of the cylinder?', fix: 'Fit a drain valve so the cylinder can be drained and flushed.' },
    { k: 'cylPipes', d: 'Hot water distribution pipework is not adequately insulated.', q: 'Is the hot water distribution pipework adequately insulated?', fix: 'Insulate the hot water pipework so it keeps its heat.' }
  ];
  const RISK = [
    { k: 'showerheads', d: 'Shower heads and hoses are not clean, descaled or in good condition.', q: 'Are shower heads and hoses clean, descaled and in good condition?', fix: 'Clean and descale shower heads and hoses (replace if damaged). Advise the tenant to repeat this at least every 6 months.' },
    { k: 'deadLegs', d: 'Dead legs or redundant pipework are present.', q: 'Is the pipework free from dead legs and redundant pipework?', fix: 'Remove dead legs and redundant pipework, or alter the system so water flows through all pipework.' },
    { k: 'scale', d: 'Heavy scale, rust or debris is present at outlets or visible pipework.', q: 'Are the outlets and visible pipework free from heavy scale, rust and debris?', fix: 'Clean and descale the outlets and investigate the source of any rust or debris.' },
    { k: 'lowUse', d: 'Little-used outlets are not being used or flushed at least weekly.', q: 'Are little-used outlets (spare bathroom, outside tap) used or flushed at least weekly?', fix: 'Flush little-used outlets at least weekly, or remove them.' },
    { k: 'flushed', d: 'The system was not flushed before letting or after a vacant period.', q: 'Was the system flushed before letting and after any vacant period?', fix: 'Flush all hot and cold outlets before the tenancy starts and after any vacant period.' },
    { k: 'tenantAdvised', d: 'The tenant has not been advised of the simple control measures.', q: 'Has the tenant been advised of the simple control measures?', fix: 'Advise the tenant not to turn down the cylinder temperature, to clean shower heads regularly and to report any hot water problems.' }
  ];

  const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
  const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  /* a cold water tank is checked when the cold supply is a storage tank, or when a vented cylinder is fitted (it is always fed from a tank) */
  const hasTank = r => (!!r.coldSupply && !isMains(r.coldSupply)) || isVented(r.hotType);
  const hasCyl = r => !!r.hotType && !NO_CYL.includes(r.hotType);
  const hasShower = r => !!r.showers && r.showers !== 'None';
  const tankList = r => (hasTank(r) ? TANK : []);
  const cylList = r => (hasCyl(r) ? CYL : []);
  const riskList = r => RISK.filter(c => c.k !== 'showerheads' || hasShower(r));
  const allChecks = r => [
    ...tankList(r).map(c => ({ ...c, area: 'Cold water tank' })),
    ...cylList(r).map(c => ({ ...c, area: 'Hot water cylinder' })),
    ...riskList(r).map(c => ({ ...c, area: 'Risk areas' }))
  ];
  const blankChecks = () => Object.fromEntries([...TANK, ...CYL, ...RISK].map(c => [c.k, '']));

  /* temperature checks: the HSE "keep hot water hot, cold water cold" parameters */
  function temps(r) {
    const t = [
      { k: 'coldTemp', label: 'Cold water at outlet', where: r.coldOutlet, req: 'Below 20°C', n: num(r.coldTemp), ok: x => x < 20,
        text: n => `Cold water at the outlet measured ${n}°C (should be below 20°C).`,
        fix: 'Check for heat gain (cold pipes running near hot pipes or heat sources), insulate the cold pipework, flush the outlet and re-test.' },
      { k: 'hotTemp', label: 'Hot water at outlet', where: r.hotOutlet, req: '50°C or above', n: num(r.hotTemp), ok: x => x >= 50,
        text: n => `Hot water at the outlet measured ${n}°C (should reach 50°C or above).`,
        fix: 'Check the boiler / cylinder temperature settings and the hot water pipework, then re-test. Hot water should reach 50°C within about a minute.' }
    ];
    if (hasTank(r)) t.push({ k: 'tankTemp', label: 'Water in cold tank', where: 'Cold water tank', req: 'Below 20°C', n: num(r.tankTemp), ok: x => x < 20,
      text: n => `Water in the cold tank measured ${n}°C (should be below 20°C).`,
      fix: 'Find and remove the source of heat gain, insulate the tank and pipework, and re-test. Consider a mains-fed cold supply.' });
    if (hasCyl(r)) t.push({ k: 'cylTemp', label: 'Stored hot water (cylinder)', where: 'Hot water cylinder', req: '60°C or above', n: num(r.cylTemp), ok: x => x >= 60,
      text: n => `Stored hot water measured ${n}°C (should be 60°C or above).`,
      fix: 'Raise the cylinder thermostat so water is stored at 60°C or above, then re-test.' });
    return t.map(x => ({ ...x, pass: x.n === null ? null : x.ok(x.n) }));
  }

  /* turn every failed temperature / "No" answer into a defect line with a suggested fix */
  function autoDefects(r) {
    const out = [];
    temps(r).forEach(t => { if (t.pass === false) out.push({ text: t.text(t.n), cls: 'Action required', action: t.fix }); });
    allChecks(r).forEach(c => { if (r[c.k] === 'No') out.push({ text: c.d, cls: 'Action required', action: c.fix }); });
    return out;
  }
  const failCount = r => temps(r).filter(t => t.pass === false).length + allChecks(r).filter(c => r[c.k] === 'No').length;

  function lowRiskNote(r) {
    if (isMains(r.coldSupply) && NO_CYL.includes(r.hotType))
      return 'Mains-fed cold water with a combi / instantaneous heater means no stored water – the lowest-risk set-up. Temperature, showers and little-used outlets still matter.';
    return '';
  }

  function validate(rec) {
    const out = [];
    const need = (step, path, label) => { if (!String(getP(rec, path) ?? '').trim()) out.push({ step, path, label }); };
    const numeric = (step, path, label) => {
      const v = String(getP(rec, path) ?? '').trim();
      if (!v) out.push({ step, path, label }); else if (num(v) === null) out.push({ step, path, label: label + ' (enter a number)' });
    };
    need(0, 'customer.name', 'Customer name'); need(0, 'jobAddress', 'Job address');
    need(1, 'susceptible', 'Susceptible person'); need(1, 'occupancy', 'Property occupancy');
    need(1, 'coldSupply', 'Cold water supply'); need(1, 'hotType', 'Hot water system');
    if (hasCyl(rec) && !['Other', 'Immersion cylinder'].includes(rec.hotType)) need(1, 'cylHeat', 'How the cylinder is heated');
    if (rec.hotType === 'Other') need(1, 'hotOther', 'Hot water system description');
    numeric(2, 'coldTemp', 'Cold water temperature at outlet'); numeric(2, 'hotTemp', 'Hot water temperature at outlet');
    if (hasTank(rec)) numeric(2, 'tankTemp', 'Cold tank water temperature');
    if (hasCyl(rec) && rec.hotType !== 'Other') numeric(2, 'cylTemp', 'Cylinder stored temperature');
    [...tankList(rec), ...cylList(rec)].forEach(c => need(3, c.k, c.q.replace(/\?$/, '')));
    need(4, 'showers', 'Showers fitted');
    riskList(rec).forEach(c => need(4, c.k, c.q.replace(/\?$/, '')));
    need(5, 'overall', 'Overall risk rating'); need(5, 'renewal', 'Next assessment due date');
    rec.defects.forEach((d, i) => {
      const n = `Item ${i + 1}: `;
      need(5, `defects.${i}.text`, n + 'risk / defect'); need(5, `defects.${i}.cls`, n + 'priority'); need(5, `defects.${i}.action`, n + 'recommendation');
    });
    need(6, 'customerPresent', 'Customer present?'); need(6, 'engineerSig', "Engineer's signature");
    if (rec.customerPresent === 'Yes') { need(6, 'customerName', 'Client name (signing)'); need(6, 'customerSig', 'Client signature'); }
    return out;
  }

  function warnings(rec, s) {
    const w = [];
    if (!s.address || !s.phone || !s.engineerName) w.push('Business address, telephone and engineer name are missing in Settings – they will be blank on the PDF.');
    if (!rec.customer.email) w.push('No customer email – you can still share the PDF from your phone.');
    const f = failCount(rec);
    if (f && rec.overall === 'Low') w.push(`${f} check${f > 1 ? 's' : ''} failed but the overall risk is rated Low – check this is right.`);
    if (!f && rec.overall === 'High') w.push('No checks failed but the overall risk is rated High – check this is right.');
    if (f && !rec.defects.length) w.push('Checks have failed but no risk / defect has been recorded. Use “Add failed checks” on the Findings step.');
    if (rec.susceptible === 'Yes') w.push('A susceptible person lives here – consider reviewing this assessment more often than yearly.');
    return w;
  }

  return { STEPS, COLD_SUPPLY, HOT_TYPE, CYL_HEAT, SHOWERS, YN3, PRIORITY, OVERALL, TANK, CYL, RISK, num, hasTank, hasCyl, hasShower,
    tankList, cylList, riskList, allChecks, blankChecks, temps, autoDefects, failCount, lowRiskNote, validate, warnings };
})();
