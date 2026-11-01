/* Boiler information cards: key figures copied from the manufacturer's installation manual, with the manual and page named on every card.
   Anything not in the manual is left out, never guessed. Add a boiler by adding an entry to BI_LIST. */
const BI_SRC_8000 = 'Worcester Greenstar 8000+ | 8000+ Style, manual 6721108973 (2025/06): flue pages 17, clearances page 14, technical data pages 83 to 84';
const BI_CLEAR_8000 = '450 mm in front. 300 mm clear to the left or right. 200 mm to anything below. Bottom of the case 1000 to 1500 mm from the floor.';
function bi8000(model, gc, o) {
  return {
    id: 'wb-8701-' + model.replace(/\W+/g, '').toLowerCase(), make: 'Worcester Bosch', range: 'Greenstar 8000+ Style', model, type: 'Combi', gc, src: BI_SRC_8000,
    sections: [
      ['Gas', [['Gas rate, natural gas (10 min from lighting)', o.ng + ' m³/h'], ['Gas rate, LPG', o.lpg + ' kg/h'], ['Gas inlet pressure', '20 mbar natural gas, 37 mbar LPG'], ['Gas category', 'CAT II 2H/3P']]],
      ['Heat', [['Heat input range', o.mod + ' kW'], ['Heating heat input, adjustable', o.adj + ' kW'], ['Heating output (80/60 °C), adjustable', o.out + ' kW'], ['Hot water heat input', o.dhwIn + ' kW']]],
      ['Combustion', [['CO₂ at maximum', '9.5 %'], ['CO₂ at minimum', '8.6 %'], ['NOx class', '6']]],
      ['Hot water', [['Flow at 40 °C rise', o.dhw + ' l/min'], ['Mains pressure for full flow', o.mp + ' bar working'], ['Minimum mains pressure to run', '0.2 bar'], ['Maximum mains pressure', '10 bar'], ['Minimum flow to start', '1.9 l/min']]],
      ['Heating circuit', [['Maximum operating pressure', '2.5 bar'], ['Expansion vessel', '10 litres, pre-charge 0.75 bar'], ['Pump head at 20 °C rise', '2.0 m']]],
      ['Flue (60/100)', [['Horizontal, no plume management', o.h1 + ' m'], ['Horizontal, with 500 mm of plume management', o.h2 + ' m'], ['Horizontal, with 4500 mm of plume management', o.h3 + ' m'], ['Vertical', o.v1 + ' m'], ['Each 45° bend counts as', '0.5 m'], ['Each 90° bend counts as', '1.5 m']]],
      ['Flue (80/125)', [['Horizontal (no plume management available)', o.h4 + ' m'], ['Vertical', o.v2 + ' m'], ['Each 45° bend counts as', '0.5 m'], ['Each 90° bend counts as', '1.5 m']]],
      ['Clearances', [['Case size (W x H x D)', '440 x 780 x 365 mm'], ['Space needed', BI_CLEAR_8000]]],
      ['Condensate and electrics', [['Maximum condensate', o.cond + ' l/h'], ['Condensate pH', 'about 4.5 to 5.0'], ['Supply', '230 V a.c., 50 Hz'], ['Protection rating', 'IPX4D']]],
      ['Weight', [['Appliance', o.kg + ' kg'], ['Lift weight (panels removed)', o.lift + ' kg']]]
    ]
  };
}
const BI_LIST = [
  bi8000('GR8701iW 32 C V2', '47-800-44', { ng: '3.4', lpg: '2.4', mod: '4.3 to 30.2', adj: '8.4 to 30.2', out: '8.2 to 29.1', dhwIn: '32.0', dhw: '12.0', mp: '1.2', h1: '15', h2: '15', h3: '12.2', v1: '19', h4: '25', v2: '25', cond: '3.5', kg: '49', lift: '43' }),
  bi8000('GR8701iW 36 C', '47-800-45', { ng: '3.8', lpg: '2.8', mod: '5.1 to 34.4', adj: '17.2 to 34.4', out: '16.9 to 33.7', dhwIn: '36.0', dhw: '13.5', mp: '1.4', h1: '10', h2: '10', h3: '7.2', v1: '13', h4: '29', v2: '29', cond: '4.1', kg: '49', lift: '43' }),
  bi8000('GR8701iW 40 C', '47-800-46', { ng: '4.3', lpg: '3.2', mod: '5.1 to 34.4', adj: '17.2 to 34.4', out: '16.9 to 33.7', dhwIn: '40.8', dhw: '15.0', mp: '1.6', h1: '11', h2: '11', h3: '8.2', v1: '15', h4: '35', v2: '35', cond: '4.1', kg: '49', lift: '43' }),
  bi8000('GR8701iW 45 C', '47-800-47', { ng: '4.6', lpg: '3.4', mod: '6.3 to 34.4', adj: '17.2 to 34.4', out: '16.9 to 33.8', dhwIn: '43.5', dhw: '16.0', mp: '1.7', h1: '8', h2: '8', h3: '5.2', v1: '12', h4: '35', v2: '35', cond: '4.1', kg: '52', lift: '46' }),
  bi8000('GR8701iW 50 C', '47-800-48', { ng: '5.1', lpg: '3.8', mod: '6.3 to 34.4', adj: '17.2 to 34.4', out: '16.9 to 33.8', dhwIn: '48.9', dhw: '18.0', mp: '1.8', h1: '9', h2: '9', h3: '6.2', v1: '12', h4: '40', v2: '40', cond: '4.1', kg: '52', lift: '46' })
];
function biState() { return ui.bi || (ui.bi = { q: '', id: '' }); }
function biListHtml() {
  const q = biState().q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const hits = BI_LIST.filter(b => q.every(w => (b.make + ' ' + b.range + ' ' + b.model + ' ' + b.gc + ' ' + b.type).toLowerCase().includes(w)));
  return hits.length ? hits.map(b => `<button type="button" class="item cpick" style="width:100%;text-align:left" data-bi="open" data-v="${esc(b.id)}"><div class="t">${esc(b.make)} ${esc(b.range)} ${esc(b.model)}</div><div class="s">${esc(b.type)} · GC ${esc(b.gc)}</div></button>`).join('') : '<p class="muted small">No boiler matches that yet. More are being added.</p>';
}
function biView() {
  const s = biState(), b = BI_LIST.find(x => x.id === s.id);
  if (b) return `<h1>${esc(b.model)}</h1><p class="small muted" style="margin-top:0">${esc(b.make)} ${esc(b.range)} · ${esc(b.type)} · GC ${esc(b.gc)}</p>
    ${b.sections.map(([h, rows]) => `<h2>${esc(h)}</h2><div class="card">${rows.map(([k, v]) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--line,#ddd5c0)"><span class="small muted" style="flex:1">${esc(k)}</span><b style="flex:1;text-align:right">${esc(v)}</b></div>`).join('')}</div>`).join('')}
    <p class="small muted">From: ${esc(b.src)}. Check the manual for your exact boiler before you rely on a figure.</p>
    <button class="btn ghost block" data-bi="list">Back to boiler list</button>`;
  return `<h1>Boiler information</h1><p class="small muted" style="margin-top:0">Key figures from the manufacturer's manual. Search by model or GC number.</p>
    <div class="f"><input class="search" type="search" data-bi-q value="${esc(s.q)}" placeholder="e.g. 8000 40 or 47-800-46" autocomplete="off"></div><div id="biList">${biListHtml()}</div>`;
}
document.addEventListener('input', e => { const t = e.target; if (!t.hasAttribute || !t.hasAttribute('data-bi-q') || ui.view !== 'tools') return; biState().q = t.value; const el = document.getElementById('biList'); if (el) el.innerHTML = biListHtml(); });
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-bi]'); if (!b || ui.view !== 'tools') return; const s = biState(); s.id = b.dataset.bi === 'open' ? b.dataset.v : ''; render(); window.scrollTo(0, 0); });
