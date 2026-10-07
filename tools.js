/* Tools: gas rate (timed meter test), gas pipe sizing, and room-by-room heat loss with radiator sizing at any flow/return temperature.
   These are quick guides for the van. They do not make a certificate and are not a substitute for BS 6891 / IGEM/UP/2 tables or a full heat loss survey. */
const TL_KEY = 'omb_tools';
const TL_DEFAULT = () => ({
  pipe: { kw: '24', basis: 'net', len: '6', dp: '1', f: { b90: '2', e90: '0', b45: '0', tin: '0', tout: '0' } },
  heat: { outside: '-3', sys: 'cond', flow: '70', ret: '50', room: '', factor: '1.5', rooms: [] }
});
let TL = (() => { try { const o = JSON.parse(localStorage.getItem(TL_KEY)); if (o && o.pipe && o.heat) return o; } catch (e) { } return TL_DEFAULT(); })();
const tlUse = () => { try { return JSON.parse(localStorage.getItem('omb_tooluse')) || {}; } catch (e) { return {}; } };
const tlCount = k => { try { const u = tlUse(); u[k] = (u[k] || 0) + 1; localStorage.setItem('omb_tooluse', JSON.stringify(u)); } catch (e) { } };
const tlFav = () => { try { return JSON.parse(localStorage.getItem('omb_toolfav')) || {}; } catch (e) { return {}; } };
const tlSave = () => { try { localStorage.setItem(TL_KEY, JSON.stringify(TL)); } catch (e) { } };
const tlNum = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const tlFmt = (n, d = 1) => n === null || !Number.isFinite(n) ? '–' : (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);

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
  return `<h1>Gas pipe sizing</h1>
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
  return `<h1>Heat loss and radiators</h1>
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
/* ---------- screens ---------- */
function renderTools(v) {
  const t = ui.tool || 'menu';
  if (t === 'gas') {
    const s = calcState('tool-gas'); if (s.open === false && !s._seen) { s.open = true; s._seen = true; }
    v.innerHTML = `<h1>Gas rate</h1><p class="small muted" style="margin-top:0">Time the meter for a gas rate and heat input without making a certificate.</p>${calcPanel('tool-gas', '')}
      <div style="height:10px"></div><button class="btn ghost block" data-tl="go" data-v="menu">Back to tools</button>`;
  } else if (t === 'pipe') {
    v.innerHTML = pipeView() + '<div style="height:10px"></div><button class="btn ghost block" data-tl="go" data-v="menu">Back to tools</button>';
  } else if (t === 'heat') {
    if (!TL.heat.rooms.length) { TL.heat.rooms.push(newRoom()); tlSave(); }
    v.innerHTML = heatView() + '<div style="height:10px"></div><button class="btn ghost block" data-tl="go" data-v="menu">Back to tools</button>';
  } else {
    const use = tlUse(), fav = tlFav(), list = [['gas', 'Gas rate calculator'], ['pipe', 'Gas pipe sizing'], ['heat', 'Heat loss and radiator sizing']]
      .map((x, i) => ({ k: x[0], l: x[1], n: use[x[0]] || 0, f: !!fav[x[0]], i })).sort((a, b) => (b.f ? 1 : 0) - (a.f ? 1 : 0) || b.n - a.n || a.i - b.i);
    v.innerHTML = `<h1>Tools</h1><p class="small muted" style="margin-top:0">Quick calculators for the van. None of these makes a certificate. Tap the heart to pin one to the top. After that, the ones you use most come first.</p>
      ${list.map(x => `<div class="item crow" style="padding:0;margin-bottom:10px"><button type="button" class="btn gold grow" style="flex:1" data-tl="go" data-v="${x.k}">${x.l}</button><button type="button" class="heart ${x.f ? 'on' : ''}" data-tl="favTool" data-v="${x.k}" aria-label="${x.f ? 'Unpin' : 'Pin to the top'}">${x.f ? '♥' : '♡'}</button></div>`).join('')}
      <div style="height:4px"></div><button class="btn ghost block" data-nav="home">Back</button>`;
  }
}
const toolsHomeBtn = () => `<button class="btn block" data-act="toolsOpen">Tools: gas rate, pipe sizing, heat loss</button><div style="height:10px"></div>`;

/* ---------- events (kept separate from the main app handlers) ---------- */
function tlSet(path, val) {
  const k = path.split('.'); let o = TL; for (let i = 0; i < k.length - 1; i++) o = o[k[i]]; o[k[k.length - 1]] = val; tlSave();
}
function tlRepaint() { const y = window.scrollY; render(); window.scrollTo(0, y); }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-tl]'); if (!b || ui.view !== 'tools') return;
  const a = b.dataset.tl, v = b.dataset.v;
  if (a === 'go') { if (v !== 'menu') tlCount(v); ui.tool = v; render(); window.scrollTo(0, 0); }
  else if (a === 'favTool') { const f = tlFav(); if (f[v]) delete f[v]; else f[v] = 1; try { localStorage.setItem('omb_toolfav', JSON.stringify(f)); } catch (e) { } tlRepaint(); }
  else if (a === 'pipeBasis') { TL.pipe.basis = v; tlSave(); tlRepaint(); }
  else if (a === 'addRoom') { TL.heat.rooms.push(newRoom()); tlSave(); tlRepaint(); }
  else if (a === 'rmRoom') { TL.heat.rooms.splice(+v, 1); tlSave(); tlRepaint(); }
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act="toolsOpen"]'); if (!b) return;
  ui.tool = 'menu'; ui.view = 'tools'; render(); window.scrollTo(0, 0);
});
document.addEventListener('input', e => {
  const t = e.target, p = t.dataset && t.dataset.tlIn; if (!p || ui.view !== 'tools') return;
  tlSet(p, t.value);
  if (p.startsWith('pipe.')) { const el = document.getElementById('tlPipeRes'); if (el) el.innerHTML = pipeResHtml(); }
  else if (p.startsWith('heat.')) {
    const m = p.match(/^heat\.rooms\.(\d+)\./);
    const paint = i => { const el = document.getElementById('tlRoomRes-' + i); if (el) el.outerHTML = roomResHtml(TL.heat.rooms[i], i); };
    if (m) paint(+m[1]); else TL.heat.rooms.forEach((r, i) => paint(i));
    const tt = document.getElementById('tlHeatTot'); if (tt) tt.innerHTML = heatTotals();
  }
});
document.addEventListener('change', e => {
  const t = e.target, p = t.dataset && t.dataset.tlSel; if (!p || ui.view !== 'tools') return;
  const m = p.match(/^heat\.rooms\.(\d+)\.type$/);
  if (m) { const r = TL.heat.rooms[+m[1]], d = ROOMT[t.value]; r.name = t.value; if (d) { r.temp = String(d[0]); r.ach = String(d[1]); } }
  else tlSet(p, t.value);
  tlSave(); tlRepaint();
});
