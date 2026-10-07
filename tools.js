/* Tools: gas rate (timed meter test), gas pipe sizing, and room-by-room heat loss with radiator sizing at any flow/return temperature.
   These are quick guides for the van. They do not make a certificate and are not a substitute for BS 6891 / IGEM/UP/2 tables or a full heat loss survey. */
const TL_KEY = 'omb_tools';
const TL_DEFAULT = () => ({
  prop: { same: false, name: '', addr: '', phone: '', email: '', cid: '' }, pulled: {}, note: {}, used: {},
  pipe: { kw: '24', basis: 'net', len: '6', dp: '1', f: { b90: '2', e90: '0', b45: '0', tin: '0', tout: '0' } },
  iv: { gas: 'ng', meter: 'u6', mvol: '', runs: [{ pipe: 'cu15', len: '', v: '' }] },
  heat: { outside: '-3', sys: 'cond', flow: '70', ret: '50', room: '', factor: '1.5', rooms: [] }
});
let TL = (() => { try { const o = JSON.parse(localStorage.getItem(TL_KEY)); if (o && o.pipe && o.heat) { const d = TL_DEFAULT(); if (!o.iv) o.iv = d.iv; if (!o.prop) o.prop = d.prop; if (!o.pulled) o.pulled = {}; if (!o.note) o.note = {}; if (!o.used) o.used = {}; return o; } } catch (e) { } return TL_DEFAULT(); })();
const tlUse = () => { try { return JSON.parse(localStorage.getItem('omb_tooluse')) || {}; } catch (e) { return {}; } };
const tlCount = k => { try { const u = tlUse(); u[k] = (u[k] || 0) + 1; localStorage.setItem('omb_tooluse', JSON.stringify(u)); } catch (e) { } };
const tlFav = () => { try { return JSON.parse(localStorage.getItem('omb_toolfav')) || {}; } catch (e) { return {}; } };
const tlSave = () => { try { localStorage.setItem(TL_KEY, JSON.stringify(TL)); } catch (e) { } };
const tlNum = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const tlFmt = (n, d = 1) => n === null || !Number.isFinite(n) ? '–' : (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);


/* ---------- same property: tick it and results flow from one tool into the next ---------- */
const sameBox = () => `<label class="tlsame"><input type="checkbox" data-tl-chk="prop.same" ${TL.prop.same ? 'checked' : ''}> <span><b>Same property</b> as my other calculators. Results carry through.</span></label>`;
const noteBox = k => TL.prop.same && TL.note[k] ? `<div class="notice" style="margin:0 0 12px">${esc(TL.note[k])}</div>` : '';
const IVIDS = ['cu15', 'cu22', 'cu28', 'cu35'];
function tlPull(tool) {
  if (!TL.prop.same) return;
  if (tool === 'pipe') {
    const g = gasCalc(calcState('tool-gas')), gSig = g ? 'g' + g.net.toFixed(1) : '', hs = heatSums(), hSig = hs.tot > 0 ? 'h' + Math.round(hs.tot) : '';
    if (g && gSig !== TL.pulled.gas) { TL.pulled.gas = gSig; TL.pipe.kw = g.net.toFixed(1); TL.pipe.basis = 'net'; TL.used.pipe = 1; TL.note.pipe = 'Heat input filled in from the gas rate result (' + g.net.toFixed(1) + ' kW net). Change it if you need to.'; }
    else if (hSig && hSig !== TL.pulled.heat) { TL.pulled.heat = hSig; TL.pipe.kw = (hs.tot / 1000).toFixed(1); TL.pipe.basis = 'net'; TL.used.pipe = 1; TL.note.pipe = 'Heat input filled in from the heat loss (' + (hs.tot / 1000).toFixed(1) + ' kW). Change it to the boiler or appliance input if you need to.'; }
  } else if (tool === 'iv') {
    const c = pipeCalc(), sig = c && c.best ? TL.pipe.len + '|' + c.best.n : '';
    if (sig && sig !== TL.pulled.run) {
      TL.pulled.run = sig; const id = IVIDS[PIPES.findIndex(p => p.n === c.best.n)];
      TL.iv.runs[0] = { pipe: id, len: String(TL.pipe.len), v: '' }; TL.note.iv = 'First pipe run filled in from pipe sizing (' + c.best.n + ', ' + TL.pipe.len + ' m). Add the other runs.';
    }
  }
  tlSave();
}

/* ---------- gas pipe sizing ----------
   Flow in a round pipe for a given pressure drop (Darcy–Weisbach with Colebrook friction, natural gas at 15°C).
   The friction is calibrated (x1.1) so the answers match the published BS 6891 figures for 15 mm copper
   (3 m 2.9, 6 m 1.9, 9 m 1.5, 12 m 1.3, 15 m 1.1 m³/h at 1 mbar) to within about 2%. */
