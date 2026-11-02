/* Boiler information cards: key figures copied from the manufacturer's installation manual, with the manual and page named on every card.
   Anything not in the manual is left out, never guessed. Add a boiler by adding an entry to BI_LIST. */
const BI_SRC_8000 = 'Worcester Greenstar 8000+ | 8000+ Style, manual 6721108973 (2025/06): flue pages 17, clearances page 14, technical data pages 83 to 84';
const CFG_STYLE = { key: 'wb-8701-', range: 'Greenstar 8000+ Style', src: BI_SRC_8000, pre: '0.75', gasRows: [['Gas inlet pressure', '20 mbar natural gas, 37 mbar LPG'], ['Gas category', 'CAT II 2H/3P']],
  clear: [['Space needed', '450 mm in front. 300 mm clear to the left or right. 200 mm to anything below. Bottom of the case 1000 to 1500 mm from the floor.']] };
const CFG_LIFE = { key: 'wb-8300-', range: 'Greenstar 8000 Life', src: 'Worcester Greenstar 8000 Life, manual 6720883865 (2019/02): clearances page 14, flue page 15, technical data pages 65 to 68', pre: '1.0', gasRows: [],
  clear: [['In front', '600 mm'], ['Either side', '5 mm'], ['Below', '200 mm'], ['Above', '170 or 210 mm, depending on flue size'], ['Compartment depth', '385 mm'], ['Space to removable door', '20 mm']] };
const bi8000 = (model, gc, o) => biCombi(CFG_STYLE, model, gc, o);
const biLife = (model, gc, o) => biCombi(CFG_LIFE, model, gc, o);
function biCombi(c, model, gc, o) {
  return {
    id: c.key + model.replace(/\W+/g, '').toLowerCase(), make: 'Worcester Bosch', range: c.range, model, type: 'Combi', gc, src: c.src,
    sections: [
      ['Gas', [['Gas rate, natural gas (10 min from lighting)', o.ng + ' m³/h'], ['Gas rate, LPG', o.lpg + ' kg/h']].concat(c.gasRows || [])],
      ['Heat', [['Heat input range', o.mod + ' kW']].concat(o.adj ? [['Heating heat input, adjustable', o.adj + ' kW']] : []).concat([['Heating output (80/60 °C)' + (o.adj ? ', adjustable' : ''), o.out + ' kW'], ['Hot water heat input', o.dhwIn + ' kW']])],
      ['Combustion', [['CO₂ at maximum', '9.5 %'], ['CO₂ at minimum', '8.6 %'], ['NOx class', '6']]],
      ['Hot water', [['Flow at 40 °C rise', o.dhw + ' l/min'], ['Mains pressure for full flow', o.mp + ' bar working'], ['Minimum mains pressure to run', '0.2 bar'], ['Maximum mains pressure', '10 bar'], ['Minimum flow to start', '1.9 l/min']]],
      ['Heating circuit', [['Maximum operating pressure', '2.5 bar'], ['Expansion vessel', '10 litres, pre-charge ' + c.pre + ' bar'], ['Pump head at 20 °C rise', '2.0 m']]],
      ['Flue (60/100)', [['Horizontal, no plume management', o.h1 + ' m'], ['Horizontal, with 500 mm of plume management', o.h2 + ' m'], ['Horizontal, with 4500 mm of plume management', o.h3 + ' m'], ['Vertical', o.v1 + ' m'], ['Each 45° bend counts as', '0.5 m'], ['Each 90° bend counts as', '1.5 m']]],
      ['Flue (80/125)', [['Horizontal (no plume management available)', o.h4 + ' m'], ['Vertical', o.v2 + ' m'], ['Each 45° bend counts as', '0.5 m'], ['Each 90° bend counts as', '1.5 m']]],
      ['Clearances', [['Case size (W x H x D)', '440 x 780 x 365 mm']].concat(c.clear)],
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
  ,
  biLife('GR8300iW 30 C', '47-800-18', { ng: '3.2', lpg: '2.3', mod: '3.0 to 30.2', out: '2.9 to 29.6', dhwIn: '30.2', dhw: '11', mp: '2.3', h1: '17', h2: '17', h3: '14.2', v1: '21', h4: '25', v2: '25', cond: '3.5', kg: '47', lift: '41' }),
  biLife('GR8300iW 35 C', '47-800-17', { ng: '3.6', lpg: '2.7', mod: '5.1 to 34.4', out: '5.0 to 33.7', dhwIn: '34.4', dhw: '13', mp: '3.2', h1: '10', h2: '10', h3: '7.2', v1: '14', h4: '29', v2: '29', cond: '4.1', kg: '47', lift: '41' }),
  biLife('GR8300iW 40 C', '47-800-16', { ng: '4.3', lpg: '3.2', mod: '5.1 to 34.4', out: '5.0 to 33.7', dhwIn: '40.8', dhw: '14', mp: '3.0', h1: '11', h2: '11', h3: '8.2', v1: '15', h4: '35', v2: '35', cond: '4.1', kg: '47', lift: '41' }),
  biLife('GR8300iW 45 C', '47-800-15', { ng: '4.6', lpg: '3.4', mod: '5.1 to 34.4', out: '5.0 to 33.8', dhwIn: '43.5', dhw: '15', mp: '3.4', h1: '8', h2: '8', h3: '5.2', v1: '12', h4: '35', v2: '35', cond: '4.1', kg: '49', lift: '43' }),
  biLife('GR8300iW 50 C', '47-800-14', { ng: '5.1', lpg: '3.8', mod: '5.1 to 34.4', out: '5.0 to 33.8', dhwIn: '48.9', dhw: '18', mp: '2.5', h1: '9', h2: '9', h3: '6.2', v1: '12', h4: '40', v2: '40', cond: '4.1', kg: '49', lift: '43' })
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
