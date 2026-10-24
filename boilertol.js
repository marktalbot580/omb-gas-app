/* Manufacturer figures for a boiler (the data-sheet limits). They are saved on the boiler in the Price list.
   When the make / model / GC number on a service or gas check matches one, each reading gets an (i) button showing the
   figures, and readings that can be judged turn green (inside the limit) or red (outside). Colour is a guide only:
   it never changes safe / unsafe, a result or a warning notice. */
'use strict';
const BT = (() => {
  /* same order and wording as a manufacturer data sheet, so a new boiler can be filled in line by line */
  const FIELDS = [
    ['gc', 'Gas Council (GC) number', ''],
    ['flue', 'Flue Type', ''],
    ['hi', 'CH Max Heat Input (Kw Net)', 'decimal'],
    ['hiMin', 'CH Min Heat Input (Kw Net), or N/A', ''],
    ['co2Max', 'Max CO2 %', 'decimal'],
    ['co2Min', 'Min CO2 %', 'decimal'],
    ['co2Tol', 'CO2 tolerance, plus or minus (e.g. 0.5)', 'decimal'],
    ['ratio', 'Maximum Ratio', 'decimal'],
    ['co', 'Maximum CO (ppm)', 'decimal'],
    ['coLow', 'Maximum CO (ppm) at minimum rate, if different', 'decimal'],
    ['fan', 'Fan Pressure (mb), as printed (e.g. 3.1)', 'decimal'],
    ['inlet', 'Min Gas Inlet Working Pressure (mb)', 'decimal'],
    ['co2MaxF', 'Max CO2 % range FROM (only if the manual gives a range)', 'decimal'],
    ['co2MaxT', 'Max CO2 % range TO', 'decimal'],
    ['co2MinF', 'Min CO2 % range FROM (only if the manual gives a range)', 'decimal'],
    ['co2MinT', 'Min CO2 % range TO (leave empty if open ended)', 'decimal'],
    ['fanPF', 'Fan pressure PASS from (mb, no minus needed)', 'decimal'],
    ['fanPT', 'Fan pressure PASS to (mb)', 'decimal'],
    ['fanFF', 'Fan pressure FAIL from (mb)', 'decimal'],
    ['fanFT', 'Fan pressure FAIL to (mb)', 'decimal']
  ];
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const digits = s => String(s || '').replace(/\D/g, '');
  const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.').replace(/[^\d.\-−]/g, '').replace('−', '-')); return isFinite(n) ? n : null; };
  const val = (x, k) => String((x && x['t_' + k]) || '').trim();
  const hasFigures = x => FIELDS.some(([k]) => k !== 'gc' && k !== 'flue' && k !== 'hiMin' && val(x, k) !== '');
  const esc2 = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* Boilers built into the app for every engineer. Add each new data sheet here. 'src' notes which sheet the figures came from.
     An engineer's own Price list entry for the same make and model (with figures) takes priority, so their edits are never overwritten. */
  const BUILTIN = [
    { id: 'bt:wb-greenstar-24ri', type: 'Boiler', make: 'Worcester Bosch', name: 'Greenstar 24Ri', kind: 'Heat only', kw: '24', warranty: '5 years', src: 'Worcester Bosch data sheet (supplied by M. Talbot)',
      t_gc: '41-311-65', t_flue: 'Room Sealed', t_hiMin: 'N/A', t_hi: '24.62', t_co2Max: '9.8', t_co2Min: '9.2', t_co2Tol: '0.5', t_ratio: '0.0020', t_co: '200', t_fan: '3.1', t_inlet: '16.5', t_fanPF: '3.1', t_fanPT: '10', t_fanFF: '3', t_fanFT: '0' },
    /* the Ri 12, 15 and 18 figures are from Worcester Bosch's Greenstar Ri installation manual (heat input, CO2, CO, gas pressure) and a published fan-suction table; pass / fail ranges for fan pressure are left for the engineer to set */
    { id: 'bt:wb-greenstar-12ri', type: 'Boiler', make: 'Worcester Bosch', name: 'Greenstar 12Ri', kind: 'Heat only', kw: '12', warranty: '', src: 'Worcester Bosch Greenstar Ri installation manual',
      t_gc: '41-311-63', t_flue: 'Room Sealed', t_hiMin: 'N/A', t_hi: '12.32', t_co2Max: '9.65', t_co2Min: '8.65', t_co2Tol: '0.5', t_ratio: '0.0020', t_co: '200', t_fan: '3.6', t_inlet: '16.5', t_fanPF: '3.6', t_fanPT: '10', t_fanFF: '0', t_fanFT: '3.5' },
    { id: 'bt:wb-greenstar-15ri', type: 'Boiler', make: 'Worcester Bosch', name: 'Greenstar 15Ri', kind: 'Heat only', kw: '15', warranty: '', src: 'Worcester Bosch Greenstar Ri installation manual',
      t_gc: '41-311-75', t_flue: 'Room Sealed', t_hiMin: 'N/A', t_hi: '15.40', t_co2Max: '9.8', t_co2Min: '9.2', t_co2Tol: '0.5', t_ratio: '0.0020', t_co: '200', t_fan: '5.5', t_inlet: '16.5', t_fanPF: '5.5', t_fanPT: '10', t_fanFF: '0', t_fanFT: '5.4' },
    { id: 'bt:wb-greenstar-18ri', type: 'Boiler', make: 'Worcester Bosch', name: 'Greenstar 18Ri', kind: 'Heat only', kw: '18', warranty: '', src: 'Worcester Bosch Greenstar Ri installation manual',
      t_gc: '41-311-77', t_flue: 'Room Sealed', t_hiMin: 'N/A', t_hi: '18.48', t_co2Max: '9.8', t_co2Min: '9.2', t_co2Tol: '0.5', t_ratio: '0.0020', t_co: '200', t_fan: '7.4', t_inlet: '16.5', t_fanPF: '7.4', t_fanPT: '10', t_fanFF: '0', t_fanFT: '7.3' }
  ].concat([
    /* Greenstar 4000 System (GR4700iW 12 S to 24 S, natural gas): Worcester Bosch installation and maintenance manual 6 720 891 162 (2020/09). Names follow the starter Price list. */
    ['12', '41-800-07', '12.2', '2.9', '2.8'], ['15', '41-800-09', '15.3', '4.3', '4.2'], ['18', '41-800-11', '18.4', '2.1', '2.0'], ['21', '41-800-13', '21.4', '2.8', '2.7'], ['24', '41-800-15', '24.6', '3.5', '3.4']
  ].map(([kw, gc, hi, fan, failTo]) => ({ id: 'bt:wb-greenstar-4000-system-' + kw, type: 'Boiler', make: 'Worcester Bosch', name: 'Greenstar 4000 System ' + kw + 'kW', kind: 'System', kw, warranty: '', src: 'Worcester Bosch Greenstar 4000 manual 6 720 891 162 (2020/09)',
    t_gc: gc, t_flue: 'Room Sealed', t_hiMin: 'N/A', t_hi: hi, t_co2Max: '9.4', t_co2Min: '8.6', t_co2Tol: '0.4', t_ratio: '', t_co: '250', t_fan: fan, t_inlet: '16.5', t_fanPF: fan, t_fanPT: '12', t_fanFF: '0', t_fanFT: failTo })));
  /* more built-in boilers, from Worcester Bosch manuals supplied by Mark */
  BUILTIN.push(...[
    /* Greenstar Ri ErP (6 720 813 283, 2015/07): same figures as the Ri, new GC numbers. Fan: the manual's "clean the heat exchanger" / "heat exchanger ok" chart; the -10 upper end is the same rule as the 24Ri. */
    ['12', '41-406-41', '12.32', '9.65', '8.65', '3.6', '3.5'], ['15', '41-406-43', '15.40', '9.8', '9.2', '5.5', '5.4'], ['18', '41-406-45', '18.48', '9.8', '9.2', '7.4', '7.3'], ['24', '41-406-47', '24.62', '9.8', '9.2', '3.1', '3.0']
  ].map(([kw, gc, hi, c2a, c2b, fan, ft]) => ({ id: 'bt:wb-greenstar-ri-erp-' + kw, type: 'Boiler', make: 'Worcester Bosch', name: 'Greenstar ' + kw + 'Ri ErP', kind: 'Heat only', kw, warranty: '', src: 'Worcester Bosch Greenstar Ri ErP manual 6 720 813 283 (2015/07)',
    t_gc: gc, t_flue: 'Room Sealed', t_hiMin: 'N/A', t_hi: hi, t_co2Max: c2a, t_co2Min: c2b, t_co2Tol: '0.5', t_ratio: '0.0020', t_co: '200', t_fan: fan, t_inlet: '16.5', t_fanPF: fan, t_fanPT: '10', t_fanFF: '0', t_fanFT: ft })));
  BUILTIN.push(...[
    /* Greenstar 4000 combi (GR4700iW 25 C / 30 C): manual 6 720 813 283 (2015/07). Heat input is the central heating figure. */
    ['25', '47-800-30', '3.9', '3.8'], ['30', '47-800-32', '5.2', '5.1']
  ].map(([kw, gc, fan, failTo]) => ({ id: 'bt:wb-greenstar-4000-' + kw, type: 'Boiler', make: 'Worcester Bosch', name: 'Greenstar 4000 ' + kw + 'kW', kind: 'Combination', kw, warranty: '', src: 'Worcester Bosch Greenstar 4000 combi manual (GR4700iW 25 C / 30 C)',
    t_gc: gc, t_flue: 'Room Sealed', t_hiMin: 'N/A', t_hi: '24.6', t_co2Max: '9.4', t_co2Min: '8.6', t_co2Tol: '0.4', t_ratio: '', t_co: '250', t_fan: fan, t_inlet: '16.5', t_fanPF: fan, t_fanPT: '12', t_fanFF: '0', t_fanFT: failTo })));
  BUILTIN.push(...[
    /* Greenstar R29 HE / R40 HE conventional (manual 6 720 611 445 GB, 05.04): no CO2 tolerance, CO limit, ratio or fan pressure is given, so those are left blank. Gas inlet: must not be run below 18 mbar. */
    ['29', '41-311-60', '27.7', '9.2', '8.8'], ['40', '41-311-61', '40', '9.2', '9.2']
  ].map(([kw, gc, hi, c2a, c2b]) => ({ id: 'bt:wb-greenstar-r' + kw + 'he', type: 'Boiler', make: 'Worcester Bosch', name: 'Greenstar R' + kw + ' HE', kind: 'Heat only', kw, warranty: '', src: 'Worcester Bosch R29 & R40 HE conventional manual 6 720 611 445 GB (05.04)',
    t_gc: gc, t_flue: 'Room Sealed', t_hiMin: 'N/A', t_hi: hi, t_co2Max: c2a, t_co2Min: c2b, t_co2Tol: '', t_ratio: '', t_co: '', t_fan: '', t_inlet: '18' })));
  BUILTIN.push(...[
    /* Greenstar 30CDi / 40CDi Conventional: manual 6 720 614 556a (2007/07). Fan: "will read negative and be greater than" 3.9 / 4.4 mbar; the -10 upper end is the same rule as the 24Ri. */
    ['30', '41-311-71', '30.9', '9.6', '9.0', '3.9', '3.8'], ['40', '41-311-72', '42.0', '9.7', '9.1', '4.4', '4.3']
  ].map(([kw, gc, hi, c2a, c2b, fan, ft]) => ({ id: 'bt:wb-greenstar-' + kw + 'cdi', type: 'Boiler', make: 'Worcester Bosch', name: 'Greenstar ' + kw + 'CDi', kind: 'Heat only', kw, warranty: '', src: 'Worcester Bosch Greenstar CDi Conventional manual 6 720 614 556a (2007/07)',
    t_gc: gc, t_flue: 'Room Sealed', t_hiMin: 'N/A', t_hi: hi, t_co2Max: c2a, t_co2Min: c2b, t_co2Tol: '0.2', t_ratio: '', t_co: '200', t_fan: fan, t_inlet: '18', t_fanPF: fan, t_fanPT: '10', t_fanFF: '0', t_fanFT: ft })));
  BUILTIN.push(...[
    /* Greenstar 2000 combi (GR2300iW 25 C / 30 C): manual with CO2 as a range. Heat input is the central heating figure. */
    { n: 'Greenstar 2000', kw: '25', gc: '47-800-26', hi: '20.4', fan: '3.3', ft: '3.2', fanTo: '12', src: 'Worcester Bosch Greenstar 2000 GR2300iW C 25/30 manual', co2: { MaxF: '9.0', MaxT: '10.8', MinF: '8.2' }, co: '250' },
    { n: 'Greenstar 2000', kw: '30', gc: '47-800-28', hi: '20.4', fan: '4.8', ft: '4.7', fanTo: '12', src: 'Worcester Bosch Greenstar 2000 GR2300iW C 25/30 manual', co2: { MaxF: '9.0', MaxT: '10.8', MinF: '8.2' }, co: '250' },
    /* Greenstar 8000 Life combi (GR8300iW C) and Style combi (GR8700iW C), manuals 6720883865 / 6720883864 (2019/02). The 30kW fan figure is printed as -10.0 in both, which cannot be right as a pass line, so it is left blank. */
    { n: 'Greenstar 8000 Life', kw: '30', gc: '47-800-18', hi: '30.2', src: 'Worcester Bosch Greenstar 8000 Life manual 6720883865 (2019/02)', co2: { Max: '9.5', Min: '8.6', Tol: '0.4' }, co: '250', coLow: '75' },
    { n: 'Greenstar 8000 Life', kw: '35', gc: '47-800-17', hi: '34.4', fan: '3.5', ft: '3.4', fanTo: '10', src: 'Worcester Bosch Greenstar 8000 Life manual 6720883865 (2019/02)', co2: { Max: '9.5', Min: '8.6', Tol: '0.4' }, co: '250', coLow: '75' },
    { n: 'Greenstar 8000 Style', kw: '30', gc: '47-800-03', hi: '30.2', src: 'Worcester Bosch Greenstar 8000 Style manual 6720883864 (2019/02)', co2: { Max: '9.5', Min: '8.6', Tol: '0.4' }, co: '250', coLow: '75' },
    { n: 'Greenstar 8000 Style', kw: '35', gc: '47-800-02', hi: '34.4', fan: '3.5', ft: '3.4', fanTo: '10', src: 'Worcester Bosch Greenstar 8000 Style manual 6720883864 (2019/02)', co2: { Max: '9.5', Min: '8.6', Tol: '0.4' }, co: '250', coLow: '75' },
    { n: 'Greenstar 8000 Style', kw: '40', gc: '47-800-01', hi: '34.4', fan: '5.0', ft: '4.9', fanTo: '10', src: 'Worcester Bosch Greenstar 8000 Style manual 6720883864 (2019/02)', co2: { Max: '9.5', Min: '8.6', Tol: '0.4' }, co: '250', coLow: '75' }
  ].map(m => { const c = m.co2, o = { id: 'bt:wb-' + m.n.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + m.kw, type: 'Boiler', make: 'Worcester Bosch', name: m.n + ' ' + m.kw + 'kW', kind: 'Combination', kw: m.kw, warranty: '', src: m.src,
    t_gc: m.gc, t_flue: 'Room Sealed', t_hiMin: 'N/A', t_hi: m.hi, t_co: m.co, t_coLow: m.coLow || '', t_ratio: '', t_inlet: '16.5' };
    ['Max', 'Min', 'Tol', 'MaxF', 'MaxT', 'MinF', 'MinT'].forEach(k => { if (c[k]) o['t_co2' + k] = c[k]; });
    if (m.fan) { o.t_fan = m.fan; o.t_fanPF = m.fan; o.t_fanPT = m.fanTo; o.t_fanFF = '0'; o.t_fanFT = m.ft; }
    return o; }));
  BUILTIN.push(...[
    /* Ideal boilers, from Ideal installation and servicing manuals supplied by Mark. Each row: name, type, size, GC number, heat input (central heating, net), lowest heat input, CO2 at maximum, CO2 at minimum, manual.
       CO2 is the printed figure with 0.7 either side. CO under 350 ppm and CO/CO2 ratio under 0.004 (Ideal combustion check); gas pressure at the boiler must be over 18 mbar. Ideal manuals have no fan pressure test, so none is set. */
    ['Logic Max Combi','Combination','24','47-349-56','24.3','4.9','9.5','8.8','Logic Max Combi'],
    ['Logic Max Combi','Combination','30','47-349-57','30.4','6.1','9.3','8.8','Logic Max Combi'],
    ['Logic Max Combi','Combination','35','47-349-58','35.4','7.1','9.5','8.9','Logic Max Combi'],
    ['Logic Max Combi2','Combination','24','47-387-03','24.3','4.9','9.2','8.5','Logic Max Combi2'],
    ['Logic Max Combi2','Combination','30','47-387-04','30.4','6.1','9.3','8.5','Logic Max Combi2'],
    ['Logic Max Combi2','Combination','35','47-387-05','35.4','7.1','9.7','8.8','Logic Max Combi2'],
    ['i-Mini2','Combination','24','47-387-15','24.3','4.9','9.2','8.5','i-mini2 C'],
    ['i-Mini2','Combination','30','47-387-16','30.4','6.1','9.3','8.5','i-mini2 C'],
    ['i-Mini2','Combination','35','47-387-17','35.4','7.1','9.7','8.8','i-mini2 C'],
    ['Vogue Max','Combination','26','47-349-59','18.1','3.7','9.4','8.0','Vogue Max Combi'],
    ['Vogue Max','Combination','32','47-349-60','26.1','4.6','9.8','8.5','Vogue Max Combi'],
    ['Vogue Max','Combination','40','47-349-61','32.1','5.7','9.6','8.1','Vogue Max Combi'],
    ['Logic Max System','System','15','41-796-13','15.1','4.9','9.3','8.8','Logic Max System'],
    ['Logic Max System','System','18','41-796-14','18.1','4.9','9.5','8.9','Logic Max System'],
    ['Logic Max System','System','24','41-796-15','24.3','4.9','9.5','8.8','Logic Max System'],
    ['Logic Max System','System','30','41-796-16','30.4','6.1','9.3','8.8','Logic Max System'],
    ['Logic Max System2','System','15','41-796-97','15.1','4.9','9.5','8.9','Logic Max System2'],
    ['Logic Max System2','System','18','41-796-98','18.1','4.9','9.3','8.3','Logic Max System2'],
    ['Logic Max System2','System','24','41-796-99','24.3','4.9','9.2','8.5','Logic Max System2'],
    ['Logic Max System2','System','30','41-860-01','30.4','6.1','9.6','8.7','Logic Max System2'],
    ['Vogue Max System','System','15','41-796-22','15.1','3.0','9.4','8.3','Vogue Max System'],
    ['Vogue Max System','System','18','41-796-23','18.1','3.6','9.5','8.5','Vogue Max System'],
    ['Vogue Max System','System','26','41-796-24','26.1','5.2','9.5','8.4','Vogue Max System'],
    ['Vogue Max System','System','32','41-796-25','32.1','6.4','9.5','8.2','Vogue Max System'],
    ['Logic Max Heat','Heat only','12','41-796-17','12.1','4.9','9.1','8.5','Logic Max Heat'],
    ['Logic Max Heat','Heat only','15','41-796-18','15.1','4.9','9.3','8.8','Logic Max Heat'],
    ['Logic Max Heat','Heat only','18','41-796-19','18.1','4.9','9.5','8.9','Logic Max Heat'],
    ['Logic Max Heat','Heat only','24','41-796-20','24.3','4.9','9.5','8.8','Logic Max Heat'],
    ['Logic Max Heat','Heat only','30','41-796-21','30.4','6.1','9.3','8.8','Logic Max Heat'],
    ['Logic Max Heat2','Heat only','12','41-860-25','12.1','4.9','9.1','8.5','Logic Max Heat2'],
    ['Logic Max Heat2','Heat only','15','41-860-26','15.1','4.9','9.4','8.8','Logic Max Heat2'],
    ['Logic Max Heat2','Heat only','18','41-860-27','18.1','4.9','9.3','8.7','Logic Max Heat2'],
    ['Logic Max Heat2','Heat only','24','41-860-28','24.3','4.9','9.3','8.4','Logic Max Heat2'],
    ['Logic Max Heat2','Heat only','30','41-860-29','30.4','6.1','9.7','8.8','Logic Max Heat2']
  ].map(([n, kind, kw, gc, hi, lo, c2a, c2b, man]) => ({ id: 'bt:ideal-' + n.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + kw, type: 'Boiler', make: 'Ideal', name: n + ' ' + kw + 'kW', kind, kw, warranty: '', src: 'Ideal ' + man + ' installation and servicing manual',
    t_gc: gc, t_flue: 'Room Sealed', t_hiMin: lo, t_hi: hi, t_co2Max: c2a, t_co2Min: c2b, t_co2Tol: '0.7', t_ratio: '0.0040', t_co: '350', t_inlet: '18' })));
  BUILTIN.push(...[
    /* Vaillant, Baxi and Vokera boilers from the manufacturers' manuals supplied by Mark. Each row: make, name, type, size, GC number, heat input (central heating), CO2 setting, tolerance, CO limit, CO/CO2 ratio limit, gas inlet minimum (mbar), manual.
       Vaillant: CO2 check tolerance is the printed one (+/-1.0 with the casing on, or +/-0.2 where only the setting is given). The 2023 ecoTEC plus range gives an O2 chart instead of CO2, so CO2 is left blank (CO 350 ppm, ratio 0.004 from Vaillant's combustion flowchart).
       Baxi: CO2 as ranges (8.8 to 9.4 at maximum, 8.1 to 8.6 at minimum); CO 350 ppm and ratio 0.004 from the combustion flowchart; at least 18 mbar at the boiler.
       Vokera: CO2 printed tolerance is +0.6 / -1 where given (shown as a from / to range); CO 350 ppm and ratio 0.004 from the combustion flowchart; 18 mbar dynamic at the boiler. Fan pressure is a Worcester Bosch check only. */
    ["Vaillant", "ecoFIT sustain 25kW", "Combination", "25", "47-044-71", "18.4", "Vaillant ecoFIT sustain installation manual", {"co2": "9.2", "tol": "1.0", "co": "250", "ratio": "0.0031", "inlet": "13"}],
    ["Vaillant", "ecoFIT sustain 30kW", "Combination", "30", "47-044-72", "18.4", "Vaillant ecoFIT sustain installation manual", {"co2": "9.2", "tol": "1.0", "co": "250", "ratio": "0.0031", "inlet": "13"}],
    ["Vaillant", "ecoFIT sustain 35kW", "Combination", "35", "47-044-73", "18.4", "Vaillant ecoFIT sustain installation manual", {"co2": "9.2", "tol": "1.0", "co": "250", "ratio": "0.0031", "inlet": "13"}],
    ["Vaillant", "ecoFIT sustain System 15kW", "System", "15", "41-694-30", "15.3", "Vaillant ecoFIT sustain installation manual", {"co2": "9.2", "tol": "0.2", "co": "250", "ratio": "0.0027", "inlet": "17"}],
    ["Vaillant", "ecoFIT sustain System 18kW", "System", "18", "41-694-31", "18.4", "Vaillant ecoFIT sustain installation manual", {"co2": "9.2", "tol": "0.2", "co": "250", "ratio": "0.0027", "inlet": "17"}],
    ["Vaillant", "ecoFIT sustain System 30kW", "System", "30", "41-694-32", "30.6", "Vaillant ecoFIT sustain installation manual", {"co2": "9.2", "tol": "0.2", "co": "250", "ratio": "0.0027", "inlet": "17"}],
    ["Vaillant", "ecoFIT sustain Regular 15kW", "Heat only", "15", "41-694-33", "15.3", "Vaillant ecoFIT sustain installation manual", {"co2": "9.2", "tol": "1.0", "co": "250", "ratio": "0.0031", "inlet": "13"}],
    ["Vaillant", "ecoFIT sustain Regular 18kW", "Heat only", "18", "41-694-34", "18.4", "Vaillant ecoFIT sustain installation manual", {"co2": "9.2", "tol": "1.0", "co": "250", "ratio": "0.0031", "inlet": "13"}],
    ["Vaillant", "ecoFIT sustain Regular 30kW", "Heat only", "30", "41-694-35", "30.6", "Vaillant ecoFIT sustain installation manual", {"co2": "9.2", "tol": "1.0", "co": "250", "ratio": "0.0031", "inlet": "13"}],
    ["Vaillant", "ecoFIT pure 25kW", "Combination", "25", "47-044-68", "18.4", "Vaillant ecoFIT pure combi installation manual 876620", {"co2": "9.2", "tol": "0.2", "co": "250", "ratio": "0.0027", "inlet": "17"}],
    ["Vaillant", "ecoFIT pure 30kW", "Combination", "30", "47-044-74", "25.5", "Vaillant ecoFIT pure combi installation manual 876620", {"co2": "9.2", "tol": "0.2", "co": "250", "ratio": "0.0027", "inlet": "17"}],
    ["Vaillant", "ecoFIT pure 35kW", "Combination", "35", "47-044-70", "25.7", "Vaillant ecoFIT pure combi installation manual 876620", {"co2": "9.2", "tol": "0.2", "co": "250", "ratio": "0.0027", "inlet": "17"}],
    ["Vaillant", "ecoTEC sustain 24kW", "Combination", "24", "47-044-79", "18.7", "Vaillant ecoTEC sustain VUW 7-2 installation manual", {"co2": "9.2", "tol": "1.0", "co": "250", "ratio": "0.0031", "inlet": "15"}],
    ["Vaillant", "ecoTEC sustain 28kW", "Combination", "28", "47-044-80", "18.7", "Vaillant ecoTEC sustain VUW 7-2 installation manual", {"co2": "9.2", "tol": "1.0", "co": "250", "ratio": "0.0031", "inlet": "15"}],
    ["Vaillant", "ecoTEC sustain 34kW", "Combination", "34", "47-044-81", "18.7", "Vaillant ecoTEC sustain VUW 7-2 installation manual", {"co2": "9.2", "tol": "1.0", "co": "250", "ratio": "0.0031", "inlet": "15"}],
    ["Vaillant", "Home Combi 25kW", "Combination", "25", "47-044-62", "15.3", "Vaillant Home Combi installation manual 0020224355", {"co2": "9.2", "tol": "0.2", "co": "250", "ratio": "0.0027", "inlet": "17"}],
    ["Vaillant", "Home Combi 30kW", "Combination", "30", "47-044-63", "15.3", "Vaillant Home Combi installation manual 0020224355", {"co2": "9.2", "tol": "0.2", "co": "250", "ratio": "0.0027", "inlet": "17"}],
    ["Vaillant", "Home Combi 35kW", "Combination", "35", "47-044-64", "15.3", "Vaillant Home Combi installation manual 0020224355", {"co2": "9.2", "tol": "0.2", "co": "250", "ratio": "0.0027", "inlet": "17"}],
    ["Vaillant", "Home System 12kW", "System", "12", "41-044-94", "12.2", "Vaillant Home System installation manual 658413", {"co2": "9.2", "tol": "0.2", "co": "250", "ratio": "0.0027", "inlet": "17"}],
    ["Vaillant", "Home System 15kW", "System", "15", "41-044-95", "15.3", "Vaillant Home System installation manual 658413", {"co2": "9.2", "tol": "0.2", "co": "250", "ratio": "0.0027", "inlet": "17"}],
    ["Vaillant", "Home System 18kW", "System", "18", "41-044-96", "18.4", "Vaillant Home System installation manual 658413", {"co2": "9.2", "tol": "0.2", "co": "250", "ratio": "0.0027", "inlet": "17"}],
    ["Vaillant", "Home System 25kW", "System", "25", "41-044-97", "25.5", "Vaillant Home System installation manual 658413", {"co2": "9.2", "tol": "0.2", "co": "250", "ratio": "0.0027", "inlet": "17"}],
    ["Vaillant", "Home Regular 12kW", "Heat only", "12", "41-044-88", "12.3", "Vaillant Home Regular -A installation manual", {"co2": "9.2", "tol": "1.0", "co": "250", "ratio": "0.0027", "inlet": "17"}],
    ["Vaillant", "Home Regular 15kW", "Heat only", "15", "41-044-89", "15.3", "Vaillant Home Regular -A installation manual", {"co2": "9.2", "tol": "1.0", "co": "250", "ratio": "0.0027", "inlet": "17"}],
    ["Vaillant", "Home Regular 18kW", "Heat only", "18", "41-044-90", "18.4", "Vaillant Home Regular -A installation manual", {"co2": "9.2", "tol": "1.0", "co": "250", "ratio": "0.0027", "inlet": "17"}],
    ["Vaillant", "Home Regular 25kW", "Heat only", "25", "41-044-92", "25.5", "Vaillant Home Regular -A installation manual", {"co2": "9.2", "tol": "1.0", "co": "250", "ratio": "0.0027", "inlet": "17"}],
    ["Vaillant", "Home Regular 30kW", "Heat only", "30", "41-044-93", "30.6", "Vaillant Home Regular -A installation manual", {"co2": "9.2", "tol": "1.0", "co": "250", "ratio": "0.0027", "inlet": "17"}],
    ["Vaillant", "ecoTEC plus Regular 12kW", "Heat only", "12", "41-044-71", "12.3", "Vaillant ecoTEC plus open vent (VU OV 5-6) installation manual", {"co2": "9.2", "tol": "1.0", "co": "250", "ratio": "0.0031", "inlet": "17"}],
    ["Vaillant", "ecoTEC plus Regular 15kW", "Heat only", "15", "41-044-72", "15.3", "Vaillant ecoTEC plus open vent (VU OV 5-6) installation manual", {"co2": "9.2", "tol": "1.0", "co": "250", "ratio": "0.0031", "inlet": "17"}],
    ["Vaillant", "ecoTEC plus Regular 18kW", "Heat only", "18", "41-044-73", "18.4", "Vaillant ecoTEC plus open vent (VU OV 5-6) installation manual", {"co2": "9.2", "tol": "1.0", "co": "250", "ratio": "0.0031", "inlet": "17"}],
    ["Vaillant", "ecoTEC plus Regular 24kW", "Heat only", "24", "41-044-74", "24.7", "Vaillant ecoTEC plus open vent (VU OV 5-6) installation manual", {"co2": "9.2", "tol": "1.0", "co": "250", "ratio": "0.0031", "inlet": "17"}],
    ["Vaillant", "ecoTEC plus Regular 30kW", "Heat only", "30", "41-044-75", "30.6", "Vaillant ecoTEC plus open vent (VU OV 5-6) installation manual", {"co2": "9.2", "tol": "1.0", "co": "250", "ratio": "0.0031", "inlet": "17"}],
    ["Vaillant", "ecoTEC plus System 10kW", "System", "10", "41-694-45", "", "Vaillant ecoTEC plus (2023 range) installation manual: gives an O2 reading, not CO2", {"co2": "", "tol": "", "co": "350", "ratio": "0.0040", "inlet": ""}],
    ["Vaillant", "ecoTEC plus System 15kW", "System", "15", "41-694-46", "", "Vaillant ecoTEC plus (2023 range) installation manual: gives an O2 reading, not CO2", {"co2": "", "tol": "", "co": "350", "ratio": "0.0040", "inlet": ""}],
    ["Vaillant", "ecoTEC plus System 20kW", "System", "20", "41-694-47", "", "Vaillant ecoTEC plus (2023 range) installation manual: gives an O2 reading, not CO2", {"co2": "", "tol": "", "co": "350", "ratio": "0.0040", "inlet": ""}],
    ["Vaillant", "ecoTEC plus System 25kW", "System", "25", "41-694-48", "", "Vaillant ecoTEC plus (2023 range) installation manual: gives an O2 reading, not CO2", {"co2": "", "tol": "", "co": "350", "ratio": "0.0040", "inlet": ""}],
    ["Vaillant", "ecoTEC plus System 30kW", "System", "30", "41-694-49", "", "Vaillant ecoTEC plus (2023 range) installation manual: gives an O2 reading, not CO2", {"co2": "", "tol": "", "co": "350", "ratio": "0.0040", "inlet": ""}],
    ["Vaillant", "ecoTEC plus System 35kW", "System", "35", "41-694-50", "", "Vaillant ecoTEC plus (2023 range) installation manual: gives an O2 reading, not CO2", {"co2": "", "tol": "", "co": "350", "ratio": "0.0040", "inlet": ""}],
    ["Vaillant", "ecoTEC plus 26kW", "Combination", "26", "47-044-92", "", "Vaillant ecoTEC plus (2023 range) installation manual: gives an O2 reading, not CO2", {"co2": "", "tol": "", "co": "350", "ratio": "0.0040", "inlet": ""}],
    ["Vaillant", "ecoTEC plus 32kW", "Combination", "32", "47-044-93", "", "Vaillant ecoTEC plus (2023 range) installation manual: gives an O2 reading, not CO2", {"co2": "", "tol": "", "co": "350", "ratio": "0.0040", "inlet": ""}],
    ["Vaillant", "ecoTEC plus 36kW", "Combination", "36", "47-044-94", "", "Vaillant ecoTEC plus (2023 range) installation manual: gives an O2 reading, not CO2", {"co2": "", "tol": "", "co": "350", "ratio": "0.0040", "inlet": ""}],
    ["Vaillant", "ecoTEC plus 40kW", "Combination", "40", "47-044-95", "", "Vaillant ecoTEC plus (2023 range) installation manual: gives an O2 reading, not CO2", {"co2": "", "tol": "", "co": "350", "ratio": "0.0040", "inlet": ""}],
    ["Baxi", "600 Combi 24kW", "Combination", "24", "47-077-55", "", "Baxi 600 Combi 2 installation manual", {"rng": 1, "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Baxi", "600 Combi 30kW", "Combination", "30", "47-077-56", "", "Baxi 600 Combi 2 installation manual", {"rng": 1, "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Baxi", "600 Combi 36kW", "Combination", "36", "47-077-57", "", "Baxi 600 Combi 2 installation manual", {"rng": 1, "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Baxi", "800 Combi 24kW", "Combination", "24", "47-077-63", "", "Baxi 800 Combi 2 installation manual", {"rng": 1, "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Baxi", "800 Combi 30kW", "Combination", "30", "47-077-64", "", "Baxi 800 Combi 2 installation manual", {"rng": 1, "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Baxi", "800 Combi 36kW", "Combination", "36", "47-077-65", "", "Baxi 800 Combi 2 installation manual", {"rng": 1, "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Baxi", "400 Combi 24kW", "Combination", "24", "", "20.6", "Baxi 400 Combi 2 installation manual", {"rng": 1, "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Baxi", "400 Combi 30kW", "Combination", "30", "", "20.6", "Baxi 400 Combi 2 installation manual", {"rng": 1, "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Baxi", "200 Combi 24kW", "Combination", "24", "", "20.6", "Baxi 200 Combi 2 installation manual", {"rng": 1, "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Baxi", "200 Combi 28kW", "Combination", "28", "", "20.6", "Baxi 200 Combi 2 installation manual", {"rng": 1, "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Baxi", "600 System 15kW", "System", "15", "41-884-01", "", "Baxi 600 System 2 installation manual", {"rng": 1, "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Baxi", "600 System 18kW", "System", "18", "41-884-02", "", "Baxi 600 System 2 installation manual", {"rng": 1, "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Baxi", "600 System 24kW", "System", "24", "41-884-03", "", "Baxi 600 System 2 installation manual", {"rng": 1, "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Baxi", "800 System 18kW", "System", "18", "41-470-99", "", "Baxi 800 System 2 installation manual", {"rng": 1, "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Baxi", "800 System 24kW", "System", "24", "41-884-09", "", "Baxi 800 System 2 installation manual", {"rng": 1, "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Baxi", "800 System 30kW", "System", "30", "41-884-08", "", "Baxi 800 System 2 installation manual", {"rng": 1, "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Vokera", "Evolve 24C", "Combination", "24", "47-364-37", "18", "Vokera evolve C installation manual", {"vk": ["9.2", "9.1", true], "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Vokera", "Evolve 28C", "Combination", "28", "47-364-38", "24", "Vokera evolve C installation manual", {"vk": ["9.0", "8.9", true], "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Vokera", "Evolve 32C", "Combination", "32", "47-364-39", "30", "Vokera evolve C installation manual", {"vk": ["9.0", "9.1", true], "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Vokera", "Evolve 36C", "Combination", "36", "47-364-40", "32", "Vokera evolve C installation manual", {"vk": ["9.0", "8.8", true], "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Vokera", "Evolve 42C", "Combination", "42", "47-364-41", "35", "Vokera evolve C installation manual", {"vk": ["9.0", "9.1", true], "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Vokera", "Evolve 18S", "System", "18", "41-094-98", "18", "Vokera evolve S installation manual", {"vk": ["9.2", "9.1", true], "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Vokera", "Evolve 24S", "System", "24", "41-094-99", "24", "Vokera evolve S installation manual", {"vk": ["9.0", "8.9", true], "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Vokera", "Evolve 30S", "System", "30", "41-364-01", "32", "Vokera evolve S installation manual", {"vk": ["9.0", "8.8", true], "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Vokera", "Evolve 35S", "System", "35", "41-364-02", "35", "Vokera evolve S installation manual", {"vk": ["9.0", "9.1", true], "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Vokera", "Unica Max 30C", "Combination", "30", "47-364-75", "25", "Vokera Unica Max installation manual", {"vk": ["9.0", "9.0", true], "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Vokera", "Unica Max 35C", "Combination", "35", "47-364-61", "32", "Vokera Unica Max installation manual", {"vk": ["9.0", "9.0", true], "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Vokera", "Unica Max 40C", "Combination", "40", "47-364-62", "32", "Vokera Unica Max installation manual", {"vk": ["9.0", "9.0", true], "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Vokera", "Vibe Max 26C", "Combination", "26", "47-364-69", "20", "Vokera Vibe Max C installation manual", {"vk": ["9.0", "9.0", false], "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Vokera", "Vibe Max 30C", "Combination", "30", "47-364-70", "25", "Vokera Vibe Max C installation manual", {"vk": ["9.0", "9.0", false], "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Vokera", "Vibe Max 20S", "System", "20", "41-364-19", "20", "Vokera Vibe Max S installation manual", {"vk": ["9.0", "9.0", false], "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Vokera", "Vibe Max 25S", "System", "25", "41-364-20", "25", "Vokera Vibe Max S installation manual", {"vk": ["9.0", "9.0", false], "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Vokera", "Easi-Heat Plus 25C", "Combination", "25", "47-364-29", "20", "Vokera Easi-Heat Plus installation manual (2017)", {"vk": ["9.0", "9.5", false], "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Vokera", "Easi-Heat Plus 29C", "Combination", "29", "47-364-30", "25", "Vokera Easi-Heat Plus installation manual (2017)", {"vk": ["9.0", "9.5", false], "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Vokera", "Easi-Heat i 25C", "Combination", "25", "47-364-71", "20", "Vokera Easi-Heat i installation manual", {"vk": ["9.0", "9.0", false], "co": "350", "ratio": "0.0040", "inlet": "18"}],
    ["Vokera", "Easi-Heat i 29C", "Combination", "29", "47-364-72", "25", "Vokera Easi-Heat i installation manual", {"vk": ["9.0", "9.0", false], "co": "350", "ratio": "0.0040", "inlet": "18"}]
  ].map(([make, name, kind, kw, gc, hi, src, g]) => {
    const o = { id: 'bt:' + norm(make).slice(0, 12) + '-' + norm(name), type: 'Boiler', make, name, kind, kw, warranty: '', src, t_gc: gc, t_flue: 'Room Sealed', t_hiMin: '', t_hi: hi, t_co: g.co, t_ratio: g.ratio, t_inlet: g.inlet };
    if (g.rng) { o.t_co2MaxF = '8.8'; o.t_co2MaxT = '9.4'; o.t_co2MinF = '8.1'; o.t_co2MinT = '8.6'; }
    else if (g.vk) { const [mx, mn, tol] = g.vk, n = Number(mx), m = Number(mn); o.t_co2Max = mx; o.t_co2Min = mn; if (tol) { o.t_co2MaxF = String(+(n - 1).toFixed(1)); o.t_co2MaxT = String(+(n + 0.6).toFixed(1)); o.t_co2MinF = String(+(m - 1).toFixed(1)); o.t_co2MinT = String(+(m + 0.6).toFixed(1)); } }
    else { o.t_co2Max = g.co2; o.t_co2Min = ''; o.t_co2Tol = g.tol; }
    return o; }));
  const keyOf = x => norm(x.make) + '|' + norm(x.name);
  /* the engineer's own boilers plus the built-in ones they do not already have figures for */
  function boilers() {
    const mine = ((typeof settings !== 'undefined' && settings.qList) || []).filter(x => x.type === 'Boiler');
    const have = new Set(mine.filter(hasFigures).map(keyOf));
    return mine.concat(BUILTIN.filter(b => !have.has(keyOf(b))).filter(b => !mine.some(m => m.id === b.id)));
  }

  /* the saved boiler that matches: GC number first, then make + model */
  function find(make, model, gc) {
    const list = boilers().filter(hasFigures);
    if (!list.length) return null;
    const g = digits(gc);
    if (g.length >= 6) { const hit = list.find(x => digits(val(x, 'gc')) === g); if (hit) return hit; }
    const m = norm(make), n = norm(model); if (n.length < 3) return null;
    return list.slice().sort((p, q) => norm(q.name).length - norm(p.name).length).find(x => {
      const xn = norm(x.name), xm = norm(x.make);
      return xn.length >= 3 && (!xm || !m || m.includes(xm) || xm.includes(m)) && n.includes(xn);
    }) || null;
  }

  /* where each reading lives on the form being shown */
  function context() {
    if (typeof ui === 'undefined' || ui.view !== 'form' || !ui.rec) return null;
    const r = ui.rec, t = typeOf(r);
    if (t === 'service') {
      const make = r.make === 'Other' ? r.makeOther : r.make;
      return { mp: 'model', make, worc: /worcester/i.test(make || ''), res: { fpValue: 'fpResult', bpValue: 'bpResult', fgCoMin: 'fgResult', fgCoMax: 'fgResult', fgCo2Min: 'fgResult', fgCo2Max: 'fgResult', fgRatioMin: 'fgResult', fgRatioMax: 'fgResult' }, boiler: find(make, r.model, r.gc), p: { model: ['model'], fan: ['fpValue'], inlet: ['bpValue'], hi: ['grValue'], co: ['fgCoMax'], coLow: ['fgCoMin'], co2Min: ['fgCo2Min'], co2Max: ['fgCo2Max'], ratio: ['fgRatioMin', 'fgRatioMax'] } };
    }
    if (t === 'gas') {
      const i = Math.min(ui.appTab || 0, (+r.applianceCount || 1) - 1), a = (r.appliances || [])[i]; if (!a) return null;
      const P = k => 'appliances.' + i + '.' + k;
      return { mp: P('model'), make: a.manufacturer, worc: /worcester/i.test(a.manufacturer || ''), boiler: find(a.manufacturer, a.model, a.gc), p: { model: [P('model')], fan: [P('fanPress')], inlet: [P('op')], hi: [P('hi')], co: [P('coMax')], coLow: [P('coMin')], co2Min: [P('co2Min')], co2Max: [P('co2Max')], ratio: [P('ratioMin'), P('ratioMax')] } };
    }
    return null;
  }

  /* is a reading inside the manufacturer's figure? true / false, or null when it cannot be judged */
  function judge(key, v, x) {
    const n = num(v); if (n === null) return null;
    const lim = k => num(val(x, k));
    if (key === 'co' || key === 'coLow' || key === 'ratio') { const l = key === 'coLow' ? (lim('coLow') !== null ? lim('coLow') : lim('co')) : lim(key); return l === null ? null : n <= l; }
    if (key === 'inlet') { const l = lim('inlet'); return l === null ? null : n >= l; }
    if (key === 'co2Max' || key === 'co2Min') {   // a range printed in the manual wins over a figure plus or minus
      const rf = lim(key + 'F'), rt = lim(key + 'T');
      if (rf !== null || rt !== null) return (rf === null || n >= rf - 1e-9) && (rt === null || n <= rt + 1e-9);
      const l = lim(key), tol = lim('co2Tol'); return l === null || tol === null ? null : n >= l - tol - 1e-9 && n <= l + tol + 1e-9; }
    if (key === 'fan') {   // the minus is assumed (3.5 and -3.5 are the same reading); ranges are the pass / fail figures saved on the boiler
      const m = Math.abs(n), R = (a, b) => { const x = lim(a), y = lim(b); return x === null || y === null ? null : [Math.min(Math.abs(x), Math.abs(y)), Math.max(Math.abs(x), Math.abs(y))]; };
      const pass = R('fanPF', 'fanPT'), fail = R('fanFF', 'fanFT'), inR = r => m >= r[0] - 1e-9 && m <= r[1] + 1e-9;
      if (pass) return inR(pass);
      if (fail) return inR(fail) ? false : null;
      const l = lim('fan'); return l === null ? null : m >= Math.abs(l) - 1e-9 && m <= 10 + 1e-9;
    }
    return null;   // heat input is shown only
  }
  const LABEL = { model: 'this boiler', fan: 'Fan pressure', inlet: 'Gas inlet working pressure', hi: 'Gas rate / heat input', co: 'CO', coLow: 'CO', co2Min: 'CO2', co2Max: 'CO2', ratio: 'CO/CO2 ratio' };
  const infoKey = k => (k === 'co2Min' || k === 'co2Max') ? 'co2' : k === 'coLow' ? 'co' : k;

  /* each line of the data sheet is tagged with the reading it belongs to, so a reading's (i) can show just what that test needs */
  function lines(x) {
    const f = k => val(x, k), out = [], tol = f('co2Tol') ? ' ( +/- ' + f('co2Tol') + ' )' : '';
    if (f('flue')) out.push(['Flue Type', f('flue'), 'model']);
    if (f('hi')) out.push(['CH Max Heat Input (Kw Net)', f('hi'), 'hi']);
    out.push(['CH Min Heat Input (Kw Net)', f('hiMin') || 'N/A', 'hi']);
    const rng = k => f(k + 'F') && f(k + 'T') ? 'Between ' + f(k + 'F') + ' and ' + f(k + 'T') : f(k + 'F') ? 'Above ' + f(k + 'F') : f(k + 'T') ? 'Up to ' + f(k + 'T') : '';
    if (rng('co2Max')) out.push(['Max CO2 %', rng('co2Max'), 'co2']); else if (f('co2Max')) out.push(['Max CO2 %', f('co2Max') + tol, 'co2']);
    if (rng('co2Min')) out.push(['Min CO2 %', rng('co2Min'), 'co2']); else if (f('co2Min')) out.push(['Min CO2 %', f('co2Min') + tol, 'co2']);
    if (f('ratio')) out.push(['Maximum Ratio', f('ratio'), 'ratio']);
    if (f('co')) out.push(['Maximum CO (ppm)' + (f('coLow') ? ' at maximum rate' : ''), f('co'), 'co']);
    if (f('coLow')) out.push(['Maximum CO (ppm) at minimum rate', f('coLow'), 'co']);
    if (f('fan')) out.push(['Fan Pressure (Pressure will read negative and be greater than) (mb)', '- ' + String(f('fan')).replace(/^[-−]\s*/, ''), 'fan']);
    if (f('inlet')) out.push(['Min Gas Inlet Working Pressure (mb)', f('inlet'), 'inlet']);
    return out;
  }

  /* put the (i) buttons beside the readings and colour them. Safe to run any number of times. */
  function paint() { if (watcher) watcher.disconnect(); try { paint1(); } finally { watch(); } }
  function paint1() {
    const c = context();
    document.querySelectorAll('.tolI').forEach(b => b.remove());
    document.querySelectorAll('.f.tolok,.f.tolbad').forEach(e => e.classList.remove('tolok', 'tolbad'));
    if (!c) return;
    if (!c.boiler) return;
    Object.keys(c.p).forEach(key => c.p[key].forEach(path => {
      const lab = document.querySelector('.f[data-f="' + path + '"]'); if (!lab) return;
      const sp = lab.querySelector('span'); if (sp) { const b = document.createElement('button'); b.type = 'button'; b.className = 'tolI'; b.setAttribute('aria-label', 'Manufacturer figures for ' + (LABEL[key] || 'this reading')); b.dataset.btk = infoKey(key); b.textContent = 'i'; sp.appendChild(b); }
      const inp = lab.querySelector('input'), j = inp && c.boiler ? judge(key, inp.value, c.boiler) : null;
      if (j === true) lab.classList.add('tolok'); else if (j === false) lab.classList.add('tolbad');
    }));
  }


  function openInfo(focus) {
    const c = context(); if (!c) return;
    const old0 = document.getElementById('btSheet'); if (old0) old0.remove();
    if (!c.boiler) return;
    const x = c.boiler, old = document.getElementById('btSheet'); if (old) old.remove();
    const all = lines(x), part = focus && focus !== 'model' ? all.filter(r => r[2] === focus) : all;
    const rows = part.map(([k, v]) => `<tr><th scope="row">${esc2(k)}</th><td>${esc2(v)}</td></tr>`).join('');
    const biz = (typeof settings !== 'undefined' && settings.businessName) || '';
    const d = document.createElement('div'); d.id = 'btSheet'; d.className = 'sheetbg';
    d.innerHTML = `<div class="sheet" role="dialog" aria-label="Manufacturer data sheet"><div class="grab"></div>
      <div class="dsheet"><div class="dshead"><span class="dskick">${focus && focus !== 'model' ? 'Manufacturer figure for this check' : 'Manufacturer data sheet · check this is the right boiler'}</span><div class="dsmake">${esc2(x.make || '')}</div><h2>${esc2(x.name || '')}</h2>${val(x, 'gc') ? `<span class="dsgc">GC ${esc2(val(x, 'gc'))}</span>` : ''}</div>
        <table class="dstable"><tbody>${rows}</tbody></table>
        <p class="dsfoot">${biz ? esc2(biz) + ' · ' : ''}Figures built into the app or saved in your Price list. Green or red on a reading is only a guide, so always check against the manufacturer's data sheet.</p></div>
      <button type="button" class="btn block" id="btX" style="margin-top:12px">Close</button></div>`;
    document.body.appendChild(d);
    d.addEventListener('click', ev => { if (ev.target === d || ev.target.id === 'btX') d.remove(); });
  }

  /* a reading outside the manufacturer's figure asks what the engineer wants to record (service form: Pass or Fail for that check) */
  const said = {};
  function outText(key, n, x) {
    const f = k => val(x, k);
    if (key === 'coLow') return 'CO reading ' + n + ' ppm is over the manufacturer\'s maximum of ' + (f('coLow') || f('co')) + ' ppm at minimum rate.';
    if (key === 'co') return 'CO reading ' + n + ' ppm is over the manufacturer\'s maximum of ' + f('co') + ' ppm.';
    if (key === 'ratio') return 'CO/CO2 ratio ' + n + ' is over the manufacturer\'s maximum of ' + f('ratio') + '.';
    if (key === 'fan') { const pf = f('fanPF') || f('fan'), pt = f('fanPT') || '10', d = v => '-' + String(v).replace(/^[-−]\s*/, ''); return 'Fan pressure ' + n + ' mb is outside the pass range of ' + d(pf) + ' to ' + d(pt) + ' mb.'; }
    if (key === 'inlet') return 'Gas inlet working pressure ' + n + ' mbar is below the manufacturer\'s minimum of ' + f('inlet') + ' mbar.';
    const k2 = key === 'co2Max' ? 'co2Max' : 'co2Min';
    if (f(k2 + 'F') || f(k2 + 'T')) return 'CO2 reading ' + n + ' % is outside the manufacturer\'s range (' + (f(k2 + 'F') && f(k2 + 'T') ? 'between ' + f(k2 + 'F') + ' and ' + f(k2 + 'T') : f(k2 + 'F') ? 'above ' + f(k2 + 'F') : 'up to ' + f(k2 + 'T')) + ' %).';
    const lim = f(k2), tol = f('co2Tol');
    return 'CO2 reading ' + n + ' % is outside the manufacturer\'s ' + lim + ' % (plus or minus ' + tol + ').';
  }
  /* fan pressure always reads negative, so a plain number typed in the fan box gets its minus put in front automatically */
  function fixFan(path, inp) {
    const c = context(); if (!c || !c.boiler || !c.p.fan.includes(path) || !inp) return;
    const v = String(inp.value).trim(); if (!/^\+?\d*[.,]?\d+$/.test(v) || num(v) === 0) return;
    const nv = '-' + v.replace(/^\+/, ''); inp.value = nv; setP(ui.rec, path, nv); ui.pdf = null; persistRecSoon();
  }
  function checkOut(path, value) {
    const c = context(); if (!c || !c.boiler) return;
    const key = Object.keys(c.p).find(k => c.p[k].includes(path)); if (!key) return;
    if (judge(key, value, c.boiler) !== false) { delete said[path]; return; }
    if (said[path] === value) return; said[path] = value;
    const res = c.res && c.res[path], old = document.getElementById('btOut'); if (old) old.remove();
    const d = document.createElement('div'); d.id = 'btOut'; d.className = 'sheetbg';
    d.innerHTML = `<div class="sheet" role="dialog" aria-label="Out of range"><div class="grab"></div><h2 style="color:var(--bad)">Out of range</h2>
      <p>${esc2(outText(key, num(value), c.boiler))}</p>
      ${res ? '<p class="small muted">Choose the result for this check. You can change it later.</p><div class="row"><button type="button" class="btn danger grow" data-bt="FAIL">Fail</button><button type="button" class="btn grow" data-bt="PASS">Pass</button></div><button type="button" class="btn ghost block" data-bt="" style="margin-top:10px">Decide later</button>'
          : '<p class="small muted">This is a guide from the manufacturer\'s figures. Check the reading again and the data sheet.</p><button type="button" class="btn block" data-bt="">OK</button>'}</div>`;
    document.body.appendChild(d);
    d.addEventListener('click', ev => {
      const b = ev.target.closest('[data-bt]');
      if (!b && ev.target !== d) return;
      if (b && b.dataset.bt && res) { setP(ui.rec, res, b.dataset.bt); ui.pdf = null; persistRecSoon(); render(); }
      d.remove();
    });
  }


  /* when the model typed on the form matches a saved boiler and the GC number is still empty, fill the GC number in */
  /* the GC number follows the model. It is replaced only while it is empty or still the number filled in automatically, so a number typed by hand is never overwritten */
  function fillGc(path) {
    if (typeof ui === 'undefined' || !ui.rec || ui.view !== 'form') return;
    const r = ui.rec, t = typeOf(r); let make, model, gcPath, holder, cur;
    if (t === 'service' && path === 'model') { make = r.make === 'Other' ? r.makeOther : r.make; model = r.model; gcPath = 'gc'; holder = r; }
    else if (t === 'gas' && /^appliances\.\d+\.model$/.test(path)) { const a = (r.appliances || [])[path.split('.')[1]]; if (!a) return; make = a.manufacturer; model = a.model; gcPath = 'appliances.' + path.split('.')[1] + '.gc'; holder = a; }
    else return;
    cur = String(holder.gc || '');
    if (cur && cur !== holder.gcAuto) return;   // typed by hand
    const x = find(make, model, ''), g = x ? val(x, 'gc') : '';
    if (g === cur) return;
    if (!g && !cur) return;
    holder.gc = g; holder.gcAuto = g; ui.pdf = null; persistRecSoon();
    const inp = document.querySelector('.f[data-f="' + gcPath + '"] input'); if (inp) inp.value = g;
    if (g && typeof toast === 'function') toast('GC number filled in');
    later();
  }

  /* the boxes shown on a boiler in the Price list */
  function editHtml(x) {
    const i = ([k, l, m]) => `<label class="f"><span>${l}</span><input data-pi="t_${k}" data-id="${x.id}" value="${esc2(x['t_' + k] || '')}" ${m ? `inputmode="${m}"` : ''} autocomplete="off"></label>`;
    const others = boilers().filter(y => y.id !== x.id && keyOf(y) !== keyOf(x) && hasFigures(y));
    const copy = others.length ? `<label class="f"><span>Copy the figures from another boiler</span><select data-btcopy="${esc2(x.id)}"><option value="">Choose a boiler to copy from…</option>${others.map(y => `<option value="${esc2(y.id)}">${esc2(((y.make || '') + ' ' + (y.name || '')).trim())}</option>`).join('')}</select><small>Copies the figures, then change whatever differs. The GC number is not copied.</small></label>` : '';
    return `<h3 style="margin:14px 0 4px">Manufacturer figures</h3><p class="small muted" style="margin:0 0 10px">Copy these from the boiler's data sheet, line by line. Once saved, every boiler works the same way: the (i) next to the model shows the full card, and each reading shows its own figure. Leave out any you don't have.</p>
      ${copy}${FIELDS.map(i).join('')}`;
  }
  document.addEventListener('change', e => {
    const sel = e.target && e.target.dataset && e.target.dataset.btcopy; if (!sel || !e.target.value) return;
    const x = (settings.qList || []).find(y => y.id === sel), from = boilers().find(y => y.id === e.target.value); if (!x || !from) return;
    FIELDS.forEach(([k]) => { if (k !== 'gc') x['t_' + k] = from['t_' + k] || ''; });
    saveSettings(); const y = window.scrollY; render(); window.scrollTo(0, y);
  });

  /* kept so older code that calls it still works: boilers are now built in, so nothing is copied into the Price list */
  function seed() {
    if (typeof settings === 'undefined' || !settings.qList) return;
    let ch = false;
    if (!settings.btSeed) { settings.btSeed = 1; ch = true; }
    /* once: a copy already in the Price list gets the built-in warranty if it has none */
    if (!settings.btWarr) { settings.btWarr = 1; ch = true; BUILTIN.forEach(b => settings.qList.forEach(x => { if (x.type === 'Boiler' && keyOf(x) === keyOf(b) && !x.warranty && b.warranty) x.warranty = b.warranty; })); }
    /* once: the Ri is a regular (heat only) boiler, so a copy saved earlier as Combination is corrected */
    if (!settings.btKind) { settings.btKind = 1; ch = true; settings.qList.forEach(x => { if (x.type === 'Boiler' && x.kind === 'Combination' && BUILTIN.some(b => keyOf(b) === keyOf(x))) x.kind = 'Heat only'; }); }
    /* each built-in boiler is added to the engineer's Price list once (so it is there for quotes too). One they already have, or delete later, is left alone. */
    const added = settings.btAdded = settings.btAdded || [];
    BUILTIN.forEach(b => {
      if (added.includes(b.id)) return;
      added.push(b.id); ch = true;
      const same = settings.qList.find(x => x.type === 'Boiler' && keyOf(x) === keyOf(b));
      if (same) { if (!hasFigures(same)) FIELDS.forEach(([k]) => { same['t_' + k] = b['t_' + k] || ''; }); if (!same.kind) same.kind = b.kind; if (!same.kw) same.kw = b.kw; if (!same.warranty) same.warranty = b.warranty || ''; return; }
      const c = Object.assign({}, b, { id: QUO.newId() }); delete c.src; settings.qList.push(c);
    });
    if (ch) saveSettings();
  }


  /* typing in the model box suggests boilers from the Price list; tapping one fills the model (and the GC number if it is empty) */
  const modelPath = path => { const r = ui.rec; if (!r || ui.view !== 'form') return false; const t = typeOf(r); return (t === 'service' && path === 'model') || (t === 'gas' && /^appliances\.\d+\.model$/.test(path)); };
  function suggest(inp) {
    const path = inp.dataset.k, lab = inp.closest('.f'); if (!lab) return;
    let box = document.getElementById('btSug'); if (box) box.remove();
    const toks = norm(inp.value) ? String(inp.value).toLowerCase().split(/\s+/).map(norm).filter(Boolean) : [];
    if (!toks.length) return;
    const r = ui.rec, mk = norm(typeOf(r) === 'service' ? (r.make === 'Other' ? r.makeOther : r.make) : ((r.appliances || [])[+path.split('.')[1]] || {}).manufacturer);
    const gcQ = /^[\d\s\-]+$/.test(String(inp.value).trim()) && digits(inp.value).length >= 4 ? digits(inp.value) : '';   // a GC number typed in the model box
    const hits = gcQ ? boilers().filter(x => x.name && digits(val(x, 'gc')).includes(gcQ)).slice(0, 6) : boilers().filter(x => x.name && (!mk || !norm(x.make) || norm(x.make).includes(mk) || mk.includes(norm(x.make))) && toks.every(t => norm((x.make || '') + ' ' + x.name).includes(t))).slice(0, 6);
    if (!hits.length || (hits.length === 1 && norm(hits[0].name) === norm(inp.value))) return;
    box = document.createElement('div'); box.id = 'btSug'; box.style.margin = '-4px 0 12px';
    box.innerHTML = hits.map(x => `<button type="button" class="item cpick" data-bts="${esc2(x.id)}"><div class="t">${esc2(x.name)}</div><div class="s">${esc2([x.make, x.kind, x.t_gc ? 'GC ' + x.t_gc : ''].filter(Boolean).join(' · '))}</div></button>`).join('');
    lab.after(box);
    box.addEventListener('click', ev => {
      const b = ev.target.closest('[data-bts]'); if (!b) return;
      const x = boilers().find(y => y.id === b.dataset.bts); if (!x) return;
      if (gcQ) {   // found by GC number: take the right make and GC number as well, even if a different make was chosen
        const rr = ui.rec, hold = typeOf(rr) === 'service' ? rr : (rr.appliances || [])[+path.split('.')[1]];
        if (typeOf(rr) === 'service') { if (SVC.MAKE.includes(x.make)) { rr.make = x.make; rr.makeOther = ''; } else { rr.make = 'Other'; rr.makeOther = x.make || ''; } }
        else if (hold) hold.manufacturer = x.make || '';
        setP(rr, path, x.name); if (hold) { hold.gc = val(x, 'gc'); hold.gcAuto = hold.gc; }
        ui.pdf = null; persistRecSoon(); box.remove(); render(); toast('Make, model and GC number filled in'); later(); return;
      }
      setP(ui.rec, path, x.name); inp.value = x.name; ui.pdf = null; persistRecSoon(); box.remove();
      fillGc(path); later();
    });
  }
  document.addEventListener('input', e => { const t = e.target; if (t && t.tagName === 'INPUT' && t.dataset && t.dataset.k && modelPath(t.dataset.k)) suggest(t); });

  let timer = 0; const later = () => { clearTimeout(timer); timer = setTimeout(paint, 30); };
  /* watch the screen for redraws; stop watching while painting, or painting itself would trigger another paint, forever, and the buttons would be rebuilt under a finger */
  let watcher = null;
  const watch = () => { const v = document.getElementById('view'); if (v && watcher) watcher.observe(v, { childList: true, subtree: true }); };
  const start = () => { watcher = new MutationObserver(later); watch(); later(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  document.addEventListener('change', e => { const t = e.target; if (t && t.dataset && t.dataset.k && t.tagName === 'INPUT') setTimeout(() => { fillGc(t.dataset.k); fixFan(t.dataset.k, t); checkOut(t.dataset.k, t.value); }, 60); });
  document.addEventListener('input', e => { if (e.target && e.target.dataset && e.target.dataset.k) later(); });
  /* the (i) sits inside a box's label, so a tap would also focus the box and open the keyboard, which can swallow the tap: stop that, and open on touch-end as well as click */
  let touched = 0;
  const tapInfo = e => { const b = e.target.closest && e.target.closest('.tolI'); if (!b) return; e.preventDefault(); e.stopPropagation();
    if (e.type === 'click' && Date.now() - touched < 600) return;   // the click that follows a touch we already handled
    if (e.type === 'touchend') touched = Date.now();
    openInfo(b.dataset.btk); };
  document.addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('.tolI')) e.preventDefault(); }, true);
  document.addEventListener('touchend', tapInfo, true);
  document.addEventListener('click', tapInfo, true);
  return { find, judge, paint, editHtml, seed, FIELDS, BUILTIN };
})();