const PIPES = [
  { n: '15 mm copper', d: 13.6, eq: { b45: 0.15, b90: 0.20, e90: 0.40, tin: 0.75, tout: 1.20 } },
  { n: '22 mm copper', d: 20.2, eq: { b45: 0.20, b90: 0.30, e90: 0.60, tin: 1.20, tout: 1.80 } },
  { n: '28 mm copper', d: 26.2, eq: { b45: 0.25, b90: 0.40, e90: 0.80, tin: 1.50, tout: 2.30 } },
  { n: '35 mm copper', d: 32.6, eq: { b45: 0.30, b90: 0.50, e90: 1.00, tin: 1.90, tout: 2.90 } }
];
function pipeFlow(dmm, L, dpMbar) {
  const d = dmm / 1000, A = Math.PI * d * d / 4, rho = 0.717, mu = 1.11e-5, eps = 1.5e-6, dp = dpMbar * 100;
  let v = 2;
  for (let i = 0; i < 80; i++) {
    const Re = rho * v * d / mu; let f = 0.02;
    for (let j = 0; j < 25; j++) f = Math.pow(-2 * Math.log10(eps / (3.7 * d) + 2.51 / (Re * Math.sqrt(f))), -2);
    f *= 1.1;
    const vn = Math.sqrt(2 * dp * d / (f * L * rho));
    if (Math.abs(vn - v) < 1e-7) { v = vn; break; } v = (v + vn) / 2;
  }
  return v * A * 3600;
}
function pipeDrop(dmm, L, flow) {          // pressure drop (mbar) that gives this flow
  let lo = 0.0001, hi = 200;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (pipeFlow(dmm, L, mid) < flow) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
function pipeCalc() {
  const p = TL.pipe, kw = tlNum(p.kw), len = tlNum(p.len), dpMax = tlNum(p.dp) || 1, cv = tlNum(settings.gasCV) || 38.76;
  if (!(kw > 0) || !(len > 0)) return null;
  const gross = p.basis === 'net' ? kw * 1.11 : kw, flow = gross * 3.6 / cv;     // kW gross -> m3/h
  const rows = PIPES.map(pp => {
    const fit = Object.keys(pp.eq).reduce((s, k) => s + (tlNum(p.f[k]) || 0) * pp.eq[k], 0), eqL = len + fit;
    const cap = pipeFlow(pp.d, eqL, dpMax), drop = pipeDrop(pp.d, eqL, flow);
    return { n: pp.n, eqL, cap, drop, ok: flow <= cap };
  });
  return { flow, gross, dpMax, rows, best: rows.find(r => r.ok) };
}
function pipeResHtml() {
  const c = pipeCalc(); if (!c) return '<p class="muted">Enter the heat input and the pipe length.</p>';
  return `<div class="row sp" style="margin-bottom:6px"><span>Gas rate needed</span><b>${tlFmt(c.flow, 2)} m³/h</b></div>
    <div class="row sp" style="margin-bottom:10px"><span class="muted">Heat input used (gross)</span><span>${tlFmt(c.gross, 1)} kW</span></div>
    ${c.rows.map(r => `<div class="tlrow ${r.ok ? 'ok' : 'no'} ${c === c && c.best === r ? 'best' : ''}">
      <div class="row sp"><b>${esc(r.n)}</b><span>${r.ok ? '&#10003; big enough' : '&#10007; too small'}</span></div>
      <div class="small muted">Run + fittings: ${tlFmt(r.eqL, 1)} m · capacity ${tlFmt(r.cap, 2)} m³/h at ${tlFmt(c.dpMax, 1)} mbar · drop at your flow ${tlFmt(r.drop, 2)} mbar</div></div>`).join('')}
    <p class="small" style="margin:10px 0 0"><b>${c.best ? 'Smallest pipe that works: ' + esc(c.best.n) : 'None of these is big enough: use a larger pipe or split the run.'}</b></p>`;
}
function pipeView() {
  const p = TL.pipe, f = p.f, inp = (k, label, ph, extra = '') => `<div class="grow f"><span>${label}</span><input data-tl-in="pipe.${k}" type="text" inputmode="decimal" value="${esc(p[k])}" ${ph ? `placeholder="${ph}"` : ''} autocomplete="off" ${extra}></div>`;
  const fit = (k, label) => `<div class="grow f"><span>${label}</span><input data-tl-in="pipe.f.${k}" type="text" inputmode="numeric" value="${esc(f[k])}" autocomplete="off"></div>`;
  tlPull('pipe');
  return `<h1>Gas pipe sizing</h1>${sameBox()}${noteBox('pipe')}
    <p class="small muted" style="margin-top:0">Copper pipe, natural gas. Add up the total heat input of everything the pipe feeds and the longest run to it.</p>
    <div class="card">
      <div class="row">${inp('kw', 'Total heat input (kW)', 'e.g. 24')}
        <div class="grow f"><span>That figure is</span><div class="seg"><button type="button" class="${p.basis === 'net' ? 'on' : ''}" data-tl="pipeBasis" data-v="net">Net</button><button type="button" class="${p.basis === 'gross' ? 'on' : ''}" data-tl="pipeBasis" data-v="gross">Gross</button></div></div></div>
      <div class="row">${inp('len', 'Pipe length (m)', 'e.g. 6')}${inp('dp', 'Allowed pressure drop (mbar)', '1')}</div>
      <div class="small muted" style="margin:6px 0">Fittings on the run (how many):</div>
      <div class="row">${fit('b90', '90° bends')}${fit('e90', '90° elbows')}${fit('b45', '45° bends')}</div>
      <div class="row">${fit('tin', 'Tees (flow in)')}${fit('tout', 'Tees (flow out)')}</div>
    </div>
    <h2>Result</h2><div class="card" id="tlPipeRes">${pipeResHtml()}</div>
    <p class="small muted">A guide only. It is calibrated to the published BS 6891 15 mm copper figures. Always check the final size against BS 6891 / IGEM/UP/2 and the appliance maker's instructions. The 35 mm fitting lengths are estimated.</p>`;
}


/* ---------- tightness test: installation volume (IGEM/UP/1B Edition 4, mandatory from 1 October 2026) ----------
   IV = meter + pipework + 10% for fittings. The permissible drop now depends on IV and the gas, not the meter size. */
const IVPIPES = [['cu15', 'Copper 15 mm', 0.00014], ['cu22', 'Copper 22 mm', 0.00032], ['cu28', 'Copper 28 mm', 0.00054], ['cu35', 'Copper 35 mm', 0.00084],
  ['st15', 'Steel ½" (15 mm)', 0.00024], ['st20', 'Steel ¾" (20 mm)', 0.00046], ['st25', 'Steel 1" (25 mm)', 0.00064], ['st32', 'Steel 1¼" (32 mm)', 0.0011],
  ['x', 'Other (enter m³ per metre)', null]];
const IVMETERS = [['u6', 'U6 / G4 diaphragm', 0.008], ['e6', 'E6 smart meter', 0.0024], ['u16', 'U16 diaphragm', 0.025], ['none', 'No meter (LPG cylinders)', 0], ['x', 'Other (enter m³)', null]];
const IVBANDS = {
  ng: [[0.005, '8 mbar'], [0.010, '4 mbar'], [0.015, '2.5 mbar'], [0.035, '1 mbar']],
  lpg: [[0.0025, '2 mbar'], [0.005, '1 mbar'], [0.010, '0.5 mbar'], [0.035, 'No perceptible movement']],
  lpgair: [[0.025, '1.5 mbar'], [0.035, '0.5 mbar']]
};
const IVGAS = { ng: 'Natural gas', lpg: 'LPG', lpgair: 'LPG/Air' };
function ivCalc() {
  const v = TL.iv, m = IVMETERS.find(x => x[0] === v.meter), mv = m[2] === null ? tlNum(v.mvol) : m[2];
  let pipe = 0, len = 0, any = false;
  v.runs.forEach(r => { const p = IVPIPES.find(x => x[0] === r.pipe), per = p[2] === null ? tlNum(r.v) : p[2], l = tlNum(r.len); if (l > 0 && per > 0) { pipe += per * l; len += l; any = true; } });
  if (mv === null || (!any && !(mv > 0))) return null;
  const fit = pipe * 0.1, iv = mv + pipe + fit, band = IVBANDS[v.gas].find(b => iv <= b[0] + 1e-12);
  return { mv, pipe, fit, iv, len, drop: band ? band[1] : null, pv: iv * 1.5 };
}
function ivResHtml() {
  const c = ivCalc(); if (!c) return '<p class="muted">Add the meter and at least one pipe run.</p>';
  const g = TL.iv.gas, f = n => tlFmt(n, 4) + ' m³';
  const rows = (a, b) => `<div class="row sp"><span>${a}</span><span>${b}</span></div>`;
  return rows('Meter', f(c.mv)) + rows('Pipework (' + tlFmt(c.len, 1) + ' m)', f(c.pipe)) + rows('Fittings allowance (10%)', f(c.fit))
    + `<div class="row sp" style="margin-top:6px"><b>Installation volume (IV)</b><b>${f(c.iv)} (${tlFmt(c.iv * 1000, 1)} litres)</b></div>
    <hr style="border:0;border-top:1px solid var(--line);margin:10px 0">`
    + (c.drop ? `<div class="tlrow ok"><div class="row sp"><span>Most the pressure may drop in 2 minutes</span><b>${esc(c.drop)}</b></div><div class="small muted">${IVGAS[g]}, IV ${tlFmt(c.iv, 4)} m³. Existing installation with appliances connected and no smell of gas.</div></div>`
      : `<div class="tlrow no"><b>IV is over 0.035 m³.</b><div class="small">This is outside the scope of IGEM/UP/1B. Check the standard for the right procedure.</div></div>`)
    + rows('Purge volume (1.5 × IV)', f(c.pv))
    + `<div class="small muted" style="margin-top:8px">Test pressure: ${g === 'ng' ? '20 to 21 mbar' : g === 'lpg' ? '37 mbar' : 'see the standard'}. Let 1 minute settle, then test for 2 minutes.
      New pipework, or pipework with no appliances connected: no pressure drop allowed. Any movement you can see (0.25 mbar, or 0.2 mbar on a gauge that reads to one decimal place) within the permissible drop means isolate every appliance and retest the pipework alone with no drop allowed.</div>`;
}
function ivView() {
  const v = TL.iv, opt = (list, cur) => list.map(x => `<option value="${x[0]}" ${cur === x[0] ? 'selected' : ''}>${esc(x[1])}</option>`).join('');
  tlPull('iv');
  return `<h1>Tightness test volume</h1>${sameBox()}${noteBox('iv')}
    <p class="small muted" style="margin-top:0">Works out the installation volume (IV) and the pressure drop you are allowed under the new IGEM/UP/1B Edition 4, in force from 1 October 2026.</p>
    <div class="card">
      <div class="f"><span>Gas</span><select data-tl-sel="iv.gas">${Object.keys(IVGAS).map(k => `<option value="${k}" ${v.gas === k ? 'selected' : ''}>${IVGAS[k]}</option>`).join('')}</select></div>
      <div class="f"><span>Meter</span><select data-tl-sel="iv.meter">${opt(IVMETERS, v.meter)}</select></div>
      ${v.meter === 'x' ? `<div class="f"><span>Meter volume (m³), from the meter's data</span><input data-tl-in="iv.mvol" type="text" inputmode="decimal" value="${esc(v.mvol)}" autocomplete="off"></div>` : ''}
    </div>
    <h2>Pipework</h2>
    ${v.runs.map((r, i) => `<div class="card"><div class="row sp"><div class="grow f" style="margin:0"><span>Pipe</span><select data-tl-sel="iv.runs.${i}.pipe">${opt(IVPIPES, r.pipe)}</select></div>${v.runs.length > 1 ? `<button type="button" class="btn ghost" style="margin-left:8px" data-tl="rmRun" data-v="${i}">Remove</button>` : ''}</div>
      <div class="row"><div class="grow f"><span>Length (m)</span><input data-tl-in="iv.runs.${i}.len" type="text" inputmode="decimal" value="${esc(r.len)}" placeholder="e.g. 6" autocomplete="off"></div>
      ${r.pipe === 'x' ? `<div class="grow f"><span>m³ per metre</span><input data-tl-in="iv.runs.${i}.v" type="text" inputmode="decimal" value="${esc(r.v)}" autocomplete="off"></div>` : ''}</div></div>`).join('')}
    <button type="button" class="btn gold block" data-tl="addRun">+ Add another pipe run</button>
    <h2>Result</h2><div class="card" id="tlIvRes">${ivResHtml()}</div>
    <p class="small muted">Pipe volumes are worked out from the pipe's internal bore with 10% added for fittings, and the meter volumes are common values. For a meter or flexible pipe not listed, use the manufacturer's figure. A guide only: check against the IGEM/UP/1B Edition 4 tables, which are the rules.</p>`;
}

/* ---------- heat loss ---------- */
const WALLS = [['Solid brick, uninsulated', 2.1], ['Cavity wall, unfilled', 1.5], ['Cavity wall, filled', 0.55], ['Modern insulated (after 2002)', 0.30], ['Very well insulated', 0.18]];
const GLAZ = [['Single glazing', 4.8], ['Double glazing (older)', 2.8], ['Double glazing (modern, low-E)', 1.6], ['Triple glazing', 0.8]];
const ROOFS = [['Heated room above', 0], ['Loft, 270 mm insulation', 0.16], ['Loft, 100 mm insulation', 0.35], ['Loft, uninsulated', 2.3], ['Flat roof, insulated', 0.25], ['Flat roof, uninsulated', 1.5]];
const FLOORS = [['Heated room below', 0], ['Solid floor, uninsulated', 0.7], ['Solid floor, insulated', 0.25], ['Timber floor, uninsulated', 0.7], ['Timber floor, insulated', 0.25]];
const ROOMT = { 'Living room': [21, 1.5], 'Dining room': [21, 1.5], 'Kitchen': [18, 2], 'Bedroom': [18, 1], 'Bathroom': [22, 2], 'Hall / landing': [18, 1.5], 'Toilet': [18, 2], 'Study': [21, 1] };
const SYSTEMS = { cond: ['Condensing boiler (70/50)', 70, 50], cond2: ['Low temperature (55/45)', 55, 45], old: ['Older boiler (75/65)', 75, 65], hp: ['Heat pump (45/40)', 45, 40], hp2: ['Heat pump (50/40)', 50, 40], custom: ['My own temperatures', null, null] };
const newRoom = () => ({ name: 'Living room', temp: '21', l: '4', w: '4', h: '2.4', ext: '4', wall: '1', win: '2', glaz: '1', roof: '0', floor: '1', ach: '1.5' });
const hlSys = () => { const h = TL.heat, s = SYSTEMS[h.sys]; return s && s[1] ? { flow: s[1], ret: s[2] } : { flow: tlNum(h.flow) || 70, ret: tlNum(h.ret) || 50 }; };
function roomCalc(r) {
  const out = tlNum(TL.heat.outside), t = tlNum(r.temp), L = tlNum(r.l), W = tlNum(r.w), H = tlNum(r.h), ext = tlNum(r.ext) || 0, win = tlNum(r.win) || 0, ach = tlNum(r.ach);
  if (out === null || t === null || !(L > 0 && W > 0 && H > 0)) return null;
  const dT = t - out, wallA = Math.max(0, ext * H - win), area = L * W, vol = area * H;
  const uw = WALLS[+r.wall][1], ug = GLAZ[+r.glaz][1], ur = ROOFS[+r.roof][1], uf = FLOORS[+r.floor][1];
  const fab = wallA * uw + win * ug + area * ur + area * uf, vent = 0.33 * (ach || 0) * vol;
  const watts = (fab + vent) * dT;
  return { dT, fab: fab * dT, vent: vent * dT, watts, vol };
}
/* catalogue radiators are rated at mean water 70°C with the room at 20°C (delta T 50); output scales with delta T^1.3 */
function radEquiv(watts, roomT) {
  const s = hlSys(), mean = (s.flow + s.ret) / 2, dT = mean - roomT;
  if (!(dT > 0)) return null;
  const factor = Math.pow(dT / 50, 1.3);
  return { dT, factor, rated: watts / factor };
}
function roomResHtml(r, i) {
  const c = roomCalc(r); if (!c) return `<div id="tlRoomRes-${i}" class="small muted">Fill in the room size and temperatures.</div>`;
  const re = radEquiv(c.watts, tlNum(r.temp));
  return `<div id="tlRoomRes-${i}" class="tlrow"><div class="row sp"><span>Heat loss</span><b>${Math.round(c.watts)} W</b></div>
    <div class="small muted">Walls, windows, floor and roof ${Math.round(c.fab)} W · air changes ${Math.round(c.vent)} W</div>
    <div class="row sp" style="margin-top:6px"><span>Radiator needed at your temperatures</span><b>${Math.round(c.watts)} W</b></div>
    <div class="row sp"><span>Catalogue size (ΔT50) to buy</span><b>${re ? Math.round(re.rated) + ' W' : '–'}</b></div></div>`;
}
function heatSums() {
  let tot = 0, rated = 0;
  TL.heat.rooms.forEach(r => { const c = roomCalc(r); if (!c) return; tot += c.watts; const re = radEquiv(c.watts, tlNum(r.temp)); if (re) rated += re.rated; });
  return { tot, rated };
}
function heatTotals() {
  const h = TL.heat, r = heatSums(), f = tlNum(h.factor) || 1.5, s = hlSys();
  if (!h.rooms.length) return '<p class="muted">Add a room to start.</p>';
  const mean = (s.flow + s.ret) / 2;
  return `<div class="row sp"><span>Whole-house heat loss</span><b>${tlFmt(r.tot / 1000, 2)} kW</b></div>
    <div class="row sp"><span>Radiators to fit (catalogue ΔT50)</span><b>${tlFmt(r.rated / 1000, 2)} kW</b></div>
    <div class="row sp"><span class="muted">Water: ${s.flow}°C flow, ${s.ret}°C return (mean ${tlFmt(mean, 1)}°C)</span><span></span></div>
    <hr style="border:0;border-top:1px solid var(--line);margin:10px 0">
    <div class="row sp"><span>Boiler, rule of thumb (radiators at your temperatures × ${tlFmt(f, 1)})</span><b>${tlFmt(r.tot * f / 1000, 1)} kW</b></div>
    <div class="row sp"><span>Boiler, from the heat loss alone</span><b>${tlFmt(r.tot / 1000, 1)} kW</b></div>
    <p class="small muted" style="margin:8px 0 0">Add hot water demand if it is a system or regular boiler with a cylinder. A combi is sized for its hot water output as well.</p>`;
}
function roomForm(r, i) {
  const sel = (k, list) => `<select data-tl-sel="heat.rooms.${i}.${k}">${list.map((x, j) => `<option value="${j}" ${String(r[k]) === String(j) ? 'selected' : ''}>${esc(x[0])}${x[1] ? ' (U ' + x[1] + ')' : ''}</option>`).join('')}</select>`;
  const n = (k, label, ph) => `<div class="grow f"><span>${label}</span><input data-tl-in="heat.rooms.${i}.${k}" type="text" inputmode="decimal" value="${esc(r[k])}" ${ph ? `placeholder="${ph}"` : ''} autocomplete="off"></div>`;
  return `<div class="card tlroom">
    <div class="row sp"><div class="grow f" style="margin:0"><span>Room</span><select data-tl-sel="heat.rooms.${i}.type">${Object.keys(ROOMT).map(k => `<option ${r.name === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></div>
      <button type="button" class="btn ghost" style="margin-left:8px" data-tl="rmRoom" data-v="${i}">Remove</button></div>
    <div class="row">${n('temp', 'Room temperature (°C)')}${n('ach', 'Air changes per hour')}</div>
    <div class="row">${n('l', 'Length (m)')}${n('w', 'Width (m)')}${n('h', 'Height (m)')}</div>
    <div class="row">${n('ext', 'Outside wall length (m)')}${n('win', 'Window and door area (m²)')}</div>
    <div class="f"><span>Outside wall type</span>${sel('wall', WALLS)}</div>
    <div class="f"><span>Glazing</span>${sel('glaz', GLAZ)}</div>
    <div class="f"><span>Above the room</span>${sel('roof', ROOFS)}</div>
    <div class="f"><span>Below the room</span>${sel('floor', FLOORS)}</div>`;
}
function heatView() {
  const h = TL.heat, custom = h.sys === 'custom';
  return `<h1>Heat loss and radiators</h1>${sameBox()}
    <p class="small muted" style="margin-top:0">Room by room. Radiator sizes change with the water temperature: pick the system, or type your own flow and return.</p>
    <div class="card">
      <div class="f"><span>Heating system</span><select data-tl-sel="heat.sys">${Object.keys(SYSTEMS).map(k => `<option value="${k}" ${h.sys === k ? 'selected' : ''}>${esc(SYSTEMS[k][0])}</option>`).join('')}</select></div>
      ${custom ? `<div class="row"><div class="grow f"><span>Flow (°C)</span><input data-tl-in="heat.flow" type="text" inputmode="decimal" value="${esc(h.flow)}" autocomplete="off"></div><div class="grow f"><span>Return (°C)</span><input data-tl-in="heat.ret" type="text" inputmode="decimal" value="${esc(h.ret)}" autocomplete="off"></div></div>` : ''}
      <div class="row"><div class="grow f"><span>Outside design temperature (°C)</span><input data-tl-in="heat.outside" type="text" inputmode="decimal" value="${esc(h.outside)}" autocomplete="off"></div>
        <div class="grow f"><span>Boiler rule of thumb ×</span><input data-tl-in="heat.factor" type="text" inputmode="decimal" value="${esc(h.factor)}" autocomplete="off"></div></div>
    </div>
    <div id="tlRooms">${h.rooms.map((r, i) => roomForm(r, i) + roomResHtml(r, i) + '</div>').join('')}</div>
    <button type="button" class="btn gold block" data-tl="addRoom">+ Add a room</button>
    <h2>Totals</h2><div class="card" id="tlHeatTot">${heatTotals()}</div>
    <p class="small muted">An estimate using typical U-values and the room-by-room method. It ignores heat flow through internal walls and assumes neighbouring rooms are at a similar temperature. Check against a full heat loss calculation for new systems and heat pumps.</p>`;
}

/* ---------- report: everything you have calculated, on one PDF ---------- */
function tlSections() {
  const out = [], f2 = (n, d = 1) => tlFmt(n, d);
  /* gas rate */
  const gs = calcState('tool-gas'), g = gasCalc(gs);
  if (g) out.push({ title: 'Gas rate (meter test)', items: [{ t: 'kv', bold: ['Heat input, net'], rows: [['Meter', gs.unit === 'ft³' ? 'Imperial (ft³)' : 'Metric (m³)'], ['Volume used', (calcVol(gs) ?? '–') + ' ' + gs.unit], ['Time taken', gs.secs + ' (' + f2(calcSecs(gs.secs), 1) + ' s)'], ['Calorific value', gs.cv + ' MJ/m³'], ['Gas rate', f2(g.m3h, 3) + ' m³/h'], ['Heat input, gross', f2(g.gross, 1) + ' kW'], ['Heat input, net', f2(g.net, 1) + ' kW']] }] });
  /* pipe sizing */
  const pc = pipeCalc();
  if (pc && TL.used.pipe) { const p = TL.pipe; out.push({ title: 'Gas pipe sizing', items: [
    { t: 'kv', rows: [['Heat input used (gross)', f2(pc.gross, 1) + ' kW'], ['Gas rate needed', f2(pc.flow, 2) + ' m³/h'], ['Pipe length', p.len + ' m'], ['Fittings', `${p.f.b90 || 0} × 90° bend, ${p.f.e90 || 0} × 90° elbow, ${p.f.b45 || 0} × 45° bend, ${p.f.tin || 0} × tee in, ${p.f.tout || 0} × tee out`], ['Allowed pressure drop', f2(pc.dpMax, 1) + ' mbar'], ['Smallest pipe that works', pc.best ? pc.best.n : 'None of the sizes listed']], bold: ['Smallest pipe that works'] },
    { t: 'table', head: ['Pipe', 'Run + fittings', 'Capacity', 'Drop at your flow', 'Result'], w: [30, 26, 28, 34, 24], a: ['l', 'r', 'r', 'r', 'l'], rows: pc.rows.map(r => [r.n, f2(r.eqL, 1) + ' m', f2(r.cap, 2) + ' m³/h', f2(r.drop, 2) + ' mbar', r.ok ? 'Big enough' : 'Too small']) },
    { t: 'note', text: 'Calculated for natural gas with the flow calibrated to the published BS 6891 figures for 15 mm copper. Confirm the final size against BS 6891 / IGEM/UP/2.' }] }); }
  /* tightness test volume */
  const ic = ivCalc();
  if (ic && TL.iv.runs.some(r => tlNum(r.len) > 0)) { const v = TL.iv; out.push({ title: 'Tightness test: installation volume (IGEM/UP/1B Edition 4)', items: [
    { t: 'table', head: ['Pipe run', 'Length', 'Volume'], w: [60, 30, 40], a: ['l', 'r', 'r'], rows: v.runs.filter(r => tlNum(r.len) > 0).map(r => { const p = IVPIPES.find(x => x[0] === r.pipe), per = p[2] === null ? tlNum(r.v) : p[2]; return [p[1], f2(tlNum(r.len), 1) + ' m', tlFmt(per * tlNum(r.len), 5) + ' m³']; }) },
    { t: 'kv', bold: ['Installation volume (IV)', 'Most the pressure may drop'], rows: [['Gas', IVGAS[v.gas]], ['Meter volume', tlFmt(ic.mv, 4) + ' m³'], ['Pipework', tlFmt(ic.pipe, 4) + ' m³'], ['Fittings allowance (10%)', tlFmt(ic.fit, 4) + ' m³'], ['Installation volume (IV)', tlFmt(ic.iv, 4) + ' m³ (' + f2(ic.iv * 1000, 1) + ' litres)'], ['Most the pressure may drop', ic.drop ? ic.drop + ' in 2 minutes' : 'IV over 0.035 m³: outside the scope of IGEM/UP/1B'], ['Purge volume (1.5 × IV)', tlFmt(ic.pv, 4) + ' m³'], ['Test pressure', v.gas === 'ng' ? '20 to 21 mbar' : v.gas === 'lpg' ? '37 mbar' : 'See the standard']] },
    { t: 'note', text: 'Let the pressure settle for 1 minute, then test for 2 minutes. New pipework, or pipework with no appliances connected: no pressure drop allowed. Any perceptible movement (0.25 mbar, or 0.2 mbar on a gauge reading to one decimal place) within the permissible drop means isolating every appliance and retesting the pipework alone with no drop allowed.' }] }); }
  /* heat loss */
  const h = TL.heat, rooms = h.rooms.map(r => ({ r, c: roomCalc(r) })).filter(x => x.c);
  if (rooms.length && TL.used.heat) { const sy = hlSys(), sm = heatSums(), fct = tlNum(h.factor) || 1.5; out.push({ title: 'Heat loss and radiator sizing', items: [
    { t: 'kv', rows: [['Heating system', SYSTEMS[h.sys][0] + ': ' + sy.flow + '°C flow, ' + sy.ret + '°C return'], ['Outside design temperature', h.outside + '°C']] },
    { t: 'table', head: ['Room', 'Temp', 'Heat loss', 'Radiator needed', 'Catalogue size (ΔT50)'], w: [38, 16, 26, 32, 36], a: ['l', 'r', 'r', 'r', 'r'], rows: rooms.map(({ r, c }) => { const re = radEquiv(c.watts, tlNum(r.temp)); return [r.name + ' ' + r.l + '×' + r.w + '×' + r.h + ' m', r.temp + '°C', Math.round(c.watts) + ' W', Math.round(c.watts) + ' W', re ? Math.round(re.rated) + ' W' : '–']; }) },
    { t: 'kv', bold: ['Whole-house heat loss'], rows: [['Whole-house heat loss', f2(sm.tot / 1000, 2) + ' kW'], ['Radiators to fit (catalogue ΔT50)', f2(sm.rated / 1000, 2) + ' kW'], ['Boiler, rule of thumb (× ' + f2(fct, 1) + ')', f2(sm.tot * fct / 1000, 1) + ' kW']] },
    { t: 'note', text: 'An estimate using typical U-values and the room-by-room method. Check against a full heat loss calculation for new systems and heat pumps.' }] }); }
  return out;
}
async function tlMakeReport() {
  const secs = tlSections(); if (!secs.length) { toast('Nothing calculated yet'); return; }
  toast('Creating PDF…');
  try {
    const blob = await buildToolsPdf(secs, TL.prop, settings), nm = (TL.prop.name || 'Calculations').replace(/[^\w ]+/g, '').trim() || 'Calculations';
    ui.toolPdf = { blob, name: `Calculation report - ${nm} ${todayISO()}.pdf` }; tlRepaint(); toast('Report ready');
  } catch (e) { console.error(e); toast('Could not create the PDF: ' + e.message); }
}
async function tlSharePdf() {
  const p = ui.toolPdf; if (!p) return; const file = new File([p.blob], p.name, { type: 'application/pdf' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: p.name }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(p.blob); a.download = p.name; document.body.appendChild(a); a.click(); a.remove();
}

/* ---------- screens ---------- */
function renderTools(v) {
  const t = ui.tool || 'menu';
  if (t === 'gas') {
    const s = calcState('tool-gas'); if (s.open === false && !s._seen) { s.open = true; s._seen = true; }
    v.innerHTML = `<h1>Gas rate</h1>${sameBox()}<p class="small muted" style="margin-top:0">Time the meter for a gas rate and heat input without making a certificate.</p>${calcPanel('tool-gas', '')}
      <div style="height:10px"></div><button class="btn ghost block" data-tl="go" data-v="menu">Back to tools</button>`;
  } else if (t === 'pipe') {
    v.innerHTML = pipeView() + '<div style="height:10px"></div><button class="btn ghost block" data-tl="go" data-v="menu">Back to tools</button>';
  } else if (t === 'iv') {
    v.innerHTML = ivView() + '<div style="height:10px"></div><button class="btn ghost block" data-tl="go" data-v="menu">Back to tools</button>';
  } else if (t === 'heat') {
    if (!TL.heat.rooms.length) { TL.heat.rooms.push(newRoom()); tlSave(); }
    v.innerHTML = heatView() + '<div style="height:10px"></div><button class="btn ghost block" data-tl="go" data-v="menu">Back to tools</button>';
  } else {
    const use = tlUse(), fav = tlFav(), list = [['gas', 'Gas rate calculator'], ['pipe', 'Gas pipe sizing'], ['iv', 'Tightness test volume (new regs)'], ['heat', 'Heat loss and radiator sizing']]
      .filter(x => toolOn(x[0])).map((x, i) => ({ k: x[0], l: x[1], n: use[x[0]] || 0, f: !!fav[x[0]], i })).sort((a, b) => (b.f ? 1 : 0) - (a.f ? 1 : 0) || b.n - a.n || a.i - b.i);
    v.innerHTML = `<h1>Tools</h1><p class="small muted" style="margin-top:0">Quick calculators for the van. None of these makes a certificate. Tap the heart to pin one to the top. After that, the ones you use most come first.</p>
      ${list.map(x => `<div class="item crow" style="padding:0;margin-bottom:10px"><button type="button" class="btn gold grow" style="flex:1" data-tl="go" data-v="${x.k}">${x.l}</button><button type="button" class="heart ${x.f ? 'on' : ''}" data-tl="favTool" data-v="${x.k}" aria-label="${x.f ? 'Unpin' : 'Pin to the top'}">${x.f ? '♥' : '♡'}</button></div>`).join('')}
 <h2>Report</h2>
      <div class="card">
        ${(() => { const c = customers.find(x => x.id === TL.prop.cid), ps = c ? (c.properties || []).filter(Boolean) : []; return ps.length > 1 ? `<div class="f"><span>Which property?</span><select data-tl-sel-prop="1">${ps.map(p => `<option ${p === TL.prop.addr ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></div>` : ''; })()}
        <div class="f"><span>Customer</span><input data-tl-in="prop.name" type="text" value="${esc(TL.prop.name)}" list="tlCust" autocomplete="off"><datalist id="tlCust">${customers.map(c => `<option value="${esc(c.name)}">`).join('')}</datalist></div>
        <div class="f"><span>Property address</span><textarea data-tl-in="prop.addr" rows="2" autocomplete="off">${esc(TL.prop.addr)}</textarea></div>
        <button type="button" class="btn gold block" data-tl="mkPdf">Create PDF report</button>
        ${ui.toolPdf ? `<div style="height:8px"></div><button type="button" class="btn block" data-tl="shPdf">Share or save: ${esc(ui.toolPdf.name)}</button>` : ''}
        <div style="height:8px"></div><button type="button" class="btn ghost block" data-tl="newProp">Start a new property (clear everything)</button>
        <small class="muted">The report includes every calculator you have filled in.</small>
      </div>
      <div style="height:10px"></div>${ui.toolBack === 'custEdit' ? '<button class="btn ghost block" data-tl="backCust">Back to the customer</button>' : '<button class="btn ghost block" data-nav="home">Back</button>'}`;
  }
}
const toolOn = k => settings['tool' + k[0].toUpperCase() + k.slice(1)] !== 'off';
function toolsForCustomer(c) {
  const same = TL.prop.cid === c.id;
  if (!same) { TL = TL_DEFAULT(); ui.toolPdf = null; try { delete ui.calc['tool-gas']; } catch (e) { } }
  const props = (c.properties || []).filter(Boolean);
  TL.prop.cid = c.id; TL.prop.name = c.name || ''; TL.prop.phone = c.phone || ''; TL.prop.email = c.email || '';
  if (!same || !TL.prop.addr) TL.prop.addr = props[0] || c.billing || '';
  if (!same) TL.prop.same = true;
  tlSave(); ui.toolBack = 'custEdit'; ui.tool = 'menu'; ui.view = 'tools'; render(); window.scrollTo(0, 0);
}
const toolsHomeBtn = () => !['gas', 'pipe', 'iv', 'heat'].some(toolOn) ? '' : `<button class="btn block" data-act="toolsOpen">Tools: gas rate, pipe sizing, heat loss</button><div style="height:10px"></div>`;

/* ---------- events (kept separate from the main app handlers) ---------- */
function tlSet(path, val) {
  if (/^(pipe|heat)\./.test(path)) TL.used[path.split('.')[0]] = 1;
  const k = path.split('.'); let o = TL; for (let i = 0; i < k.length - 1; i++) o = o[k[i]]; o[k[k.length - 1]] = val; tlSave();
}
function tlRepaint() { const y = window.scrollY; render(); window.scrollTo(0, y); }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-tl]'); if (!b || ui.view !== 'tools') return;
  const a = b.dataset.tl, v = b.dataset.v;
  if (a === 'go') { if (v !== 'menu') tlCount(v); ui.tool = v; render(); window.scrollTo(0, 0); }
  else if (a === 'favTool') { const f = tlFav(); if (f[v]) delete f[v]; else f[v] = 1; try { localStorage.setItem('omb_toolfav', JSON.stringify(f)); } catch (e) { } tlRepaint(); }
  else if (a === 'addRun') { TL.iv.runs.push({ pipe: 'cu22', len: '', v: '' }); tlSave(); tlRepaint(); }
  else if (a === 'rmRun') { TL.iv.runs.splice(+v, 1); tlSave(); tlRepaint(); }
  else if (a === 'backCust') { ui.view = 'custEdit'; render(); window.scrollTo(0, 0); }
  else if (a === 'mkPdf') tlMakeReport();
  else if (a === 'shPdf') tlSharePdf();
  else if (a === 'newProp') { if (!confirm('Clear all the calculators and the customer details?')) return; const k = TL.prop.same; TL = TL_DEFAULT(); TL.prop.same = k; tlSave(); ui.toolPdf = null; try { delete ui.calc['tool-gas']; } catch (e) { } tlRepaint(); toast('Cleared'); }
  else if (a === 'pipeBasis') { TL.used.pipe = 1; TL.pipe.basis = v; tlSave(); tlRepaint(); }
  else if (a === 'addRoom') { TL.used.heat = 1; TL.heat.rooms.push(newRoom()); tlSave(); tlRepaint(); }
  else if (a === 'rmRoom') { TL.heat.rooms.splice(+v, 1); tlSave(); tlRepaint(); }
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act="toolsOpen"]'); if (!b) return;
  ui.toolBack = ''; ui.tool = 'menu'; ui.view = 'tools'; render(); window.scrollTo(0, 0);
});
document.addEventListener('input', e => {
  const t = e.target, p = t.dataset && t.dataset.tlIn; if (!p || ui.view !== 'tools') return;
  tlSet(p, t.value); if (p === 'pipe.kw') delete TL.note.pipe;
  if (p === 'prop.name') { const c = customers.find(x => x.name === t.value); TL.prop.cid = c ? c.id : ''; TL.prop.phone = c ? c.phone || '' : ''; TL.prop.email = c ? c.email || '' : ''; tlSave(); }
  if (p.startsWith('prop.')) return;
  if (p.startsWith('pipe.')) { const el = document.getElementById('tlPipeRes'); if (el) el.innerHTML = pipeResHtml(); }
  else if (p.startsWith('iv.')) { const el = document.getElementById('tlIvRes'); if (el) el.innerHTML = ivResHtml(); }
  else if (p.startsWith('heat.')) {
    const m = p.match(/^heat\.rooms\.(\d+)\./);
    const paint = i => { const el = document.getElementById('tlRoomRes-' + i); if (el) el.outerHTML = roomResHtml(TL.heat.rooms[i], i); };
    if (m) paint(+m[1]); else TL.heat.rooms.forEach((r, i) => paint(i));
    const tt = document.getElementById('tlHeatTot'); if (tt) tt.innerHTML = heatTotals();
  }
});
document.addEventListener('change', e => {
  if (e.target.dataset && e.target.dataset.tlSelProp && ui.view === 'tools') { TL.prop.addr = e.target.value; tlSave(); tlRepaint(); return; }
  const ck = e.target.dataset && e.target.dataset.tlChk; if (ck && ui.view === 'tools') { tlSet(ck, e.target.checked); tlRepaint(); return; }
  const t = e.target, p = t.dataset && t.dataset.tlSel; if (!p || ui.view !== 'tools') return;
  const m = p.match(/^heat\.rooms\.(\d+)\.type$/);
  if (m) { TL.used.heat = 1; const r = TL.heat.rooms[+m[1]], d = ROOMT[t.value]; r.name = t.value; if (d) { r.temp = String(d[0]); r.ach = String(d[1]); } }
  else tlSet(p, t.value);
  tlSave(); tlRepaint();
});
