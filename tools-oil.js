/* Oil tools: tank volume and bund check, burner firing rate, combustion efficiency, fuel use and running cost,
   oil supply pipe sizing, ventilation sizing. Quick guides for the van. They make no certificate and do not replace
   BS 5410-1, OFTEC Technical Books or Approved Document J. Constants are shown on screen so they can be checked. */
const OT_TOOLS = [['tank', 'Tank volume and bund check'], ['fire', 'Burner firing rate'], ['eff', 'Combustion efficiency check'], ['fuel', 'Fuel use and running cost'], ['opipe', 'Oil supply pipe sizing'], ['vent', 'Ventilation sizing']];
const OT_IDS = OT_TOOLS.map(x => x[0]);
const OT_FUELS = { kero: ['Kerosene (28 sec)', 10.3, 800, 1.6], gas: ['Gas oil (35 sec)', 10.7, 850, 4.7], hvo: ['HVO', 10.2, 780, 3.5] };   // gross kWh per litre, kg/m3, viscosity mPa.s (cool)
const OT_GROSS_NET = 1.07;
const OT_DEFAULT = () => ({
  tank: { shape: 'rect', orient: 'h', l: '', w: '', h: '', d: '', bl: '', bw: '', bh: '', bund: '' },
  fire: { nozzle: '', unit: 'bar', p: '10', fuel: 'kero', cv: '' },
  eff: { co2: '', tf: '', ta: '20' },
  fuel: { kw: '', hrs: '', old: '70', neu: '90', price: '', fuel: 'kero', cv: '' },
  opipe: { sys: 'single', pos: 'above', ht: '0.5', len: '', kw: '', pump: '40', fuel: 'kero' },
  vent: { kw: '', flue: 'open', stab: 'no', base: '550', stabmm: '300', free: '5' }
});
const otS = () => { if (!TL.ot) TL.ot = OT_DEFAULT(); const d = OT_DEFAULT(); Object.keys(d).forEach(k => { TL.ot[k] = Object.assign({}, d[k], TL.ot[k] || {}); }); return TL.ot; };
const otCv = (o) => tlNum(o.cv) > 0 ? tlNum(o.cv) : OT_FUELS[o.fuel || 'kero'][1];
const otInp = (path, label, ph, val, mode = 'decimal') => `<div class="grow f"><span>${label}</span><input data-tl-in="ot.${path}" type="text" inputmode="${mode}" value="${esc(val)}" ${ph ? `placeholder="${ph}"` : ''} autocomplete="off"></div>`;
const otSel = (path, label, val, opts) => `<label class="grow f"><span>${label}</span><select data-tl-sel="ot.${path}">${opts.map(([k, l]) => `<option value="${k}" ${k === val ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
const otFuelSel = (tool, o) => otSel(tool + '.fuel', 'Fuel', o.fuel, Object.keys(OT_FUELS).map(k => [k, OT_FUELS[k][0]]));
const otRow = (l, v, big) => `<div class="row sp" style="margin-bottom:6px"><span ${big ? '' : 'class="muted"'}>${l}</span>${big ? `<b>${v}</b>` : `<span>${v}</span>`}</div>`;
const otHint = '<p class="small muted">A guide only, not a certificate. Check the figures against the standard and the manufacturer’s instructions.</p>';

/* ---- 1. tank volume and bund ---- */
function otTank() {
  const t = otS().tank, mm = k => tlNum(t[k]);
  let L = null, shape;
  if (t.shape === 'rect') { if (mm('l') > 0 && mm('w') > 0 && mm('h') > 0) L = mm('l') * mm('w') * mm('h') / 1e6; shape = 'L × W × H'; }
  else { const len = t.orient === 'h' ? mm('l') : mm('h'); if (mm('d') > 0 && len > 0) L = Math.PI / 4 * mm('d') * mm('d') * len / 1e6; shape = 'π ÷ 4 × D² × ' + (t.orient === 'h' ? 'length' : 'height'); }
  if (L === null) return null;
  let B = null, bshape = '';
  if (tlNum(t.bund) > 0) { B = tlNum(t.bund); bshape = 'entered'; }
  else if (mm('bl') > 0 && mm('bw') > 0 && mm('bh') > 0) { B = mm('bl') * mm('bw') * mm('bh') / 1e6; bshape = 'L × W × H'; }
  const need = L * 1.1;
  return { L, shape, B, bshape, need, ok: B === null ? null : B >= need, short: B === null ? null : need - B };
}
function otTankRes() {
  const c = otTank(); if (!c) return '<p class="muted">Enter the tank dimensions.</p>';
  return otRow('Tank capacity', tlFmt(c.L, 0) + ' litres', 1) + otRow('Bund must hold at least (110%)', tlFmt(c.need, 0) + ' litres', 1) +
    (c.B === null ? '<p class="muted small">Enter the bund size, or its capacity if it is marked on the tank, to check it.</p>' :
      otRow('Bund holds', tlFmt(c.B, 0) + ' litres') + `<div class="tlrow ${c.ok ? 'ok' : 'no'}"><b>${c.ok ? '&#10003; Bund is big enough' : '&#10007; Bund is too small'}</b> ${c.ok ? '' : 'by ' + tlFmt(c.short, 0) + ' litres'}</div>`) +
    (TL.work ? wk('Workings', [`Tank = ${c.shape} = <b>${w2(c.L, 0)} litres</b> (mm × mm × mm ÷ 1,000,000)`, `110% × ${w2(c.L, 0)} = <b>${w2(c.need, 0)} litres</b>`, c.B !== null ? `Bund = ${c.bshape} = ${w2(c.B, 0)} litres` : '']) : '');
}
function otTankView() {
  const t = otS().tank, rect = t.shape === 'rect';
  return `<h1>Tank volume and bund check</h1><p class="small muted" style="margin-top:0">Measure the inside of the tank in mm. The bund has to hold at least 110% of the tank’s capacity.</p><div class="card">
    <div class="row">${otSel('tank.shape', 'Tank shape', t.shape, [['rect', 'Rectangular'], ['cyl', 'Cylindrical']])}${rect ? '' : otSel('tank.orient', 'Lying or standing', t.orient, [['h', 'Lying on its side'], ['v', 'Standing upright']])}</div>
    ${rect ? `<div class="row">${otInp('tank.l', 'Length (mm)', '', t.l)}${otInp('tank.w', 'Width (mm)', '', t.w)}${otInp('tank.h', 'Height (mm)', '', t.h)}</div>` :
      `<div class="row">${otInp('tank.d', 'Diameter (mm)', '', t.d)}${t.orient === 'h' ? otInp('tank.l', 'Length (mm)', '', t.l) : otInp('tank.h', 'Height (mm)', '', t.h)}</div>`}
    <div class="small muted" style="margin:6px 0">Bund (inside measurements, to the top of the wall):</div>
    <div class="row">${otInp('tank.bl', 'Length (mm)', '', t.bl)}${otInp('tank.bw', 'Width (mm)', '', t.bw)}${otInp('tank.bh', 'Depth (mm)', '', t.bh)}</div>
    <div class="row">${otInp('tank.bund', 'Or bund capacity from the label (litres)', 'Leave blank to use sizes', t.bund)}</div></div>
    <h2>Result</h2><div class="card" id="tlOtRes">${otTankRes()}</div>${workBtn()}
    <p class="small muted">No allowance is made for the tank standing in the bund, which is on the safe side. For a bund that is not rectangular, enter its capacity in litres. Check against OFTEC guidance and BS 5410-1 (the usual rule is 110% of the tank capacity).</p>`;
}

/* ---- 2. burner firing rate ---- */
function otFire() {
  const f = otS().fire, g = tlNum(f.nozzle), p = tlNum(f.p); if (!(g > 0) || !(p > 0)) return null;
  const bar = f.unit === 'psi' ? p * 0.0689476 : p, ref = 100 * 0.0689476, us = g * Math.sqrt(bar / ref), lh = us * 3.78541, cv = otCv(f), gross = lh * cv;
  return { g, bar, ref, us, lh, cv, gross, net: gross / OT_GROSS_NET };
}
function otFireRes() {
  const c = otFire(); if (!c) return '<p class="muted">Enter the nozzle size and the pump pressure.</p>';
  return otRow('Fuel flow', tlFmt(c.lh, 2) + ' litres/hour', 1) + otRow('Heat input, gross', tlFmt(c.gross, 1) + ' kW', 1) + otRow('Heat input, net', tlFmt(c.net, 1) + ' kW') +
    (TL.work ? wk('Workings', [`Nozzles are rated at 100 psi (${w2(c.ref, 2)} bar)`, `Flow at ${w2(c.bar, 1)} bar = ${w2(c.g, 2)} × √(${w2(c.bar, 1)} ÷ ${w2(c.ref, 2)}) = <b>${w2(c.us, 3)} US gal/h</b>`, `${w2(c.us, 3)} × 3.78541 = <b>${w2(c.lh, 2)} litres/h</b>`, `Gross input = ${w2(c.lh, 2)} × ${c.cv} kWh/litre = <b>${w2(c.gross, 1)} kW</b>`, `Net input = ${w2(c.gross, 1)} ÷ ${OT_GROSS_NET} = <b>${w2(c.net, 1)} kW</b>`]) : '');
}
function otFireView() {
  const f = otS().fire;
  return `<h1>Burner firing rate</h1><p class="small muted" style="margin-top:0">Nozzle size is the US gallons per hour stamped on the nozzle (for example 0.60). Read the pump pressure from the gauge.</p><div class="card">
    <div class="row">${otInp('fire.nozzle', 'Nozzle size (US gal/h)', 'e.g. 0.60', f.nozzle)}${otInp('fire.p', 'Pump pressure', '', f.p)}${otSel('fire.unit', 'Unit', f.unit, [['bar', 'bar'], ['psi', 'psi']])}</div>
    <div class="row">${otFuelSel('fire', f)}${otInp('fire.cv', 'kWh per litre (gross)', String(OT_FUELS[f.fuel][1]), f.cv)}</div></div>
    <h2>Result</h2><div class="card" id="tlOtRes">${otFireRes()}</div>${workBtn()}
    <p class="small muted">Flow changes with the square root of pressure from the nozzle’s rated flow at 100 psi (7 bar). The calorific values are typical figures, so change the box if your supplier gives another. Check against the boiler’s data plate.</p>`;
}

/* ---- 3. combustion efficiency (Siegert) ---- */
function otEff() {
  const e = otS().eff, co2 = tlNum(e.co2), tf = tlNum(e.tf), ta = tlNum(e.ta); if (!(co2 > 0) || tf === null || ta === null) return null;
  const A = 0.68, B = 0.007, dT = tf - ta, loss = dT * (A / co2 + B), net = 100 - loss;
  return { co2, tf, ta, dT, loss, net, gross: net / OT_GROSS_NET, bad: co2 > 16 || co2 < 5 || dT <= 0 };
}
function otEffRes() {
  const c = otEff(); if (!c) return '<p class="muted">Enter the CO₂, the flue gas temperature and the room temperature.</p>';
  return (c.bad ? '<div class="notice err">Check the readings: CO₂ should be about 5 to 16% for oil, and the flue must be hotter than the room.</div>' : '') +
    otRow('Net efficiency', tlFmt(c.net, 1) + '%', 1) + otRow('Gross efficiency (approx.)', tlFmt(c.gross, 1) + '%') + otRow('Flue gas loss', tlFmt(c.loss, 1) + '%') + otRow('Net temperature (flue − room)', tlFmt(c.dT, 0) + '°C') +
    (TL.work ? wk('Workings', [`Net temperature = ${c.tf} − ${c.ta} = ${w2(c.dT, 0)}°C`, `Flue loss = ${w2(c.dT, 0)} × (0.68 ÷ ${c.co2} + 0.007) = <b>${w2(c.loss, 1)}%</b> (Siegert formula, heating oil)`, `Net efficiency = 100 − ${w2(c.loss, 1)} = <b>${w2(c.net, 1)}%</b>`, `Gross ≈ ${w2(c.net, 1)} ÷ ${OT_GROSS_NET} = ${w2(c.gross, 1)}%`]) : '');
}
function otEffView() {
  const e = otS().eff;
  return `<h1>Combustion efficiency check</h1><p class="small muted" style="margin-top:0">A cross-check on the analyser’s reading, using the Siegert formula for heating oil.</p><div class="card">
    <div class="row">${otInp('eff.co2', 'CO₂ (%)', 'e.g. 11.5', e.co2)}${otInp('eff.tf', 'Flue gas temp (°C)', 'e.g. 180', e.tf)}${otInp('eff.ta', 'Room temp (°C)', '', e.ta)}</div></div>
    <h2>Result</h2><div class="card" id="tlOtRes">${otEffRes()}</div>${workBtn()}
    <p class="small muted">Losses from the flue gas only, so it is a check not a replacement for the analyser. It does not suit condensing boilers, where the water vapour gives back extra heat. Gross is worked out from net by dividing by ${OT_GROSS_NET}.</p>`;
}

/* ---- 4. fuel use and running cost ---- */
function otFuel() {
  const f = otS().fuel, kw = tlNum(f.kw), hrs = tlNum(f.hrs), o = tlNum(f.old), n = tlNum(f.neu), pr = tlNum(f.price); if (!(kw > 0) || !(hrs > 0) || !(o > 0)) return null;
  const cv = otCv(f), heat = kw * hrs, lOld = heat / (o / 100) / cv, lNew = n > 0 ? heat / (n / 100) / cv : null, cOld = pr > 0 ? lOld * pr / 100 : null, cNew = pr > 0 && lNew !== null ? lNew * pr / 100 : null;
  return { kw, hrs, heat, o, n, pr, cv, lOld, lNew, cOld, cNew, saveL: lNew !== null ? lOld - lNew : null, saveC: cOld !== null && cNew !== null ? cOld - cNew : null };
}
function otFuelRes() {
  const c = otFuel(); if (!c) return '<p class="muted">Enter the boiler output, the hours of use and the old boiler efficiency.</p>';
  const gbp = n => '£' + Math.round(n).toLocaleString('en-GB');
  return otRow('Heat needed', tlFmt(c.heat, 0) + ' kWh') +
    otRow('Old boiler uses', tlFmt(c.lOld, 0) + ' litres' + (c.cOld !== null ? ' (' + gbp(c.cOld) + ')' : ''), 1) +
    (c.lNew !== null ? otRow('New boiler uses', tlFmt(c.lNew, 0) + ' litres' + (c.cNew !== null ? ' (' + gbp(c.cNew) + ')' : ''), 1) + otRow('Saving', tlFmt(c.saveL, 0) + ' litres' + (c.saveC !== null ? ' (' + gbp(c.saveC) + ')' : ''), 1) : '') +
    (TL.work ? wk('Workings', [`Heat = ${c.kw} kW × ${c.hrs} h = ${w2(c.heat, 0)} kWh`, `Old: ${w2(c.heat, 0)} ÷ ${c.o}% ÷ ${c.cv} kWh/litre = <b>${w2(c.lOld, 0)} litres</b>`, c.lNew !== null ? `New: ${w2(c.heat, 0)} ÷ ${c.n}% ÷ ${c.cv} = <b>${w2(c.lNew, 0)} litres</b>` : '', c.pr > 0 ? `Cost = litres × ${c.pr}p ÷ 100` : '']) : '');
}
function otFuelView() {
  const f = otS().fuel;
  return `<h1>Fuel use and running cost</h1><p class="small muted" style="margin-top:0">Compare an old boiler with a replacement. Enter the heat the house needs over the year: boiler output in kW and the hours it runs at that output.</p><div class="card">
    <div class="row">${otInp('fuel.kw', 'Boiler output (kW)', 'e.g. 20', f.kw)}${otInp('fuel.hrs', 'Hours of use', 'e.g. 1000', f.hrs)}</div>
    <div class="row">${otInp('fuel.old', 'Old boiler efficiency (gross %)', '', f.old)}${otInp('fuel.neu', 'New boiler efficiency (gross %)', '', f.neu)}</div>
    <div class="row">${otInp('fuel.price', 'Price per litre (pence)', 'e.g. 60', f.price)}${otFuelSel('fuel', f)}</div>
    <div class="row">${otInp('fuel.cv', 'kWh per litre (gross)', String(OT_FUELS[f.fuel][1]), f.cv)}</div></div>
    <h2>Result</h2><div class="card" id="tlOtRes">${otFuelRes()}</div>${workBtn()}
    <p class="small muted">Hours of use means hours at full output, so work it out from the heat loss or last year’s fuel use for a fair figure. Efficiencies are gross, the same basis as the calorific value. An estimate only.</p>`;
}

/* ---- 5. oil supply pipe sizing (worked out from the flow, not an OFTEC table) ---- */
const OT_PIPES = [['8 mm', 8], ['10 mm', 10], ['12 mm', 12]];   // outside diameter, copper, bore taken as OD − 2 mm
function otPipe() {
  const o = otS().opipe, kw = tlNum(o.kw), len = tlNum(o.len), ht = tlNum(o.ht) || 0; if (!(kw > 0) || !(len > 0)) return null;
  const fu = OT_FUELS[o.fuel], cv = fu[1], rho = fu[2], mu = fu[3] / 1000, burner = kw / cv, pump = tlNum(o.pump) || 40, flow = o.sys === 'single' ? burner : Math.max(pump, burner);
  const head = (o.pos === 'above' ? 1 : -1) * rho * 9.81 * ht, avail = 40000 + head, Q = flow / 1000 / 3600, FIT = 0.8;
  const rows = OT_PIPES.map(([n, od]) => { const d = (od - 2) / 1000, dpm = 128 * mu * Q / (Math.PI * Math.pow(d, 4)), maxL = avail > 0 ? avail / dpm * FIT : 0; return { n, d: d * 1000, dpm, maxL, ok: maxL >= len }; });
  return { kw, len, burner, flow, avail, head, rows, best: rows.find(r => r.ok), FIT, mu: fu[3], rho, o };
}
function otPipeRes() {
  const c = otPipe(); if (!c) return '<p class="muted">Enter the heat input and the pipe length.</p>';
  return otRow(c.o.sys === 'single' ? 'Fuel flow (burner)' : 'Flow in supply pipe (pump)', tlFmt(c.flow, 1) + ' litres/hour', 1) +
    c.rows.map(r => `<div class="tlrow ${r.ok ? 'ok' : 'no'} ${c.best === r ? 'best' : ''}"><div class="row sp"><b>${r.n} copper</b><span>${r.ok ? '&#10003; long enough' : '&#10007; run too long'}</span></div><div class="small muted">Longest run about ${r.maxL >= 1000 ? 'over 1000' : tlFmt(r.maxL, 0)} m (bore ${tlFmt(r.d, 0)} mm) · your run ${tlFmt(c.len, 1)} m</div></div>`).join('') +
    `<p class="small" style="margin:10px 0 0"><b>${c.best ? 'Smallest pipe that works: ' + c.best.n : 'None of these is long enough: use a larger pipe or move the tank.'}</b></p>` +
    (TL.work ? wk('Workings', [`Flow = ${c.o.sys === 'single' ? w2(c.kw, 1) + ' kW ÷ ' + OT_FUELS[c.o.fuel][1] + ' kWh/litre' : 'pump flow'} = <b>${w2(c.flow, 1)} litres/h</b>`, `Pump can pull 0.4 bar (40,000 Pa). Tank ${c.o.pos === 'above' ? 'above: adds' : 'below: takes off'} ${w2(Math.abs(c.head), 0)} Pa. Pressure available = <b>${w2(c.avail, 0)} Pa</b>`, `Drop per metre = 128 × ${c.mu} mPa·s × flow ÷ (π × bore⁴)`, `Longest run = pressure available ÷ drop per metre × ${c.FIT} (20% kept back for fittings and valves)`]) : '');
}
function otPipeView() {
  const o = otS().opipe;
  return `<h1>Oil supply pipe sizing</h1><p class="small muted" style="margin-top:0">How long a copper oil line can be, for the flow and the height of the tank.</p><div class="card">
    <div class="row">${otSel('opipe.sys', 'System', o.sys, [['single', 'Single pipe'], ['two', 'Two pipe']])}${otFuelSel('opipe', o)}</div>
    <div class="row">${otSel('opipe.pos', 'Tank is', o.pos, [['above', 'Above the burner pump'], ['below', 'Below the burner pump']])}${otInp('opipe.ht', 'Height difference (m)', 'e.g. 0.5', o.ht)}</div>
    <div class="row">${otInp('opipe.kw', 'Burner heat input (kW)', 'e.g. 24', o.kw)}${otInp('opipe.len', 'Pipe length (m)', 'e.g. 15', o.len)}</div>
    ${o.sys === 'two' ? `<div class="row">${otInp('opipe.pump', 'Pump flow (litres/hour)', '40', o.pump)}</div>` : ''}</div>
    <h2>Result</h2><div class="card" id="tlOtRes">${otPipeRes()}</div>${workBtn()}
    <p class="small muted"><b>Worked out from the fluid flow, not read from the OFTEC table.</b> It assumes copper with a bore 2 mm under the outside size, a pump that can pull 0.4 bar, and cool fuel. Always check against OFTEC Technical Book 3 and the pump maker’s limits before fitting. On short domestic runs the pressure loss is small, so the limits that matter are usually the pump maker’s and OFTEC’s maximum run and lift. A two-pipe line carries the pump’s full flow, so enter it from the pump data.</p>`;
}

/* ---- 6. ventilation sizing ---- */
function otVent() {
  const v = otS().vent, kw = tlNum(v.kw); if (!(kw > 0)) return null;
  if (v.flue === 'sealed') return { kw, sealed: true };
  const base = tlNum(v.base) || 0, st = v.stab === 'yes' ? (tlNum(v.stabmm) || 0) : 0, free = tlNum(v.free) || 0, over = Math.max(0, kw - free), area = over * base + (v.stab === 'yes' ? kw * st : 0);
  return { kw, base, st, free, over, area, v };
}
function otVentRes() {
  const c = otVent(); if (!c) return '<p class="muted">Enter the boiler output.</p>';
  if (c.sealed) return '<div class="tlrow ok"><b>Room-sealed boiler: no permanent air vent is needed for combustion.</b></div><p class="small muted">If it sits in a cupboard or compartment, the vents there are for cooling and are set by the maker’s instructions.</p>';
  return otRow('Free air opening needed', tlFmt(c.area, 0) + ' mm² (' + tlFmt(c.area / 100, 0) + ' cm²)', 1) +
    (TL.work ? wk('Workings', [`Output above ${c.free} kW = ${w2(c.kw, 1)} − ${c.free} = ${w2(c.over, 1)} kW`, `${w2(c.over, 1)} × ${c.base} mm²/kW = ${w2(c.over * c.base, 0)} mm²`, c.st ? `Draught stabiliser: ${w2(c.kw, 1)} × ${c.st} = ${w2(c.kw * c.st, 0)} mm²` : '', `Total = <b>${w2(c.area, 0)} mm²</b>`]) : '');
}
function otVentView() {
  const v = otS().vent;
  return `<h1>Ventilation sizing</h1><p class="small muted" style="margin-top:0">Free air opening for an oil boiler in a room, from its rated output.</p><div class="card">
    <div class="row">${otInp('vent.kw', 'Boiler output (kW)', 'e.g. 21', v.kw)}${otSel('vent.flue', 'Flue type', v.flue, [['open', 'Open flue (conventional)'], ['sealed', 'Room-sealed (balanced or pressure jet flue)']])}</div>
    ${v.flue === 'open' ? `<div class="row">${otSel('vent.stab', 'Flue draught stabiliser', v.stab, [['no', 'No'], ['yes', 'Yes, fitted']])}</div>
    <div class="row">${otInp('vent.base', 'mm² per kW', '', v.base)}${otInp('vent.free', 'First kW with no vent', '', v.free)}${v.stab === 'yes' ? otInp('vent.stabmm', 'Stabiliser extra, mm² per kW', '', v.stabmm) : ''}</div>` : ''}</div>
    <h2>Result</h2><div class="card" id="tlOtRes">${otVentRes()}</div>${workBtn()}
    <p class="small muted"><b>Check the figures in the boxes against Approved Document J and BS 5410-1.</b> They are filled in with the usual values (550 mm² for each kW above 5 kW, plus 300 mm² per kW with a draught stabiliser) but are not read from the standard here, so change them if your copy says different. For a compartment, add the cooling vents the maker asks for.</p>`;
}

/* ---- wiring ---- */
const OT_VIEW = { tank: otTankView, fire: otFireView, eff: otEffView, fuel: otFuelView, opipe: otPipeView, vent: otVentView };
const OT_RES = { tank: otTankRes, fire: otFireRes, eff: otEffRes, fuel: otFuelRes, opipe: otPipeRes, vent: otVentRes };
function otSections() {
  const out = [], f = (n, d = 1) => tlFmt(n, d), s = otS();
  if (!TL.used) return out;
  const add = (id, title, rows, bold, note) => out.push({ id, title, items: [{ t: 'kv', rows, bold }, { t: 'note', text: note }] });
  const t = TL.used.otank && otTank(); if (t) add('otank', 'Oil tank volume and bund', [['Tank capacity', f(t.L, 0) + ' litres'], ['Bund must hold (110%)', f(t.need, 0) + ' litres'], ['Bund holds', t.B === null ? 'Not entered' : f(t.B, 0) + ' litres'], ['Result', t.ok === null ? '-' : t.ok ? 'Bund is big enough' : 'Bund too small by ' + f(t.short, 0) + ' litres']], ['Result'], 'Internal measurements. No allowance for the tank standing in the bund.');
  const fi = TL.used.ofire && otFire(); if (fi) add('ofire', 'Burner firing rate', [['Nozzle', fi.g + ' US gal/h at 100 psi'], ['Pump pressure', f(fi.bar, 1) + ' bar'], ['Fuel flow', f(fi.lh, 2) + ' litres/hour'], ['Heat input, gross', f(fi.gross, 1) + ' kW'], ['Heat input, net', f(fi.net, 1) + ' kW']], ['Heat input, gross'], 'Flow scales with the square root of pressure. Typical calorific value ' + fi.cv + ' kWh/litre gross.');
  const ef = TL.used.oeff && otEff(); if (ef) add('oeff', 'Combustion efficiency check', [['CO2', ef.co2 + '%'], ['Flue gas temperature', ef.tf + '°C'], ['Room temperature', ef.ta + '°C'], ['Flue loss', f(ef.loss, 1) + '%'], ['Net efficiency', f(ef.net, 1) + '%'], ['Gross efficiency (approx.)', f(ef.gross, 1) + '%']], ['Net efficiency'], 'Siegert formula for heating oil. A cross-check only, not for condensing boilers.');
  const fu = TL.used.ofuel && otFuel(); if (fu) add('ofuel', 'Fuel use and running cost', [['Heat needed', f(fu.heat, 0) + ' kWh (' + fu.kw + ' kW × ' + fu.hrs + ' h)'], ['Old boiler', fu.o + '% : ' + f(fu.lOld, 0) + ' litres' + (fu.cOld !== null ? ', £' + f(fu.cOld, 0, 0) : '')], ['New boiler', fu.lNew === null ? '-' : fu.n + '% : ' + f(fu.lNew, 0) + ' litres' + (fu.cNew !== null ? ', £' + f(fu.cNew, 0, 0) : '')], ['Saving', fu.saveL === null ? '-' : f(fu.saveL, 0) + ' litres' + (fu.saveC !== null ? ', £' + f(fu.saveC, 0, 0) : '')]], ['Saving'], 'An estimate. Price used: ' + (fu.pr || '-') + 'p per litre.');
  const pi = TL.used.opipe && otPipe(); if (pi) add('opipe', 'Oil supply pipe sizing', [['System', pi.o.sys === 'single' ? 'Single pipe' : 'Two pipe'], ['Flow', f(pi.flow, 1) + ' litres/hour'], ['Run', f(pi.len, 1) + ' m'], ['Smallest pipe that works', pi.best ? pi.best.n + ' copper' : 'None of the sizes listed']], ['Smallest pipe that works'], 'Worked out from the fluid flow, not read from the OFTEC table. Check against OFTEC Technical Book 3.');
  const ve = TL.used.ovent && otVent(); if (ve) add('ovent', 'Ventilation sizing', ve.sealed ? [['Boiler output', f(ve.kw, 1) + ' kW'], ['Flue', 'Room-sealed: no combustion air vent needed']] : [['Boiler output', f(ve.kw, 1) + ' kW'], ['Free air opening needed', f(ve.area, 0) + ' mm²']], ['Free air opening needed'], 'Check against Approved Document J and BS 5410-1.');
  return out;
}
