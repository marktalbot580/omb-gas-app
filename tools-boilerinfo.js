/* Boiler information cards: key figures copied from the manufacturer's installation manual, with the manual and page named on every card.
   Anything not in the manual is left out, never guessed. Add a boiler by adding an entry to BI_LIST. */
const BI_SRC_8000 = 'Worcester Greenstar 8000+ | 8000+ Style, manual 6721108973 (2025/06): flue pages 17, clearances page 14, technical data pages 83 to 84';
const CFG_STYLE = { key: 'wb-8701-', range: 'Greenstar 8000+ Style', src: BI_SRC_8000, pre: '0.75', gasRows: [['Gas inlet pressure', '20 mbar natural gas, 37 mbar LPG'], ['Gas category', 'CAT II 2H/3P']],
  clear: [['In front', '600 mm. Can be reduced to 450 mm if: case bottom 1000 to 1500 mm from the floor, 450 mm clear in front down to the floor, 200 mm clear below, and 300 mm clear to one side'], ['Either side', '5 mm'], ['Below', '200 mm'], ['Above', '170 or 210 mm, depending on flue size'], ['Compartment depth', '385 mm'], ['Space to removable door', '20 mm']] };
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

/* Ideal Logic Max Combi2 (natural gas only). Figures from the Ideal installation and servicing guide, page numbers on each card. */
const BI_SRC_LMC2 = 'Ideal Logic Max Combi2 installation and servicing guide: tables 1 to 3 page 6, clearances page 11, flue page 18, fault finding pages 55 and 56, combustion check page 67';
const BI_IMINI = { id: 'ideal-imini2-', range: 'i-mini2', src: 'Ideal i-mini2 installation and servicing guide: tables 1 to 3 page 6, clearances page 12, flue page 18, fault finding (gas inlet pressure), combustion check', cp: 12 };
function biIdealCombi(kw, gc, o, c) {
  c = c || { id: 'ideal-lmc2-', range: 'Logic Max Combi2', src: BI_SRC_LMC2, cp: 11 };
  return {
    id: c.id + kw, make: 'Ideal', range: c.range, model: 'C' + kw, type: 'Combi', gc, src: c.src,
    sections: [
      ['Gas', [['Gas rate, natural gas (at maximum)', o.rate + ' m³/h'], ['Gas supply', 'Natural gas only, 20 mbar'], ['Gas pressure at the boiler inlet', 'Above 18 mbar (fault finding)'], ['Injector size', o.inj + ' mm'], ['Gas connection', '15 mm copper compression']]],
      ['Heat', [['Heat input (net), maximum', o.max + ' kW'], ['Heat input (net), minimum', o.min + ' kW'], ['Hot water output, maximum', o.dhwOut + ' kW'], ['Heating output at minimum (70 °C mean)', o.minOut + ' kW']]],
      ['Combustion', [['CO₂ at maximum (hot water), ±0.7', o.co2max + ' %'], ['CO₂ at minimum (heating), ±0.7', o.co2min + ' %'], ['Combustion check', 'CO under 350 ppm and CO/CO₂ ratio under 0.004'], ['NOx class', '6']]],
      ['Hot water', [['Flow at 35 °C rise', o.flow + ' l/min'], ['Specific rate', o.spec + ' l/min'], ['Mains pressure for full flow', o.mp + ' bar'], ['Maximum mains pressure', '10 bar'], ['Runs down to', '2 l/min']]],
      ['Heating circuit', [['Maximum working pressure', '2.5 bar'], ['PRV setting', '3.0 bar'], ['Expansion vessel charge', '0.5 to 0.75 bar'], ['Heating water content', '1.2 litres'], ['Flow and return', '22 mm copper compression']]],
      ['Flue (100 mm concentric)', [['Horizontal, maximum effective length', o.hf + ' m'], ['Vertical, maximum effective length', '7.5 m'], ['Each 45° elbow counts as', '0.6 m'], ['Each 90° elbow counts as', '1.0 m']]],
      ['Clearances', [['Case size (W x H x D)', '395 x 700 x 278 mm'], ['Either side', '2.5 mm from the case'], ['Below, for servicing', '100 mm (15 mm after installation, with an easily removable panel)'], ['In front, in a cupboard', '5 mm from the door, but 450 mm overall with the door open'], ['Above', 'See the clearance diagram, page ' + c.cp]]],
      ['Electrics', [['Supply', '230 V a.c., 50 Hz'], ['Power', o.w + ' W'], ['Fuses', 'External 3 A, internal T4A HRC L250 V']]],
      ['Weight', [['Packaged', o.pkg + ' kg'], ['Lift weight', o.lift + ' kg']]]
    ]
  };
}

/* Regular and system boilers (no hot water section). */
const CLEAR_STD = [['In front', '600 mm'], ['Either side', '5 mm'], ['Below', '200 mm'], ['Above', '170 or 210 mm, depending on flue size'], ['Compartment depth', '385 mm'], ['Space to removable door', '20 mm']];
const CLEAR_STYLE_RS = [['In front', '600 mm. Can be reduced to 450 mm if: case bottom 1000 to 1500 mm from the floor, 450 mm clear in front down to the floor, 200 mm clear below, and 300 mm clear to one side']].concat(CLEAR_STD.slice(1));
const FLUE_8000 = { 30: [17, 17, 14.2, 21, 25, 25], 35: [10, 10, 7.2, 14, 29, 29], 40: [11, 11, 8.2, 15, 35, 35], 45: [8, 8, 5.2, 12, 35, 35], 50: [9, 9, 6.2, 12, 40, 40] };
function biRS(c, size, gc, o) {
  const f = FLUE_8000[size], rows = [];
  return {
    id: c.key + c.letter + size, make: 'Worcester Bosch', range: c.range, model: c.prefix + ' ' + size + ' ' + c.letter, type: c.type, gc, src: c.src,
    sections: [
      ['Gas', [['Gas rate, natural gas (10 min from lighting)', o.ng + ' m³/h'], ['Gas rate, LPG', o.lpg + ' kg/h']].concat(c.gasRows || [])],
      ['Heat', [['Heat input range', o.mod + ' kW']].concat(o.adj ? [['Heating heat input, adjustable', o.adj + ' kW']] : []).concat([['Heating output (80/60 °C)' + (o.adj ? ', adjustable' : ''), o.out + ' kW']])],
      ['Combustion', [['CO₂ at maximum', '9.5 %'], ['CO₂ at minimum', '8.6 %'], ['NOx class', '6']]],
      ['Heating circuit', [['Maximum operating pressure', '2.5 bar']].concat(o.pump ? [['Pump head at 20 °C rise', o.pump + ' m']] : []).concat(c.vessel ? [['Expansion vessel', '10 litres, pre-charge ' + c.vessel + ' bar']] : [])],
      ['Flue (60/100)', [['Horizontal, no plume management', f[0] + ' m'], ['Horizontal, with 500 mm of plume management', f[1] + ' m'], ['Horizontal, with 4500 mm of plume management', f[2] + ' m'], ['Vertical', f[3] + ' m'], ['Each 45° bend counts as', '0.5 m'], ['Each 90° bend counts as', '1.5 m']]],
      ['Flue (80/125)', [['Horizontal (no plume management available)', f[4] + ' m'], ['Vertical', f[5] + ' m'], ['Each 45° bend counts as', '0.5 m'], ['Each 90° bend counts as', '1.5 m']]],
      ['Clearances', [['Case size (W x H x D)', '440 x 780 x 365 mm']].concat(c.clear)],
      ['Condensate and electrics', [['Maximum condensate', o.cond + ' l/h'], ['Condensate pH', 'about 4.5 to 5.0'], ['Supply', '230 V a.c., 50 Hz'], ['Protection rating', 'IPX4D']]],
      ['Weight', [['Appliance', o.kg + ' kg'], ['Lift weight (panels removed)', o.lift + ' kg']]]
    ]
  };
}
const GAS_STYLE_ROWS = [['Gas inlet pressure', '20 mbar natural gas, 37 mbar LPG'], ['Gas category', 'CAT II 2H/3P']];
const CFG_STYLE_R = { key: 'wb-8701-', letter: 'R', prefix: 'GR8701iW', type: 'Regular', range: 'Greenstar 8000+', gasRows: GAS_STYLE_ROWS, clear: CLEAR_STYLE_RS, vessel: '',
  src: 'Worcester Greenstar 8000+ Regular, manual 6721891104 (2024/06): clearances page 16, flue page 19, technical data page 79' };
const CFG_STYLE_S = { key: 'wb-8701-', letter: 'S', prefix: 'GR8701iW', type: 'System', range: 'Greenstar 8000+', gasRows: GAS_STYLE_ROWS, clear: CLEAR_STYLE_RS, vessel: '0.75',
  src: 'Worcester Greenstar 8000+ System, manual 6721891100 (2024/06): clearances page 16, flue page 18, technical data page 84' };
const CFG_LIFE_R = { key: 'wb-8300-', letter: 'R', prefix: 'GR8300iW', type: 'Regular', range: 'Greenstar 8000 Life', gasRows: [], clear: CLEAR_STD, vessel: '',
  src: 'Worcester Greenstar 8000 Life Regular, manual 6720883866 (2019/04): clearances page 15, flue page 16, technical data pages 66 to 69' };
const CFG_LIFE_S = { key: 'wb-8300-', letter: 'S', prefix: 'GR8300iW', type: 'System', range: 'Greenstar 8000 Life', gasRows: [], clear: CLEAR_STD, vessel: '1.0',
  src: 'Worcester Greenstar 8000 Life System, manual 6720883858 (2019/02): clearances page 15, flue page 16, technical data pages 67 to 70' };

/* Greenstar 8000 F floor-standing */
function biF(kind, size, gc, o) {
  const comb = kind === 'C';
  const flue60 = [['Horizontal', '4 m'], ['Vertical', '6.4 m'], ['Each 45° bend counts as', '0.75 m'], ['Each 90° bend counts as', '1.5 m']];
  return {
    id: 'wb-8700if-' + kind + size, make: 'Worcester Bosch', range: 'Greenstar 8000 F', model: 'GR8700iF ' + size + ' ' + kind, type: comb ? 'Combi (floor-standing)' : 'Regular (floor-standing)', gc,
    src: comb ? 'Worcester Greenstar 8000 F Combi, manual 6721106419 (2024/11): clearances page 16, flue page 17, technical data pages 93 to 94' : 'Worcester Greenstar 8000 F Regular, manual 6721106420 (2024/11): clearances page 16, flue page 17, technical data page 87',
    sections: [
      ['Gas', [['Gas rate, natural gas (10 min from lighting)', o.ng + ' m³/h'], ['Gas rate, LPG', o.lpg + ' kg/h'], ['Gas inlet pressure', '20 mbar natural gas, 37 mbar LPG'], ['Gas category', 'CAT II 2H/3P']]],
      ['Heat', [['Heat input range', o.mod + ' kW'], ['Heating output (80/60 °C)', o.out + ' kW']].concat(comb ? [['Hot water output', o.dhwOut + ' kW']] : [])],
      ['Combustion', [['CO₂ at maximum (natural gas)', '9.5 %'], ['CO₂ at minimum (natural gas)', '8.6 %'], ['O₂ at maximum', '4.0 %'], ['O₂ at minimum', '4.6 %'], ['NOx class', '6']]]
    ].concat(comb ? [['Hot water', [['Flow at 40 °C rise', o.flow + ' l/min'], ['Mains pressure for full flow', '2.0 bar working'], ['Minimum mains pressure to run', '0.2 bar'], ['Maximum mains pressure', '10 bar'], ['Minimum flow to start', '1.9 l/min'], ['Temperature range', '35 to 55 °C']]]] : []).concat([
      ['Heating circuit', [['Maximum operating pressure', '2.5 bar'], ['Maximum flow temperature', '60 °C set, up to ' + (comb ? '82' : '88') + ' °C possible']].concat(comb ? [['Pump head at 20 °C rise', '2 m' + (size === '50' ? ' (a low loss header or extra pump is needed for a 20 K differential)' : '')], ['Expansion vessel', '10 litres, pre-charge 0.75 bar']] : [])],
      ['Flue 60/100', flue60],
      ['Flue 80/125', [['Horizontal', '13 m'], ['Vertical', '15 m'], ['Each 45° bend counts as', '1.0 m'], ['Each 90° bend counts as', '2.0 m']]],
      ['Clearances (unventilated compartment)', [['Case size (W x H x D)', (comb ? '600' : '400') + ' x 850 x 600 mm'], ['Overall height', '1450 mm installation, 865 mm maintenance'], ['Overall depth', '1200 mm'], ['Overall width', (comb ? '610' : '410') + ' mm'], ['In front', '600 mm clear standing space, kept clear down to the working surface'], ['Above', '600 mm installation, 15 mm maintenance'], ['Either side', '5 mm'], ['Compartment depth', '625 mm'], ['Space to removable door', '25 mm']]],
      ['Condensate and electrics', [['Maximum condensate', '4.1 l/h'], ['Supply', '230 V a.c., 50 Hz'], ['Power (heating)', o.w + ' W'], ['Protection rating', 'IPX4D']]],
      ['Weight', [['Appliance', o.kg + ' kg']]]
    ])
  };
}

/* Greenstar 4000, 2000 and 1000 combis (natural gas figures; LPG gas rate where the manual gives a clear one). */
function biG(c, model, gc, o) {
  const f = (a) => a.filter(Boolean);
  return {
    id: c.key + model.replace(/\W+/g, '').toLowerCase(), make: 'Worcester Bosch', range: c.range, model, type: 'Combi', gc, src: c.src,
    sections: [
      ['Gas', f([['Gas rate, natural gas (10 min from lighting)', o.ng + ' m³/h'], o.lpg ? ['Gas rate, LPG', o.lpg + ' kg/h'] : null, ['Gas inlet pressure, natural gas', '20 mbar'], o.gcl ? ['Gas Council number, LPG model', o.gcl] : null])],
      ['Heat', [['Heat input range', o.mod + ' kW'], ['Heating output (80/60 °C)', o.out + ' kW'], ['Hot water heat input', o.dhwIn + ' kW']]],
      ['Combustion', [['CO₂ at maximum, natural gas', o.co2a + ' %'], ['CO₂ at minimum, natural gas', o.co2b + ' %'], ['NOx class', '6']]],
      ['Hot water', [['Flow at 40 °C rise', o.d40 + ' l/min'], ['Flow at 35 °C rise', o.d35 + ' l/min'], ['Mains pressure for full flow', o.mp + ' bar working'], ['Minimum mains pressure to run', o.mpmin + ' bar'], ['Maximum mains pressure', '10 bar'], ['Minimum flow to start', o.start + ' l/min']]],
      ['Heating circuit', [['Maximum operating pressure', o.maxop + ' bar'], ['Expansion vessel', '6 litres, pre-charge 0.75 bar'], ['Pump head at 20 °C rise', '2 m']]],
      ['Flue (60/100)', [['Horizontal, maximum', o.h60 + ' m'], ['Vertical, maximum', o.v60 + ' m'], ['Each 45° bend counts as', '0.5 m'], ['Each 90° bend counts as', '1.5 m']]],
      ['Flue (80/125)', [['Horizontal, maximum', o.h80 + ' m'], ['Vertical, maximum', o.v80 + ' m'], ['Each 45° bend counts as', '0.5 m'], ['Each 90° bend counts as', '1.5 m']]],
      ['Clearances', [['Case size (W x H x D)', c.dims]].concat(c.clear)],
      ['Condensate and electrics', [['Maximum condensate', o.cond + ' l/h'], ['Condensate pH', 'about ' + o.ph], ['Supply', '230 V a.c., 50 Hz'], ['Protection rating', 'IPX4D']]],
      ['Weight', [['Appliance', o.kg + ' kg'], ['Lift weight (front panel removed)', o.lift + ' kg']]]
    ]
  };
}
const CLEAR_ABOVE = ['Above', '170 or 210 mm, depending on flue size'];
const CFG_G4 = { key: 'wb-4700-', range: 'Greenstar 4000', dims: '400 x 724 x 310 mm', src: 'Worcester Greenstar 4000, manual 6720891161 (2020/09): clearances page 17, flue page 19, technical data pages 83 to 84. Standard (not Low NOx) versions only',
  clear: [['In front', '600 mm. Can be reduced to 450 mm, see the manual for the conditions'], ['Either side', '5 mm'], ['Below', '186 mm'], CLEAR_ABOVE, ['Compartment depth', '330 mm'], ['Space to removable door', '20 mm']] };
const CFG_G2 = { key: 'wb-2300-', range: 'Greenstar 2000', dims: '400 x 724 x 300 mm', src: 'Worcester Greenstar 2000, manual 6721820552 (2021/02): clearances page 18, flue page 19, technical data pages 87 to 88. Standard (not Low NOx) versions only',
  clear: [['In front', '600 mm. Can be reduced, see the manual for the conditions'], ['Either side', '5 mm'], ['Below', '200 mm'], CLEAR_ABOVE, ['Compartment depth', '320 mm (clearance to combustible material)'], ['Space to removable door', '20 mm']] };
const CFG_G1 = { key: 'wb-1000-', range: 'Greenstar 1000', dims: '395 x 655 x 285 mm', src: 'Worcester Greenstar 1000, manual 6721835943 (2023/08): clearances page 15, flue page 17, technical data page 97. Natural gas models',
  clear: [['In front', '600 mm'], ['Either side', '2.5 mm'], ['Below', '200 mm'], CLEAR_ABOVE, ['Compartment depth', '300 mm (clearance to combustible material)'], ['Space to removable door', '15 mm']] };

/* Ideal Logic Max System2 and Heat2 (natural gas only). Flue lengths are not shown: the manual's length table is headed 24/30/35 kW (the combi sizes), so check the manual. */
function biIdealRS(kind, kw, gc, o) {
  const sys = kind === 'S';
  return {
    id: 'ideal-lm' + kind.toLowerCase() + '2-' + kw, make: 'Ideal', range: sys ? 'Logic Max System2' : 'Logic Max Heat2', model: (sys ? 'S' : 'H') + kw, type: sys ? 'System' : 'Regular', gc,
    src: 'Ideal Logic Max ' + (sys ? 'System2' : 'Heat2') + ' installation and servicing guide: tables 1 and 2 page 6, clearances page 11',
    sections: [
      ['Gas', [['Gas rate, natural gas (at maximum)', o.rate + ' m³/h'], ['Gas supply', 'Natural gas only, 20 mbar'], ['Injector size', (kw === '30' ? '4.65' : '4.15') + ' mm'], ['Gas connection', '15 mm copper compression']]],
      ['Heat', [['Heat input (net), maximum', o.max + ' kW'], ['Heat input (net), minimum', (kw === '30' ? '6.1' : '4.9') + ' kW'], ['Heating output, maximum (70 °C mean)', o.out + ' kW'], ['Heating output, minimum (70 °C mean)', (kw === '30' ? '6.1' : '4.8') + ' kW']]],
      ['Combustion', [['CO₂ at maximum, ±0.7', o.co2a + ' %'], ['CO₂ at minimum, ±0.7', o.co2b + ' %'], ['NOx class', '6']]],
      ['Heating circuit', [['Maximum working pressure', '2.5 bar'], ['Heating water content', '1.2 litres'], ['Flow and return', '22 mm copper compression']]],
      ['Flue (100 mm concentric)', [['Each 45° elbow counts as', '0.6 m'], ['Each 90° elbow counts as', '1.0 m'], ['Maximum flue lengths', 'See the flue section of the manual']]],
      ['Clearances', [['Case size (W x H x D)', '395 x 700 x 278 mm'], ['Below, for servicing', '100 mm (15 mm after installation, with an easily removable panel)'], ['In front, in a cupboard', '5 mm from the door, but 450 mm overall with the door open'], ['Other clearances', 'See the clearance diagram, page 11']]],
      ['Electrics', [['Supply', '230 V a.c., 50 Hz'], ['Power', o.w + ' W'], ['Fuses', 'External 3 A, internal T4A HRC L250 V']]],
      ['Weight', [['Packaged', (sys ? '33.2' : '27.0') + ' kg'], ['Lift weight', (sys ? '27.3' : '21.9') + ' kg']]]
    ]
  };
}

/* Ideal Vogue Max combi and system (natural gas only). Page numbers are PDF pages. */
function biVogue(kind, kw, gc, o) {
  const cb = kind === 'C';
  const hmax = cb ? (kw === '26' ? '10' : '8') : (kw === '32' ? '8' : '10');
  return {
    id: 'ideal-vogue-' + kind.toLowerCase() + '-' + kw, make: 'Ideal', range: cb ? 'Vogue Max Combi' : 'Vogue Max System', model: (cb ? 'C' : 'S') + kw, type: cb ? 'Combi' : 'System', gc,
    src: 'Ideal Vogue Max ' + (cb ? 'Combi' : 'System') + ' installation and servicing guide: tables 1 to 3 page ' + (cb ? '8' : '8') + ', clearances page ' + (cb ? '14' : '13') + ', flue page ' + (cb ? '21' : '20'),
    sections: [
      ['Gas', [['Gas rate, natural gas (at maximum)', o.rate + ' m³/h'], ['Gas supply', 'Natural gas only, 20 mbar'], ['Injector size', o.inj + ' mm'], ['Gas connection', '22 mm copper compression']]],
      ['Heat', [['Heating input (net), maximum', o.max + ' kW'], ['Heating input (net), minimum', o.min + ' kW'], ['Heating output, maximum (70 °C mean)', o.out + ' kW']].concat(cb ? [['Hot water input (net), maximum', o.dhwIn + ' kW'], ['Hot water output, maximum', kw + ' kW']] : [])],
      ['Combustion', [['CO₂ at maximum, ±0.7', o.co2a + ' %'], ['CO₂ at minimum, ±0.7', o.co2b + ' %'], ['NOx class', '6']]]
    ].concat(cb ? [['Hot water', [['Flow at 35 °C rise', o.flow + ' l/min'], ['Specific rate', o.spec + ' l/min'], ['Mains pressure for 35 °C rise flow', o.mp + ' bar'], ['Maximum mains pressure', '10 bar'], ['Minimum flow to start', '1.9 l/min']]]] : []).concat([
      ['Heating circuit', [['Maximum working pressure', '2.5 bar'], ['Heating water content', o.wc + ' litres'], ['Flow and return', '22 mm copper compression']]],
      ['Flue (100 mm concentric)', [['Horizontal, maximum', hmax + ' m, minus any flue kits or bends'], ['Vertical, maximum', '10 m, minus any bends'], ['Each 45° elbow counts as', '0.6 m'], ['Each 90° elbow counts as', '1.0 m']]],
      ['Clearances', [['Case size (W x H x D)', '445 x 740 x 330 mm'], ['Below, for servicing', '100 mm (5 mm after installation, with an easily removable panel)'], ['In front, in a cupboard', '5 mm from the door, but 450 mm overall with the door open'], ['Other clearances', 'See the clearance diagram in the manual']]],
      ['Electrics', [['Supply', '230 V a.c., 50 Hz'], ['Power', o.w + ' W'], ['Fuses', 'External 3 A, internal 4 A time delay']]],
      ['Weight', [['Packaged', o.pkg + ' kg'], ['Installation weight (maximum)', o.inst + ' kg']]]
    ])
  };
}

/* Original Ideal Logic Max combi, system and heat (natural gas only). Page numbers are PDF pages. */
function biLM1(kind, kw, gc, o) {
  const cb = kind === 'C', sy = kind === 'S';
  const nm = cb ? 'Combi' : (sy ? 'System' : 'Heat');
  return {
    id: 'ideal-lm1' + kind.toLowerCase() + '-' + kw, make: 'Ideal', range: 'Logic Max ' + nm + ' (original)', model: kind + kw, type: cb ? 'Combi' : (sy ? 'System' : 'Regular'), gc,
    src: 'Ideal Logic Max ' + nm + ' installation and servicing guide (original, not the "2" model): tables 1 to 3 page 8, clearances page 14',
    sections: [
      ['Gas', [['Gas rate, natural gas (at maximum)', o.rate + ' m³/h'], ['Gas supply', 'Natural gas only, 20 mbar'], ['Injector size', o.inj + ' mm'], ['Gas connection', '15 mm copper compression']]],
      ['Heat', [['Heat input (net), maximum', o.max + ' kW'], ['Heat input (net), minimum', o.min + ' kW'], ['Heating output, maximum (70 °C mean)', o.out + ' kW'], ['Heating output, minimum (70 °C mean)', o.minOut + ' kW']]],
      ['Combustion', [['CO₂ at maximum, ±0.7', o.co2a + ' %'], ['CO₂ at minimum, ±0.7', o.co2b + ' %'], ['NOx class', '6']]]
    ].concat(cb ? [['Hot water', [['Flow at 35 °C rise', o.flow + ' l/min'], ['Specific rate', o.spec + ' l/min'], ['Mains pressure for full flow', o.mp + ' bar'], ['Maximum mains pressure', '10 bar'], ['Runs down to', '2 l/min']]]] : []).concat([
      ['Heating circuit', [['Maximum working pressure', '2.5 bar'], ['Heating water content', '1.2 litres'], ['Flow and return', '22 mm copper compression']]],
      ['Flue (100 mm concentric)', [['Horizontal, maximum', o.hf + ' m, minus any flue kits or bends'], ['Vertical, maximum', '7.5 m, minus any bends'], ['Each 45° elbow counts as', '0.6 m'], ['Each 90° elbow counts as', '1.0 m']]],
      ['Clearances', [['Case size (W x H x D)', '395 x 700 x 278 mm'], ['Below, for servicing', '100 mm (5 mm after installation, with an easily removable panel)'], ['In front, in a cupboard', '5 mm from the door, but 450 mm overall with the door open'], ['Other clearances', 'See the clearance diagram in the manual']]],
      ['Electrics', [['Supply', '230 V a.c., 50 Hz'], ['Power', o.w + ' W'], ['Fuses', 'External 3 A, internal T4A HRC L250 V']]],
      ['Weight', [['Packaged', o.pkg + ' kg'], ['Installation weight (maximum)', o.inst + ' kg']]]
    ])
  };
}

/* Baxi combis. Baxi PDF text is scrambled, so these figures were read from the page images. */
function biBaxiC(c, kw, gc, o) {
  return {
    id: c.key + kw, make: 'Baxi', range: c.range, model: o.model || (kw + ' Combi 2'), type: 'Combi', gc, src: c.src,
    sections: [
      ['Gas', [['Gas rate, natural gas, maximum', o.ng + ' m³/h'], ['Gas rate, natural gas, minimum', o.ngMin + ' m³/h'], o.lpg ? ['Gas rate, LPG, maximum', o.lpg + ' kg/h'] : null, o.lpgMin ? ['Gas rate, LPG, minimum', o.lpgMin + ' kg/h'] : null, ['Gas supply', c.supply || '20 mbar natural gas, 37 mbar LPG']].concat(c.cat === null ? [] : [['Gas category', c.cat || 'I2H / I3P']]).filter(Boolean)],
      ['Heat', [['Heating input, maximum', o.chIn + ' kW'], ['Heating input, minimum (80/60 °C)', o.minIn + ' kW'], ['Heating output, maximum (80/60 °C)', o.chOut + ' kW'], ['Heating output, maximum (50/30 °C)', o.chOut2 + ' kW'], ['Heating output, minimum (80/60 °C)', o.minOut + ' kW'], ['Hot water input', o.dhwIn + ' kW'], ['Hot water output', (o.dhwOut || kw) + ' kW']]],
      ['Combustion', [['NOx class', '6']]],
      ['Hot water', [['Flow at ' + (c.dt1 || 25) + ' °C rise', o.d25 + ' l/min'], ['Flow at ' + (c.dt2 || 35) + ' °C rise', o.d35 + ' l/min'], o.spec ? ['Specific flow (D)', o.spec + ' l/min'] : null, ].concat(c.hwp || [['Minimum mains pressure', '0.8 bar'], ['Maximum mains pressure', '8 bar'], ['Minimum dynamic pressure', '0.15 bar'], ['Minimum flow', '2 l/min']]).filter(Boolean)],
      ['Heating circuit', [['Maximum pressure', c.maxP || '2.5 bar'], ['Minimum pressure', '0.5 bar'], ['Expansion vessel', '7 litres']]],
      ['Flue', c.flue || [['Horizontal concentric 60/100, maximum', '10 m'], ['Horizontal concentric 80/125, maximum', '20 m'], ['Each 135° bend counts as', '0.5 m'], ['Each 93° bend counts as', '1.0 m'], ['Elbow supplied with the flue kit', 'Not counted'], ['Vertical flues', 'See the Flue Installation Guide supplied with the boiler']]],
      ['Clearances', [['Case size (W x H x D)', c.size || '395 x 700 x 285 mm']].concat(c.clear || [['In front', '450 mm for servicing, 5 mm in operation'], ['Either side', '2.5 mm'], ['Below', '150 mm']])],
      ['Electrics', [['Supply', '230 V a.c., 50 Hz'], ['Power', o.w + ' W'], ['Protection rating', c.ip || 'IPX5D']]],
      ['Weight', [[c.kgLabel || 'Empty / filled with water', o.kg + ' kg']]]
    ]
  };
}
const CFG_BX800 = { key: 'baxi-800c2-', range: '800 Combi 2', src: 'Baxi 800 Combi 2 installation and servicing manual: technical data pages 12 to 15, clearances page 29, flue page 31. The manual lists these as 824-2, 830-2 and 836-2' };

const CFG_BX600 = { key: 'baxi-600c2-', range: '600 Combi 2', src: 'Baxi 600 Combi 2 installation and servicing manual: technical data pages 12 to 15, clearances page 29, flue page 31. The manual lists these as 624-2, 630-2 and 636-2' };
const CFG_BX400 = { key: 'baxi-400c2-', range: '400 Combi 2', cat: 'I2H / II2H3P', src: 'Baxi 400 Combi 2 installation and servicing manual: technical data pages 12 to 15, clearances page 29, flue page 31. The manual does not give a Gas Council number',
  clear: [['In front', '1000 mm for servicing, 6 mm in operation'], ['Either side', '2.5 mm'], ['Above', '240 mm minimum'], ['Below', '250 mm minimum']] };
const CFG_BX200 = { key: 'baxi-200c2-', range: '200 Combi 2', cat: 'I2H / II2H3P', src: 'Baxi 200 Combi 2 installation and servicing manual: technical data pages 12 to 15, clearances page 29, flue page 31. The manual does not give a Gas Council number',
  clear: [['In front', '1000 mm for servicing, 6 mm in operation'], ['Either side', '2.5 mm'], ['Below', '250 mm minimum']] };
/* Baxi 400 and 800 Heat (regular, natural gas). Figures from the manual text. */
function biBaxiH(c, model, gc, o) {
  return {
    id: c.key + model, make: 'Baxi', range: c.range, model: model + ' Heat', type: 'Regular', gc, src: c.src,
    sections: [
      ['Gas', [['Gas rate, natural gas (after 10 min)', o.ng + ' m³/h'], ['Gas inlet pressure', '20 mbar natural gas'], ['Gas category', 'CAT I 2H'], ['Gas connection', '22 mm']]],
      ['Heat', [['Heat input (gross), maximum', o.inMax + ' kW'], ['Heat input (gross), minimum', '8.59 kW'], ['Heating output (70 °C mean), maximum', o.out + ' kW'], ['Heating output (70 °C mean), minimum', '7.5 kW']]],
      ['Combustion', [['NOx class', c.nox], ['CO/CO₂ ratio', 'Up to a maximum of 0.004']]],
      ['Heating circuit', [['Flow temperature', '30 to 80 °C (±5 °C)'], ['Water content', o.wc + ' litres'], ['Maximum static head', '25 m'], ['Minimum static head', '0.4 m'], ['Flow and return', '22 mm compression']]],
      ['Flue', [['Horizontal concentric 60/100, maximum', '6 m'], ['Horizontal concentric 80/125, maximum', '12 m'], ['Each 135° bend counts as', '0.5 m'], ['Each 93° bend counts as', '1.0 m'], ['Elbow supplied with the flue kit', 'Not counted'], ['Vertical flues', 'See the Flue Installation Guide supplied with the boiler']]],
      ['Clearances', [['Case size (W x H x D)', '370 x 625 x 270 mm (790 mm high with the flue elbow)'], ['Either side', '5 mm'], ['Above (top flue)', '190 mm'], ['Above (rear flue)', '35 mm'], ['Below', '120 mm (35 mm in a cupboard)'], ['In front', '500 mm for servicing, 5 mm in operation']]],
      ['Electrics', [['Supply', '230 V a.c., 50 Hz'], ['Power', o.w + ' W'], ['External fuse', '3 A'], ['Protection rating', 'IPX4D']]],
      ['Weight', [['Packaged', o.pkg + ' kg'], ['Lift weight', o.lift + ' kg']]]
    ]
  };
}
const CFG_BH4 = { key: 'baxi-400h-', range: '400 Heat', nox: '5', src: 'Baxi 400 Heat ErP installation and servicing manual (7684223-01, 06/17): technical data page 14, flue page 32. Heat inputs are gross' };
const CFG_BH8 = { key: 'baxi-800h-', range: '800 Heat', nox: '6', src: 'Baxi 800 Heat installation and servicing manual (7749898-01, 3/20): technical data page 14, flue page 32. Heat inputs are gross' };

/* Baxi 600 and 800 System 2. Read from the page images. */
function biBaxiS(c, kw, gc, o) {
  return {
    id: c.key + kw, make: 'Baxi', range: c.range, model: kw + ' System 2', type: 'System', gc, src: c.src,
    sections: [
      ['Gas', [['Gas rate, natural gas, maximum', o.ng + ' m³/h'], ['Gas rate, natural gas, minimum', '0.52 m³/h'], ['Gas rate, LPG, maximum', o.lpg + ' kg/h'], ['Gas rate, LPG, minimum', '0.38 kg/h'], ['Gas supply', '20 mbar natural gas, 37 mbar LPG'], ['Gas category', 'I2H / I3P']]],
      ['Heat', [['Heat input, maximum', o.inp + ' kW'], ['Heat input, minimum (80/60 °C)', o.minIn + ' kW'], ['Heating output, maximum (80/60 °C)', kw + ' kW'], ['Heating output, maximum (50/30 °C)', o.out2 + ' kW'], ['Heating output, minimum (80/60 °C)', o.minOut + ' kW'], ['Heating output, minimum (50/30 °C)', o.minOut2 + ' kW']]],
      ['Combustion', [['NOx class', '6']]],
      ['Heating circuit', [['Maximum pressure', '2.5 bar'], ['Minimum pressure', '0.5 bar'], ['Expansion vessel', '7 litres']]],
      ['Flue', [['Horizontal concentric 60/100, maximum', '10 m'], ['Horizontal concentric 80/125, maximum', '20 m'], ['Each 135° bend counts as', '0.5 m'], ['Each 93° bend counts as', '1.0 m'], ['Elbow supplied with the flue kit', 'Not counted'], ['Vertical flues', 'See the Flue Installation Guide supplied with the boiler']]],
      ['Clearances', [['Case size (W x H x D)', '395 x 700 x 285 mm'], ['In front', '450 mm for servicing, 5 mm in operation'], ['Either side', '2.5 mm'], ['Below', '150 mm']]],
      ['Electrics', [['Supply', '230 V a.c., 50 Hz'], ['Power', o.w + ' W'], ['Protection rating', 'IPX5D']]],
      ['Weight', [['Empty / filled with water', o.kg + ' kg']]]
    ]
  };
}
const CFG_BS6 = { key: 'baxi-600s2-', range: '600 System 2', src: 'Baxi 600 System 2 installation and servicing manual: technical data pages 12 to 15, clearances page 29, flue page 31. The manual lists these as 615-2, 618-2 and 624-2' };
const CFG_BS8 = { key: 'baxi-800s2-', range: '800 System 2', src: 'Baxi 800 System 2 installation and servicing manual: technical data pages 12 to 15, clearances page 29, flue page 31. The manual lists these as 818-2, 824-2 and 830-2' };

/* Baxi 600 Combi (original) and Assure Combi: same data layout, figures from the manual text. */
function biBaxiO(c, model, gc, o) {
  return {
    id: c.key + model, make: 'Baxi', range: c.range, model: model + ' ' + c.suffix, type: 'Combi', gc, src: c.src,
    sections: [
      ['Gas', [['Gas rate, natural gas, maximum', o.ng + ' m³/h'], ['Gas rate, natural gas, minimum', o.ngMin + ' m³/h'], o.lpg ? ['Gas rate, LPG, maximum', o.lpg + ' kg/h'] : null, ['Gas supply', '20 mbar natural gas, 37 mbar LPG'], ['Gas Council number, LPG model', o.gcl]].filter(Boolean)],
      ['Heat', [['Hot water input (net), maximum', o.dhwIn + ' kW'], ['Heating input (net), maximum', o.chIn + ' kW'], ['Input (net), minimum', o.minIn + ' kW'], ['Hot water output, maximum', o.dhwOut + ' kW'], ['Heating output (80/60 °C), maximum', o.chOut + ' kW'], ['Heating output (80/60 °C), minimum', o.minOut + ' kW'], ['Heating output (50/30 °C), maximum', o.out2 + ' kW']]],
      ['Hot water', [['Flow at 30 °C rise', o.d30 + ' l/min'], ['Flow at 35 °C rise (specific flow, D)', o.spec + ' l/min'], ['Dynamic minimum pressure', '0.5 bar'], ['Maximum pressure', '8 bar'], ['Minimum flow', '2.0 l/min (2.5 recommended with low-flow taps)']]],
      ['Heating circuit', [['Maximum pressure', '3 bar'], ['Minimum pressure', '0.5 bar'], ['Expansion vessel', '7 litres, pre-charge 1.0 bar'], ['Maximum system volume', '100 litres'], ['Boiler water content', '2.5 litres']]],
      ['Flue', [['Horizontal concentric 60/100, maximum', '10 m'], ['Horizontal concentric 80/125, maximum', '20 m'], ['Each 135° bend counts as', '0.5 m'], ['Each 93° bend counts as', '1.0 m'], ['Elbow supplied with the flue kit', 'Not counted'], ['Vertical flues', 'See the Flue Installation Guide supplied with the boiler']]],
      ['Clearances', [['Case size (W x H x D)', '390 x 700 x 285 mm'], ['In front', '450 mm for servicing, 5 mm in operation'], ['Either side', '5 mm'], ['Above', '178 mm'], ['Below', '200 mm minimum']]],
      ['Electrics', [['Supply', '230 V a.c., 50 Hz'], ['Power when firing', o.w + ' W'], ['External fuse', '3 A'], ['Protection rating', 'IPX5D']]],
      ['Weight', [['Packaged', o.pkg + ' kg'], ['Lift weight (dry)', o.lift + ' kg'], ['Installed, dry', o.inst + ' kg']]]
    ]
  };
}
const CFG_BO6 = { key: 'baxi-600o-', range: '600 Combi (original)', suffix: 'Combi', src: 'Baxi 600 Combi installation and service manual (624, 630 and 636): technical data pages 13 to 15, flue page 34. The separate 624 and 630 manual has the same figures' };
const CFG_BOA = { key: 'baxi-assure-', range: 'Assure Combi', suffix: 'Assure Combi', src: 'Baxi Assure Combi installation and servicing manual: technical data pages 13 to 15, flue page 34' };

const CFG_BX800S = { key: 'baxi-800c-', range: '800 Combi', src: 'Baxi 800 Combi (825, 830, 836) installation and service manual: technical data pages 13 to 15, flue page 34', supply: '20 mbar natural gas', cat: null, dt1: 30, dt2: 35, maxP: '3 bar', size: '390 x 700 x 285 mm', kgLabel: 'Boiler lift weight (dry) / installed weight (dry)', ip: 'IPX5D',
  hwp: [['Maximum mains pressure', '8 bar'], ['Minimum dynamic pressure', '0.5 bar'], ['Minimum flow', '2 l/min']],
  flue: [['Horizontal concentric 60/100, maximum', '10 m'], ['Horizontal concentric 80/125, maximum', '20 m'], ['Each 135° bend counts as', '0.5 m'], ['Each 93° bend counts as', '1.0 m'], ['Elbow supplied with the flue kit', 'Not counted'], ['Vertical flues', 'See the Flue Installation Guide supplied with the boiler']],
  clear: [['Above the case', '178 mm'], ['Below', '150 mm minimum, 200 mm recommended'], ['In front, for servicing', '450 mm'], ['Either side', '5 mm']] };
const CFG_BX21 = { key: 'baxi-400c21-', range: '400 Combi 2.1', src: 'Baxi 400 Combi 2.1 installation and service manual (7875578-02): technical data pages 8 to 10, clearances page 18. Listed in the manual as 424-2.1, 430-2.1 and 436-2.1',
  flue: [['Flue lengths', 'Not given in this manual. See the Flue Installation Guide supplied with the boiler']] };
/* Vaillant combis (natural gas figures; page numbers are PDF pages). */
function biVai(c, model, gc, o) {
  return {
    id: c.key + model.replace(/\W+/g, '').toLowerCase(), make: c.make || 'Vaillant', range: c.range, model, type: 'Combi', gc, src: c.src,
    sections: [
      ['Gas', [['Gas rate, natural gas, hot water maximum', o.ng + ' m³/h'], ['Gas supply', c.gasSup]].concat(c.cat ? [['Gas category', c.cat]] : []).concat(o.ngMin ? [['Gas rate, natural gas, minimum', o.ngMin + ' m³/h']] : [])],
      ['Heat', [['Heating input, maximum', o.chIn + ' kW'], ['Heating input, minimum', o.min + ' kW'], ['Heating output (80/60 °C)', o.out + ' kW'], ['Heating output (50/30 °C)', o.out2 + ' kW'], ['Hot water input, maximum', o.dhwIn + ' kW'], ['Hot water output', o.dhwOut + ' kW']]],
      ['Combustion', [['NOx class', c.nox || '6']]],
      ['Hot water', [['Specific flow (D, 30 K rise)', o.d30 + ' l/min'], ['Flow at 35 K rise', o.d35 + ' l/min']].concat(c.dhwRows).concat([[c.limLabel || 'Cold water flow limiter', o.lim + ' l/min']])],
      ['Heating circuit', c.chRows.concat(o.pump ? [['Pump head at 20 K rise', o.pump]] : [])],
      ['Clearances', [['Case size (W x H x D)', c.dims]].concat(c.clear)],
      ['Flue', [['Maximum flue lengths', 'Not given in this manual. See the separate flue guide supplied with the boiler']]],
      ['Condensate and electrics', [['Condensate, at 50/30 °C', o.cond || c.cond], ['Supply', '230 V a.c., 50 Hz'], ['Power', o.w + ' W'], ['Built-in fuse', 'T2/2A 250 V'], ['Protection rating', 'IPX4D']]],
      ['Weight', [['Appliance', o.kg + ' kg'], ['Filled with water', o.kgw + ' kg']]]
    ]
  };
}
const CFG_VSUS = { key: 'vai-sus72-', range: 'ecoTEC sustain', src: 'Vaillant ecoTEC sustain VUW 7-2 installation and maintenance instructions (0020253094_06): technical data pages 8 to 10, clearances page 14',
  gasSup: '20 mbar natural gas, 37 mbar LPG', cat: 'II2H3P', dims: '440 x 720 x 338 mm', cond: '1.87 l/h',
  dhwRows: [['Minimum flow', '1.7 l/min'], ['Minimum pressure', '0.3 bar'], ['Maximum pressure', '10 bar']],
  chRows: [['Maximum flow temperature', '85 °C (adjustable 30 to 80 °C)'], ['Maximum operating pressure', '2.5 bar'], ['Expansion vessel', '8 litres'], ['Pump head at 20 K rise, bypass in factory position', '0.250 bar'], ['Safety valve opens at', '3.0 bar']],
  clear: [['Above', '165 mm (60/100 flue) or 275 mm (80/125 flue)'], ['Below', '180 mm (about 250 mm best)'], ['Either side', '5 mm (about 50 mm best)'], ['In front', '500 mm for maintenance, 5 mm behind a removable door or panel']] };
const CFG_VFIT = { key: 'vai-fitsus63-', range: 'ecoFIT sustain', src: 'Vaillant ecoFIT sustain VUW 6-3 installation and maintenance instructions (0020230529_06): technical data pages 6 to 8, clearances page 12', limLabel: 'Maximum water flow rate', gasSup: '20 mbar natural gas', cat: 'I2H', dims: '390 x 702 x 295 mm', cond: '1.84 l/h',
  dhwRows: [['Minimum pressure', '0.3 bar'], ['Recommended pressure', '2.0 bar'], ['Maximum pressure', '10 bar']],
  chRows: [['Maximum flow temperature adjustment', '10 to 80 °C (75 °C as supplied)'], ['Maximum operating pressure', '2.5 bar']],
  clear: [['Above (top air/flue connection)', '150 mm'], ['Above (rear air/flue connection)', '20 mm'], ['Below', '150 mm'], ['Either side', '5 mm (70 mm if the side sections have to be removed)'], ['In front', '500 mm']] };

function biVaiR(c, model, type, gc, o) {
  return {
    id: c.key + model.replace(/\W+/g, '').toLowerCase(), make: c.make || 'Vaillant', range: c.range, model, type, gc, src: c.src,
    sections: [
      ['Gas', [o.ngH ? ['Gas rate, natural gas, heating maximum', o.ngH + ' m³/h'] : null, ['Gas rate, natural gas, hot water (cylinder) maximum', o.ngW + ' m³/h'], o.ngMin ? ['Gas rate, natural gas, minimum', o.ngMin + ' m³/h'] : null, ['Gas supply', '20 mbar natural gas'], ['Gas category', 'I2H']].filter(Boolean)],
      ['Heat', [['Heating input, maximum', o.chIn + ' kW'], ['Heating input, minimum', o.min + ' kW'], ['Heating output (80/60 °C)', o.out + ' kW'], ['Heating output (50/30 °C)', o.out2 + ' kW'], ['Hot water (cylinder) input, maximum', o.dhwIn + ' kW'], ['Hot water (cylinder) output', o.dhwOut + ' kW']]],
      ['Combustion', [['NOx class', c.nox]]],
      ['Heating circuit', [['Maximum flow temperature adjustment', '10 to 80 °C (75 °C as supplied)'], ['Maximum permissible pressure', c.maxP], ['Nominal water flow, 20 K rise', o.fl20 + ' l/h'], ['Nominal water flow, 30 K rise', o.fl30 + ' l/h']].concat(c.pump ? [['Pump head at 20 K rise', c.pump]] : [])],
      ['Clearances', [['Case size (W x H x D)', c.dims]].concat(c.clear)],
      ['Flue', o.flue || c.flue || [['Maximum flue lengths', 'Not given in this manual. See the separate flue guide supplied with the boiler']]],
      ['Condensate and electrics', [['Condensate, at 50/30 °C', o.cond + ' l/h'], ['Supply', '230 V a.c., 50 Hz'], ['Power', o.w + ' W'], ['Built-in fuse', 'T2/2A 250 V'], ['Protection rating', 'IPX4D']]],
      ['Weight', [['Appliance', o.kg + ' kg'], ['Filled with water', o.kgw + ' kg']]]
    ]
  };
}
const CFG_VFSYS = { key: 'vai-fitsys63-', range: 'ecoFIT sustain', nox: '5', maxP: '3.0 bar', pump: '0.250 bar', src: 'Vaillant ecoFIT sustain VU 6-3 system boiler installation and maintenance instructions (0020277252_00): technical data pages 44 to 45, clearances page 8',
  dims: '390 x 702 x 295 mm',
  clear: [['Above (top air/flue connection)', '150 mm'], ['Above (rear air/flue connection)', '20 mm'], ['Below', '150 mm'], ['Either side', '5 mm (70 mm if the side sections have to be removed)'], ['In front', '600 mm']] };
const CFG_VFOV = { key: 'vai-fitov63-', range: 'ecoFIT sustain', nox: '6', maxP: '2.5 bar', src: 'Vaillant ecoFIT sustain VU 6-3 OV open-vent boiler installation and maintenance instructions (0020277262_03): technical data pages 6 to 8, clearances page 12',
  dims: '375 x 602 x 295 mm',
  clear: [['Above (top air/flue connection)', '150 mm'], ['Above (rear air/flue connection)', '75 mm'], ['Below', '150 mm'], ['Either side', '5 mm'], ['In front', '500 mm']] };

const CFG_VEPOV = { key: 'vai-epov56-', range: 'ecoTEC plus', nox: '5', maxP: '3.0 bar', src: 'Vaillant ecoTEC plus VU 5-6 OV open-vent boiler installation and maintenance instructions (0020200871_00): technical data pages 39 to 42, clearances page 8',
  dims: '375 x 600 x 280 mm',
  clear: [['Above', '150 mm'], ['Below', '150 mm'], ['Either side', '5 mm'], ['In front', '600 mm']] };
const CFG_GWSUS = { key: 'gw-sus-', make: 'Glow-worm', range: 'Sustain', nox: '5', src: 'Glow-worm Sustain 25c/30c/35c installation and maintenance instructions (0020200954_00): technical data pages 44 to 46, clearances page 10',
  gasSup: '20 mbar natural gas', cat: 'I2H', dims: '390 x 700 x 280 mm', cond: '1.84 l/h',
  dhwRows: [['Minimum pressure', '0.3 bar'], ['Recommended pressure', '2.0 bar'], ['Maximum pressure', '10 bar'], ['Hot water temperature range', '35 to 60 °C']],
  chRows: [['Maximum flow temperature adjustment', '10 to 80 °C (75 °C as supplied)'], ['Maximum permissible pressure', '3.0 bar']],
  clear: [['Above', '150 mm'], ['Below', '150 mm'], ['Either side', '5 mm'], ['In front', '600 mm']] };
const CFG_GWEN = { key: 'gw-en-', make: 'Glow-worm', range: 'Energy', nox: '5', src: 'Glow-worm Energy 25c/30c/35c installation and maintenance instructions (0020177746_00): technical data pages 44 to 45, clearances in section 4.5',
  gasSup: '20 mbar natural gas', cat: 'I2H', dims: '390 x 700 x 280 mm',
  dhwRows: CFG_GWSUS.dhwRows, chRows: CFG_GWSUS.chRows, clear: CFG_GWSUS.clear };
const CFG_GWHOME = { key: 'gw-home-', make: 'Glow-worm', range: 'Home', nox: '5', src: 'Glow-worm Home 25c/30c/35c installation and maintenance instructions (0020206379_02): technical data pages 47 to 49',
  gasSup: '20 mbar natural gas', cat: 'II2H3P', dims: '418 x 740 x 300 mm', cond: '1.53 l/h',
  dhwRows: [['Minimum pressure', '0.3 bar'], ['Maximum pressure', '10 bar'], ['Hot water temperature range', '35 to 60 °C']],
  chRows: [['Maximum flow temperature adjustment', '10 to 80 °C (75 °C as supplied)'], ['Maximum permissible pressure', '3.0 bar']],
  clear: [['Clearances', 'Not shown here. See the clearances drawing in section 4.5 of the manual']] };
const CFG_GWEASI = { key: 'gw-easi3-', make: 'Glow-worm', range: 'Easicom 3', nox: '5', src: 'Glow-worm Easicom 3 24c/28c installation and maintenance instructions (0020239562_02): technical data pages 45 to 46, clearances page 9',
  gasSup: '20 mbar natural gas', dims: '418 x 740 x 300 mm',
  dhwRows: [['Minimum pressure', '0.3 bar'], ['Maximum pressure', '10 bar'], ['Hot water temperature range', '35 to 60 °C']],
  chRows: [['Maximum flow temperature adjustment', '10 to 80 °C (75 °C as supplied)'], ['Maximum operating pressure', '2.5 bar'], ['Expansion relief valve opens at', '3.0 bar']],
  clear: [['Above and below', '150 mm each'], ['Either side', '0 mm (50 mm needed to remove the side section)'], ['In front', '600 mm (5 mm for a cabinet-type casing)']] };
const CFG_GWULT = { key: 'gw-ult3-', make: 'Glow-worm', range: 'Ultimate 3', nox: '5', src: 'Glow-worm Ultimate 3 30c/35c installation and maintenance instructions (0020239566_01): technical data pages 46 to 48, clearances page 9',
  gasSup: '20 mbar natural gas (natural gas only)', dims: '418 x 740 x 300 mm', cond: '2.55 l/h',
  dhwRows: CFG_GWEASI.dhwRows, chRows: CFG_GWEASI.chRows, clear: CFG_GWEASI.clear };
const CFG_GWSR = { key: 'gw-susr-', make: 'Glow-worm', range: 'Sustain', nox: '5', maxP: '3.0 bar', src: 'Glow-worm Sustain 12r/15r/18r installation and maintenance instructions (0020200958_00): technical data pages 38 to 39',
  dims: '375 x 600 x 280 mm', clear: [['Above', '150 mm'], ['Below', '150 mm'], ['Either side', '5 mm'], ['In front', '600 mm']] };
const CFG_GWSS = { key: 'gw-suss-', make: 'Glow-worm', range: 'Sustain', nox: '5', maxP: '3.0 bar', pump: '0.250 bar', src: 'Glow-worm Sustain 12s/15s/18s installation and maintenance instructions (0020200967_00): technical data pages 44 to 46',
  dims: '390 x 700 x 280 mm', clear: [['Above', '150 mm'], ['Below', '150 mm'], ['Either side', '5 mm'], ['In front', '600 mm']] };
const CFG_GWENR = { key: 'gw-enr-', make: 'Glow-worm', range: 'Energy', nox: '5', maxP: '3.0 bar', src: 'Glow-worm Energy 12r to 30r installation and maintenance instructions (0020177748_00): technical data pages 39 to 42',
  dims: '375 x 600 x 280 mm', clear: [['Above', '150 mm'], ['Below', '150 mm'], ['Either side', '5 mm'], ['In front', '600 mm']] };
const CFG_GWENS = { flue: [['Straight flue, 60/100 mm (C13 and C33)', 'Up to 10 m'], ['Straight flue, 80/125 mm (C13 and C33)', 'Up to 25 m'], ['Straight flue, 60/100 mm (C43)', 'Up to 5 m'], ['Bends', 'See the flue section of the manual for what to take off for bends']], key: 'gw-ens-', make: 'Glow-worm', range: 'Energy', nox: '5', maxP: '3.0 bar', pump: '0.250 bar', src: 'Glow-worm Energy 12s to 30s installation and maintenance instructions (0020200964_04): technical data pages 46 to 48',
  dims: '390 x 700 x 280 mm', clear: [['Above (top air/flue connection)', '150 mm'], ['Above (rear air/flue connection)', '20 mm'], ['Below', '150 mm'], ['Either side', '5 mm (70 mm if the side panels have to be removed)'], ['In front', '600 mm']] };
const CFG_GWHR = { key: 'gw-homer-', make: 'Glow-worm', range: 'Home', nox: '5', maxP: '3.0 bar', src: 'Glow-worm Home 12r to 30r installation and maintenance instructions (0020200956_00): technical data pages 39 to 42',
  dims: '375 x 600 x 280 mm', clear: [['Above', '150 mm'], ['Below', '150 mm'], ['Either side', '5 mm'], ['In front', '600 mm']] };
const CFG_GWHS = { key: 'gw-homes-', make: 'Glow-worm', range: 'Home', nox: '5', maxP: '3.0 bar', src: 'Glow-worm Home 12s to 25s installation and maintenance instructions (0020206381_01): technical data pages 44 to 46',
  dims: '418 x 740 x 300 mm', clear: [['Clearances', 'Not shown here. See the clearances drawing in section 4.5 of the manual']] };
const CFG_GWER = { key: 'gw-easir-', make: 'Glow-worm', range: 'Easicom 3', nox: '6', maxP: '2.5 bar', src: 'Glow-worm Easicom 3 25r installation and maintenance instructions (0020238431_03): technical data page 7',
  dims: '375 x 602 mm (depth not given)', clear: [['Above and below', '150 mm each'], ['Either side', '0 mm (50 mm needed to remove the side section)'], ['In front', '600 mm']] };
const CFG_GWES = { key: 'gw-easis-', make: 'Glow-worm', range: 'Easicom 3', nox: '6', maxP: '2.5 bar', pump: '0.220 bar', src: 'Glow-worm Easicom 3 25s installation and maintenance instructions (0020238426_05): technical data page 7',
  dims: '418 x 740 x 300 mm', clear: [['Above and below', '150 mm each'], ['Either side', '0 mm (50 mm needed to remove the side section)'], ['In front', '500 mm (5 mm for a cupboard installation)']] };
const CFG_GWUR = { key: 'gw-ult3r-', make: 'Glow-worm', range: 'Ultimate 3', nox: '5', maxP: '3.0 bar', src: 'Glow-worm Ultimate 3 25r installation and maintenance instructions (0020239568_01): technical data pages 39 to 41, flue lengths page 39, clearances page 8',
  dims: '375 x 602 mm (depth not given)', flue: [['Straight flue, 60/100 mm (C13 and C33)', 'Up to 10 m'], ['Straight flue, 80/125 mm (C13 and C33)', 'Up to 25 m'], ['Straight flue, 60/100 mm (C43)', 'Up to 10 m'], ['Bends', 'See the flue section of the manual for what to take off for bends']],
  clear: [['Above (top air/flue connection)', '150 mm'], ['Above (rear air/flue connection)', '20 mm'], ['Below', '150 mm'], ['Either side', '5 mm (70 mm if the side panels have to be removed)'], ['In front', '600 mm']] };
const CFG_GWUS = { key: 'gw-ult3s-', make: 'Glow-worm', range: 'Ultimate 3', nox: '5', maxP: '2.5 bar', pump: '0.220 bar', src: 'Glow-worm Ultimate 3 25s installation and maintenance instructions (0020239564_01): technical data pages 43 to 45, clearances page 9',
  dims: '418 x 740 x 300 mm', flue: [['Straight flue, 60/100 mm (C13 and C33)', 'Up to 10 m'], ['Straight flue, 80/125 mm (C13 and C33)', 'Up to 25 m'], ['Straight flue, 60/100 mm (C43)', 'Up to 10 m'], ['Bends', 'See the flue section of the manual for what to take off for bends']],
  clear: [['Above and below', '150 mm each'], ['Either side', '0 mm (50 mm needed to remove the side section)'], ['In front', '600 mm (5 mm for a cabinet-type casing)']] };
function biVok(c, model, type, gc, d) {
  const r = (label, v, unit) => (v === undefined || v === null || v === '') ? null : [label, v + (unit ? ' ' + unit : '')];
  const sec = (h, rows) => [h, rows.filter(Boolean)];
  return {
    id: c.key + model.replace(/\W+/g, '').toLowerCase(), make: 'Vokera', range: c.range, model, type, gc, src: c.src,
    sections: [
      sec('Gas', [r('Gas rate, heating maximum', d.gasCH, d.gasU || 'm³/h'), r('Gas rate, hot water maximum', d.gasDHW, d.gasU || 'm³/h'), r('Gas rate, minimum', d.gasMin, d.gasU || 'm³/h'), ['Gas supply', d.inlet || '20 mbar natural gas'], r('Gas category', d.cat)]),
      sec('Heat', [r('Heat input, heating (maximum)', d.inCH, 'kW'), r('Heat input, heating (minimum)', d.inMin, 'kW'), r('Heating output, maximum (80/60 °C)', d.o8Max, 'kW'), r('Heating output, minimum (80/60 °C)', d.o8Min, 'kW'), r('Heating output, maximum (50/30 °C)', d.o5Max, 'kW'), r('Heating output, minimum (50/30 °C)', d.o5Min, 'kW'), r('Heat input, hot water', d.inDHW, 'kW')]),
      sec('Combustion', [r('NOx class', d.nox || '6')]),
      sec('Hot water', [r('Flow rate at 35 K rise', d.flow35, 'l/min'), r('Flow regulator', d.reg, 'l/min'), r('Minimum flow', d.minFlow, 'l/min'), r('Minimum inlet pressure', d.dMin), r('Maximum inlet pressure', d.dMax)]),
      sec('Heating circuit', [r('Maximum working pressure', d.maxP), r('Minimum working pressure', d.minP), r('Expansion vessel', d.vessel), r('Maximum system volume', d.sysVol), r('Vessel pre-charge pressure', d.pre), r('Minimum flow rate', d.minHF)]),
      sec('Clearances', [r('Case size (W x H x D)', d.dims)].concat(c.clear)),
      sec('Flue', [r('Maximum horizontal flue, 60/100 mm', d.fH), r('Maximum vertical flue, 60/100 mm', d.fV), r('Maximum horizontal flue, 80/125 mm', d.fH2), r('Maximum vertical flue, 80/125 mm', d.fV2), r('Maximum horizontal flue, twin 80 mm', d.fHt), r('Maximum vertical flue, twin 80 mm', d.fVt), ['Bends', 'The manual lists a reduction for each bend. Check it before you rely on these lengths']]),
      sec('Electrics', [r('Power', d.pW, 'W'), r('Power, heating', d.pCH, 'W'), r('Power, hot water', d.pDHW, 'W'), ['Supply', '230 V a.c., 50 Hz'], r('Internal fuse', d.fuseI), r('External fuse', d.fuseE)]),
      sec('Weight', [r('Dry weight', d.kg, 'kg')])
    ].filter(x => x[1].length)
  };
}
const CLR_VK = [['Either side', '2 mm (you may have to remove neighbouring parts to take out a component)'], ['Above', '100 mm from the casing, or 25 mm above the flue elbow'], ['Below', '100 mm (4 mm if a removable panel gives the 100 mm)'], ['In front', '450 mm (4 mm in a cupboard if 450 mm is free with the door open or off)']];
const CFG_VKEV = { key: 'vk-evo-', range: 'evolve', src: 'Vokera evolve 24C to 42C installation and servicing instructions: Section 2 Technical data (page 16)', clear: CLR_VK };
const CFG_VKEVS = { key: 'vk-evos-', range: 'evolve', src: 'Vokera evolve S 18 to 35 installation and servicing instructions: Section 2 Technical data', clear: CLR_VK };

const CLR_VK12 = [['Either side', '12 mm'], ['Above', '150 mm from the casing, or 25 mm above the flue elbow'], ['Below', '150 mm'], ['In front', '600 mm']];
const CLR_VKI = [['Either side', '2 mm (25 mm if you need to take the side panels off)'], ['Above', '165 mm from the casing, or 25 mm above the flue elbow'], ['Below', '150 mm (5 mm if a removable panel gives the 150 mm)'], ['In front', '4 mm, if a door or panel gives 450 mm access for maintenance']];
const CFG_VKEPL = { key: 'vk-eplus-', range: 'Easi-Heat Plus', src: 'Vokera Easi-Heat Plus 25C and 29C installation and servicing instructions (02-2017): Section 2 Technical data (page 6 to 7)', clear: CLR_VK12 };
const CFG_VKEHI = { key: 'vk-ehi-', range: 'Easi-Heat i', src: 'Vokera Easi-Heat i 25C and 29C installation and servicing instructions: Section 2 Technical data (page 10 to 11)', clear: CLR_VKI };
const CFG_VKVMC = { key: 'vk-vmaxc-', range: 'Vibe Max', src: 'Vokera Vibe Max 26C and 30C installation and servicing instructions: Section 2 Technical data (page 10 to 11)', clear: CLR_VKI };
const CFG_VKVMS = { key: 'vk-vmaxs-', range: 'Vibe Max', src: 'Vokera Vibe Max 20S and 25S installation and servicing instructions: Section 2 Technical data (page 9 to 10)', clear: CLR_VKI };
const CFG_VKVA = { key: 'vk-vibea-', range: 'Vibe', src: 'Vokera Vibe 20A and 25A installation and servicing instructions: Section 2 Technical data (page 6 to 7)', clear: CLR_VK12 };
const CFG_VKUM = { key: 'vk-unicamax-', range: 'Unica Max', src: 'Vokera Unica Max 30C, 35C and 40C installation and servicing instructions: Section 2 Technical data (page 12 to 13)', clear: CLR_VK };
const CFG_VKMY = { key: 'vk-mynute-', range: 'Mynute i', src: 'Vokera Mynute i20 and i30 installation and servicing instructions: Section 2 Technical data (page 7 to 8)', clear: CLR_VK12 };
const CFG_VKUI = { key: 'vk-unicai-', range: 'Unica i', src: 'Vokera Unica i28, i32 and i36 installation and servicing instructions: Section 2 Technical data (page 7 to 8)', clear: CLR_VK12 };
const CFG_VKLO = { key: 'vk-linea-', range: 'Linea ONE', src: 'Vokera Linea ONE installation and servicing instructions: Section 2 Technical data (page 3 to 4)',
  clear: [['Either side', '12 mm on the left, 25 mm on the right'], ['Above', '150 mm from the casing, or 25 mm above the flue elbow'], ['Below', '150 mm'], ['In front', '600 mm']] };
function biAlp(c, model, type, gc, d) {
  const r = (label, v, unit) => (v === undefined || v === null || v === '') ? null : [label, v + (unit ? ' ' + unit : '')];
  const sec = (h, rows) => [h, rows.filter(Boolean)];
  const hw = type === 'Combi' ? '' : ' (cylinder)';
  return {
    id: c.key + model.replace(/\W+/g, '').toLowerCase(), make: 'Alpha', range: c.range, model, type, gc, src: c.src,
    sections: [
      sec('Gas', [r('Gas rate, natural gas, maximum', d.gas, 'm³/h'), ['Gas supply', '20 mbar natural gas']]),
      sec('Heat', [r('Heat input, heating (net)', d.inNetCH, 'kW'), r('Heat input, hot water' + hw + ' (net)', d.inNetDHW, 'kW'), r('Heating output (80/60 °C)', d.outNon, 'kW'), r('Heating output (50/30 °C)', d.outCond, 'kW'), r('Heating output, minimum', d.outMin, 'kW'), r('Hot water output' + hw + ', nominal', d.outDHW, 'kW'), r('Hot water output, maximum', d.outDHWmax, 'kW')]),
      sec('Combustion', [r('NOx class', d.nox)]),
      sec('Hot water', [r('Flow at 35 K rise', d.flow35, 'l/min'), r('Flow at 30 K rise', d.flow30, 'l/min')]),
      sec('Heating circuit', [r('Maximum flow temperature', d.maxT, '°C'), r('Maximum system pressure', d.maxP, 'bar'), r('Minimum system pressure', d.minP, 'bar'), r('Recommended cold pressure', d.recP, 'bar'), r('Safety valve opens at', d.prv, 'bar'), r('Expansion vessel', d.vessel, 'litres'), r('Vessel charge pressure', d.charge, 'bar')]),
      sec('Clearances', [['Case size (W x H x D)', d.w + ' x ' + d.h + ' x ' + d.dp + ' mm'], r('Below', d.bottom, 'mm'), r('Below, if using the wall jig', d.jig, 'mm'), r('Above, horizontal flue', d.topH, 'mm'), r('Above, vertical flue', d.topV, 'mm'), r('Either side', d.sides, 'mm'), r('In front', d.front, 'mm')]),
      sec('Flue', [r('Maximum horizontal flue', d.fH, 'm'), r('Maximum vertical flue, including terminal', d.fV, 'm'), ['Each extra 90° bend', 'Counts as 1.3 m of flue'], ['Each 45° bend', 'Counts as 0.9 m of flue'], ['Vertical terminal', 'Counts as 1 m of flue']]),
      sec('Electrics', [r('Power, maximum', d.pw, 'W'), ['Supply', '230 V a.c., 50 Hz']]),
      sec('Weight', [r('Appliance', d.kg, 'kg'), r('Filled with water (approx.)', d.kgw, 'kg')])
    ].filter(x => x[1].length)
  };
}
const CFG_ALIN = { key: 'alin-', range: 'InTec', src: 'Alpha InTec 30C and 34C installation and servicing instructions: Technical data (section 2)' };
const CFG_ALIN2 = { key: 'alin2-', range: 'InTec2', src: 'Alpha InTec2 26CE, 30CE and 35CE installation and servicing instructions: Technical data (section 2)' };
const CFG_ALER = { key: 'aler-', range: 'E-Tec', src: 'Alpha E-Tec 15R, 20R and 25R installation and servicing instructions: Technical data (section 3)' };
const CFG_ALES = { key: 'ales-', range: 'E-Tec', src: 'Alpha E-Tec 20S, 30S and 35S installation and servicing instructions: Technical data (section 3)' };
const CFG_ALEC = { key: 'alec-', range: 'E-Tec', src: 'Alpha E-Tec 28 and 33 installation and servicing instructions: Technical data (section 3)' };
const CFG_ALEP = { key: 'alep-', range: 'E-Tec Plus', src: 'Alpha E-Tec Plus 28, 33 and 38 installation and servicing instructions: Technical data (section 3)' };
const CFG_ALEV = { key: 'alev-', range: 'Evoke', src: 'Alpha Evoke 28 and 33 installation and servicing instructions: Technical data (section 3)' };
function biBia(c, model, type, gc, d) {
  const r = (label, v, unit) => (v === undefined || v === null || v === '') ? null : [label, v + (unit ? ' ' + unit : '')];
  const sec = (h, rows) => [h, rows.filter(Boolean)];
  const hw = type === 'Combi' ? '' : ' (cylinder)';
  return {
    id: c.key + model.replace(/\W+/g, '').toLowerCase(), make: 'Biasi', range: c.range, model, type, gc, src: c.src,
    sections: [
      sec('Gas', [r('Gas rate, natural gas, heating, maximum', d.gasCH, 'm³/h'), r('Gas rate, natural gas, hot water, maximum', d.gasDHW, 'm³/h'), r('Gas rate, natural gas, minimum', d.gasMin, 'm³/h'), ['Gas supply', '20 mbar natural gas']]),
      sec('Heat', [r('Heat input, heating (net)', d.inCH, 'kW'), r('Heat input, hot water' + hw + ' (net)', d.inDHW, 'kW'), r('Heat input, minimum (net)', d.inMin, 'kW'), r('Heating output, maximum (80/60 °C)', d.outMax, 'kW'), r('Heating output, maximum, condensing (50/30 °C)', d.outCond, 'kW'), r('Hot water output' + hw + ', maximum', d.outDHW, 'kW'), r('Output, minimum', d.outMin, 'kW')]),
      sec('Combustion', [r('NOx class', d.nox), r('CO₂, natural gas, at maximum', d.co2max, '%'), r('CO₂, natural gas, at minimum', d.co2min, '%')]),
      sec('Hot water', [r('Temperature setting range', d.dhwT, '°C'), r('Flow at 35 K rise', d.flow35, 'l/min'), r('Flow at 30 K rise', d.flow30, 'l/min'), r('Maximum mains pressure', d.dhwMaxP, 'bar'), r('Minimum mains pressure', d.dhwMinP, 'bar')]),
      sec('Heating circuit', [r('Flow temperature setting range', d.chT, '°C'), r('Maximum system pressure', d.maxP, 'bar'), r('Minimum system pressure', d.minP, 'bar'), r('Expansion vessel', d.vessel, 'litres'), r('Vessel charge pressure', d.charge, 'bar'), r('Largest system water volume with this vessel', d.sysVol, 'litres')]),
      sec('Clearances', [['Case size (W x H x D)', d.w + ' x ' + d.h + ' x ' + d.dp + ' mm'], r('Above', d.top, 'mm'), r('Either side', d.sides, 'mm'), r('Left side', d.left, 'mm'), r('Right side', d.right, 'mm'), r('Below', d.bottom, 'mm')]),
      sec('Flue', d.flue || [r('Coaxial 60/100 mm, maximum length', d.fCoax, 'm'), r('Split 80 mm, maximum length (air + flue added together)', d.fSplit, 'm'), ['Coaxial bends: each 45° / 90°', 'Take off 0.5 m / 1 m'], ['80 mm bends: each 45° / 90°', 'Take off 0.9 m / 1.65 m'], ['Other kits (roof, pluming)', 'See the flue section of the manual']]),
      sec('Electrics', [r('Power, maximum', d.pw, 'W'), ['Supply', '230 V a.c., 50 Hz']]),
      sec('Weight', [r('Appliance (dry)', d.kg, 'kg')])
    ].filter(x => x[1].length)
  };
}
const CLR_BIA = { top: '250', sides: '25', bottom: '200' };
const CFG_BIAP = { key: 'biap-', range: 'Advance Plus', src: 'Biasi Advance Plus 25C, 30C and 35C ERP installation instructions (Aug 2019): Technical data (4.3 to 4.5) and Installation (section 6)' };
const CFG_BIIN = { key: 'biin-', range: 'Inovia', src: 'Biasi Inovia 25C, 30C and 35C ERP installation instructions (March 2020): Technical data (4.5 to 4.7) and Installation (section 6)' };
const BIA_COMBI = { nox: '6', dhwT: '35 to 55', chT: '25 to 85', maxP: '2.5', minP: '0.3', dhwMaxP: '10', dhwMinP: '0.3', vessel: '7', charge: '1.0', sysVol: '109', h: '700', w: '400', dp: '290', fCoax: '10', fSplit: '40', ...CLR_BIA };
const CFG_BIAPO = { key: 'biapo-', range: 'Advance Plus', src: 'Biasi Advance Plus 25C, 30C and 35C installation instructions: Technical data (4.3 to 4.5) and Installation (section 6)' };
const CFG_BIINO = { key: 'biino-', range: 'Inovia', src: 'Biasi Inovia 25C, 30C and 35C installation instructions: Technical data (4.3 to 4.5) and Installation (section 6)' };
const BIA_COMBI_OLD = { ...BIA_COMBI, nox: '5' };
const CFG_BIAPSE = { key: 'biapse-', range: 'Advance Plus', src: 'Biasi Advance Plus 25S and 30S ERP installation instructions: Technical data (4.3 and 4.4) and Installation (section 6)' };
const CFG_BIAPS16 = { key: 'biaps16-', range: 'Advance Plus', src: 'Biasi Advance Plus 16S ERP installation instructions: Technical data (4.5) and Installation (section 6)' };
const CFG_BIAPS = { key: 'biaps-', range: 'Advance Plus', src: 'Biasi Advance Plus 16S, 25S and 30S installation instructions: Technical data (4.5 to 4.7) and Installation (section 6)' };
const CFG_BIINS = { key: 'biins-', range: 'Inovia', src: 'Biasi Inovia 16S and 25S installation instructions: Technical data (4.3 and 4.4) and Installation (section 6)' };
const CFG_BIINSE = { key: 'biinse-', range: 'Inovia', src: 'Biasi Inovia 25S ERP installation instructions: Technical data (4.5) and Installation (section 6)' };
const BIA_SYS = { chT: '25 to 85', maxP: '2.5', minP: '0.3', vessel: '7', charge: '1.0', sysVol: '109', h: '700', w: '400', dp: '290', fCoax: '10', fSplit: '40', ...CLR_BIA };
const BIA_16 = { inCH: '16.0', inMin: '6.0', outMax: '15.6', outCond: '17.1', outMin: '5.8', gasCH: '1.69' };
const BIA_25 = { inCH: '25.0', inMin: '6.0', outMax: '24.4', outCond: '26.6', outMin: '5.8', gasCH: '2.67' };
const BIA_30 = { inCH: '30.0', inMin: '8.5', outMax: '29.5', outCond: '32.1', outMin: '8.3', gasCH: '3.17' };
const CFG_BIRC = { key: 'birc-', range: 'Riva Plus HE', src: 'Biasi Riva Plus HE 24C and 28C ERP installation instructions: Technical data (4.3 and 4.4) and Installation (section 6)' };
const CFG_BIRS = { key: 'birs-', range: 'Riva Plus HE', src: 'Biasi Riva Plus HE 24S and 28S ERP installation instructions: Technical data (4.3 and 4.4) and Installation (section 6)' };
const BIA_RIVA = { nox: '2', chT: '50 to 85', maxP: '2.5', minP: '0.3', vessel: '8', charge: '1.0', sysVol: '124', h: '803', w: '400', dp: '350', top: '250', left: '25', right: '50', bottom: '200',
  flue: [['Coaxial 60/100 mm, straight horizontal, maximum', '2.5 m'], ['Coaxial 60/100 mm with 90° kit, maximum', '2.7 m'], ['Roof kit, maximum height', '8.5 m'], ['Split 80 mm, longest length in the restrictor table (air + flue added together)', '30 m'], ['Split 80 mm: restrictor needed', 'Ø 50 mm for 1 to 15 m; Ø 55 mm for over 15 m up to 30 m'], ['Coaxial bends: each 45° / 90°', 'Take off 0.5 m / 1 m'], ['80 mm bends: each 45° / 90°', 'Take off 0.9 m / 1.65 m'], ['Other kits (pluming)', 'See the flue section of the manual']] };
const CFG_BIM296 = { key: 'bim296-', range: 'Riva Plus HE (M296)', src: 'Biasi Riva Plus HE M296.24SM/C and M296.28SM/C installation instructions: Technical data (4.3 and 4.4) and Installation (section 6)' };
const BIA_M296 = { ...BIA_RIVA, vessel: '6', sysVol: '94', left: undefined, right: undefined, sides: '25',
  flue: [['Coaxial 60/100 mm, longest equivalent length (with extensions)', '2.7 m'], ['Roof kit, maximum height', '8.5 m'], ['Split 80 mm, longest length in the restrictor table (air + flue added together)', '30 m'], ['Split 80 mm: restrictor needed', 'Ø 50 mm for 1 to 15 m; Ø 55 mm for over 15 m up to 30 m'], ['Coaxial bends: each 45° / 90°', 'Take off 0.5 m / 1 m'], ['80 mm bends: each 45° / 90°', 'Take off 0.9 m / 1.65 m'], ['Other kits (pluming)', 'See the flue section of the manual']] };
const CFG_BIOV = { key: 'biov-', range: 'Advance (open vent)', src: 'Biasi Advance 15OV, 18OV and 24OV installation instructions: Technical data (4.3 to 4.5) and Installation (section 6)' };
const CFG_BIM110 = { key: 'bim110-', range: 'Riva Advance HE', src: 'Biasi Riva Advance HE M110B.24SM/C and M110B.32SM/C installation instructions: Technical data (4.3 and 4.4) and Installation (section 6)' };
const BIA_OV = { nox: '6', chT: '25 to 80', maxP: '2.5', minP: '0.3', h: '700', w: '400', dp: '290', fCoax: '10', fSplit: '40', ...CLR_BIA };
const BIA_M110 = { dhwT: '35 to 55', dhwMaxP: '10', dhwMinP: '0.3', chT: '25 to 85', maxP: '2.5', minP: '0.3', vessel: '7', charge: '1.0', sysVol: '109', h: '803', w: '400', dp: '350', ...CLR_BIA,
  flue: [['Coaxial 60/100 mm, longest equivalent length (with extensions)', '10 m'], ['Roof kit 80/125 mm, maximum height', '10 m'], ['Coaxial bends: each 45° / 90°', 'Take off 0.5 m / 1 m'], ['80 mm bends: each 45° / 90°', 'Take off 0.9 m / 1.65 m'], ['Split 80 mm and pluming kits', 'See the flue section of the manual']] };
function biFer(c, model, type, gc, d) {
  const r = (label, v, unit) => (v === undefined || v === null || v === '') ? null : [label, v + (unit ? ' ' + unit : '')];
  const sec = (h, rows) => [h, rows.filter(Boolean)];
  const hw = type === 'Combi' ? '' : ' (cylinder)';
  return {
    id: c.key + model.replace(/\W+/g, '').toLowerCase(), make: 'Ferroli', range: c.range, model, type, gc, src: c.src,
    sections: [
      sec('Gas', [r('Gas rate, natural gas, maximum', d.gasMax, 'm³/h'), r('Gas rate, natural gas, minimum', d.gasMin, 'm³/h'), ['Gas supply', '20 mbar natural gas']]),
      sec('Heat', [r('Heat input, heating, maximum', d.inCH, 'kW'), r('Heat input, hot water' + hw + ', maximum', d.inDHW, 'kW'), r('Heat input, minimum', d.inMin, 'kW'), r('Heating output, maximum (80/60 °C)', d.outCH, 'kW'), r('Heating output, minimum (80/60 °C)', d.outCHmin, 'kW'), r('Heating output, maximum (50/30 °C)', d.outCond, 'kW'), r('Heating output, minimum (50/30 °C)', d.outCondMin, 'kW'), r('Hot water output, maximum', d.outDHW, 'kW')]),
      sec('Combustion', [r('NOx class', d.nox), r('CO₂, natural gas', d.co2, '%')]),
      sec('Hot water', [r('Temperature setting range', d.dhwT, '°C'), r('Flow at 35 K rise', d.flow35, 'l/min'), r('Flow at 30 K rise', d.flow30, 'l/min'), r('Flow at 25 K rise', d.flow25, 'l/min'), r('Maximum mains pressure', d.dhwMaxP, 'bar'), r('Minimum mains pressure', d.dhwMinP, 'bar')]),
      sec('Heating circuit', [r('Maximum flow temperature', d.maxT, '°C'), r('Maximum system pressure', d.maxP, 'bar'), r('Minimum system pressure', d.minP, 'bar'), r('Expansion vessel', d.vessel, 'litres'), r('Vessel charge pressure', d.charge, 'bar'), r('Water content of boiler', d.water, 'litres')]),
      sec('Clearances', [['Case size (W x H x D)', d.w + ' x ' + d.h + ' x ' + d.dp + ' mm'], r('Above', d.top, 'mm'), r('Either side', d.sides, 'mm'), r('Below', d.bottom, 'mm'), r('In front (via an openable panel)', d.front, 'mm')]),
      sec('Flue', d.flue),
      sec('Electrics', [r('Power, maximum', d.pw, 'W'), ['Supply', '230 V a.c., 50 Hz']]),
      sec('Weight', [r('Appliance (empty)', d.kg, 'kg')])
    ].filter(x => x[1].length)
  };
}
const CFG_FBT = { key: 'fbt-', range: 'Bluehelix Tech RRT', src: 'Ferroli Bluehelix Tech RRT installation and servicing instructions: Technical data table (section 4) and Flue (section 1)' };
const CFG_FBP = { key: 'fbp-', range: 'Bluehelix Pro RRT', src: 'Ferroli Bluehelix Pro RRT 18S, 24S and 30S installation and servicing instructions: Technical data table (section 4) and Flue (section 1)' };
const CLR_FER = { top: '300', sides: '25', bottom: '200', front: '600' };
function FER_FLUE(h80, twin) {
  return [['Coaxial 60/100 mm, maximum horizontal', '7 m'], ['Coaxial 60/100 mm, maximum vertical', '8 m'], ['Coaxial 80/125 mm, maximum length', h80 + ' m'], ['Coaxial 60/100 bends: each 45° / 90°', 'Take off 0.5 m / 1 m'], ['Coaxial 80/125 bends: each 45° / 90°', 'Take off 0.25 m / 0.5 m'], ['Split 80 mm, maximum (all parts added up as equivalent metres)', twin + ' equivalent m'], ['Split 80 mm: what each part counts as', 'See the loss table in the manual']];
}
const CFG_FTO = { key: 'fto-', range: 'T-One HE', src: 'Ferroli T-One 25C HE and 30C HE instructions: Technical data table (4.4) and Flue (section 1)' };
const CFG_FOPC = { key: 'fopc-', range: 'Optimax HE Plus', src: 'Ferroli Optimax HE Plus C instructions: Technical data table (4.4) and Flue (section 1)' };
const CFG_FOPS = { key: 'fops-', range: 'Optimax HE Plus', src: 'Ferroli Optimax HE Plus 18 S, 25 S and 35 S instructions: Technical data table (4.4) and Flue (section 1)' };
function FER_FLUE2(h, v, h2, v2, twin) {
  return [['Coaxial 60/100 mm, maximum horizontal', h + ' m'], v ? ['Coaxial 60/100 mm, maximum vertical', v + ' m'] : null, ['Coaxial 80/125 mm, maximum horizontal', h2 + ' m'], v2 ? ['Coaxial 80/125 mm, maximum vertical', v2 + ' m'] : null, ['Coaxial 60/100 bends: each 45° / 90°', 'Take off 0.5 m / 1 m'], ['Coaxial 80/125 bends: each 45° / 90°', 'Take off 0.25 m / 0.5 m'], twin ? ['Split 80 mm, maximum (all parts added up as equivalent metres)', twin + ' equivalent m'] : ['Split 80 mm', 'See the manual'], ['Split 80 mm: what each part counts as', 'See the loss table in the manual']].filter(Boolean);
}
const CFG_FMC = { key: 'fmc-', range: 'Modena HE', src: 'Ferroli Modena 27C HE and 32C HE instructions: Technical data table (4.4) and Flue (section 1)' };
const CFG_FMC38 = { key: 'fmc38-', range: 'Modena HE', src: 'Ferroli Modena 38C HE instructions: Technical data table (4.4) and Flue (section 1)' };
const CFG_FMS = { key: 'fms-', range: 'Modena HE', src: 'Ferroli Modena 18S, 25S and 32S HE instructions: Technical data table (4.4) and Flue (section 1)' };
const CLR_FMO = { top: '300', sides: '25', bottom: '200', front: '600' };
function biVie(c, model, type, gc, d) {
  const r = (label, v, unit) => (v === undefined || v === null || v === '') ? null : [label, v + (unit ? ' ' + unit : '')];
  const sec = (h, rows) => [h, rows.filter(Boolean)];
  return {
    id: c.key + model.replace(/\W+/g, '').toLowerCase(), make: 'Viessmann', range: c.range, model, type, gc, src: c.src,
    sections: [
      sec('Gas', [r('Gas rate, natural gas, heating, maximum', d.gasCH, 'm³/h'), r('Gas rate, natural gas, hot water, maximum', d.gasDHW, 'm³/h'), ['Gas supply', '20 mbar natural gas']]),
      sec('Heat', [r('Heat input range (net)', d.inRange, 'kW'), r('Heating output range (50/30 °C)', d.out5030, 'kW'), r('Heating output range (80/60 °C)', d.out8060, 'kW'), r('Hot water output range', d.outDHW, 'kW'), r('Hot water input range (net)', d.inDHW, 'kW')]),
      sec('Combustion', [r('NOx class', d.nox)]),
      sec('Hot water', [r('Temperature setting range', d.dhwT, '°C'), r('Flow at 35 K rise', d.flow35, 'l/min'), r('Flow at 30 K rise', d.flow30, 'l/min'), r('Maximum set flow rate', d.setFlow, 'l/min'), r('Minimum flow to fire', d.minFlow, 'l/min'), r('Maximum mains pressure', d.dhwMaxP, 'bar'), r('Minimum mains pressure', d.dhwMinP, 'bar')]),
      sec('Heating circuit', [r('Flow temperature setting range', d.chT, '°C'), r('Maximum system pressure', d.maxP, 'bar'), r('Minimum system pressure (cold)', d.minP, 'bar'), r('Expansion vessel', d.vessel, 'litres'), r('Vessel charge pressure', d.charge, 'bar'), r('Largest system water volume with this vessel', d.sysVol, 'litres'), r('Water content of boiler', d.water, 'litres')]),
      sec('Clearances', [d.w ? ['Case size (W x H x D)', d.w + ' x ' + d.h + ' x ' + d.dp + ' mm'] : null, r('Above', d.top, 'mm'), r('Either side', d.sides, 'mm'), r('Below', d.bottom, 'mm'), r('In front (for servicing)', d.front, 'mm')]),
      sec('Flue', d.flue),
      sec('Electrics', [r('Power, maximum', d.pw, 'W'), ['Supply', '230 V a.c., 50 Hz']]),
      sec('Weight', [r('Lift weight (without packaging)', d.kg, 'kg')])
    ].filter(x => x[1].length)
  };
}
const CFG_VIB = { key: 'vib-', range: 'Vitodens 050-W (BPJD)', src: 'Viessmann Vitodens 050-W type BPJD installation and service instructions: Specification, Product information and Preparing for installation' };
const CFG_VIB2 = { key: 'vib2-', range: 'Vitodens 050-W (BPJD)', src: 'Viessmann Vitodens 050-W type BPJD installation and service instructions (later issue): Specification, Product information and Preparing for installation' };
const CFG_VI2 = { key: 'vi2-', range: 'Vitodens 200-W (WB2B)', src: 'Viessmann Vitodens 200-W WB2B installation instructions (06/2007): Technical specification, Installation clearances and Flue system' };
const CFG_VI1A = { key: 'vi1a-', range: 'Vitodens 100-W (WB1A)', src: 'Viessmann Vitodens 100-W WB1A installation and service instructions: Technical specification, Installation clearances and Flue system specifications' };
const VIE_NOFLUE = [['Maximum flue lengths', 'Not given in this manual. See the separate flue guide supplied with the boiler']];
const VIE_FLUE_WB1A = [['Coaxial 60/100 mm horizontal, maximum length (including one 87° elbow)', '6 m'], ['Coaxial 60/100 mm vertical, maximum length', '10 m'], ['Each extra 87° elbow', 'Take off 1 m'], ['Each extra 45° elbow', 'Take off 0.5 m']];
const VIE_FLUE_WB = [['Coaxial 60/100 mm horizontal, maximum length (including one 87° elbow)', '6 m'], ['Coaxial 60/100 mm vertical, maximum length', '10 m'], ['Each extra 87° elbow', 'Take off 1 m'], ['Each extra 45° elbow', 'Take off 0.5 m']];
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
  ,
  biIdealCombi('24', '47-387-03', { rate: '2.512', inj: '4.15', max: '24.3', min: '4.9', dhwOut: '24.2', minOut: '4.8', co2max: '9.2', co2min: '8.5', flow: '9.9', spec: '11.5', mp: '0.8', hf: '9.0', w: '94', pkg: '34.8', lift: '28.5' }),
  biIdealCombi('30', '47-387-04', { rate: '3.135', inj: '4.65', max: '30.4', min: '6.1', dhwOut: '30.3', minOut: '6.1', co2max: '9.3', co2min: '8.5', flow: '12.4', spec: '14.5', mp: '1.3', hf: '8.0', w: '93', pkg: '35', lift: '28.6' }),
  biIdealCombi('35', '47-387-05', { rate: '3.657', inj: '4.9', max: '35.4', min: '7.1', dhwOut: '35.3', minOut: '7.1', co2max: '9.7', co2min: '8.8', flow: '14.5', spec: '16.9', mp: '1.3', hf: '6.0', w: '110', pkg: '35', lift: '28.6' })
  ,
  biRS(CFG_STYLE_R, 30, '41-800-29', { ng: '3.2', lpg: '2.3', mod: '3.0 to 30.2', adj: '15.1 to 30.2', out: '14.8 to 29.6', pump: '7.0', cond: '3.5', kg: '47', lift: '41' }),
  biRS(CFG_STYLE_R, 35, '41-800-30', { ng: '3.6', lpg: '2.7', mod: '5.1 to 34.4', adj: '17.2 to 34.4', out: '16.9 to 33.7', pump: '6.5', cond: '4.1', kg: '47', lift: '41' }),
  biRS(CFG_STYLE_R, 40, '41-800-31', { ng: '4.3', lpg: '3.2', mod: '5.1 to 34.4', adj: '17.2 to 34.4', out: '16.9 to 33.7', pump: '6.5', cond: '4.1', kg: '47', lift: '41' }),
  biRS(CFG_STYLE_R, 45, '41-800-32', { ng: '4.6', lpg: '3.4', mod: '6.3 to 34.4', adj: '17.2 to 34.4', out: '16.9 to 33.8', pump: '6.5', cond: '4.1', kg: '49', lift: '43' }),
  biRS(CFG_STYLE_R, 50, '41-800-33', { ng: '5.1', lpg: '3.8', mod: '6.3 to 34.4', adj: '17.2 to 34.4', out: '16.9 to 33.8', pump: '6.5', cond: '4.1', kg: '49', lift: '43' }),
  biRS(CFG_STYLE_S, 30, '41-800-27', { ng: '3.2', lpg: '2.3', mod: '3.0 to 30.2', adj: '15.1 to 30.2', out: '14.8 to 29.6', pump: '2.0', cond: '3.5', kg: '46', lift: '40' }),
  biRS(CFG_STYLE_S, 35, '41-800-28', { ng: '3.6', lpg: '2.7', mod: '5.1 to 34.4', adj: '17.2 to 34.4', out: '16.9 to 33.7', pump: '2.0', cond: '4.1', kg: '46', lift: '40' }),
  biRS(CFG_LIFE_R, 30, '41-406-98', { ng: '3.2', lpg: '2.3', mod: '3.0 to 30.2', out: '2.9 to 29.6', cond: '3.5', kg: '46', lift: '40' }),
  biRS(CFG_LIFE_R, 35, '41-406-97', { ng: '3.6', lpg: '2.7', mod: '5.1 to 34.4', out: '5.0 to 33.7', cond: '4.1', kg: '46', lift: '40' }),
  biRS(CFG_LIFE_R, 40, '41-406-96', { ng: '4.3', lpg: '3.2', mod: '5.1 to 40.8', out: '5.0 to 39.8', cond: '4.5', kg: '46', lift: '40' }),
  biRS(CFG_LIFE_R, 45, '41-406-95', { ng: '4.6', lpg: '3.4', mod: '6.3 to 43.5', out: '6.2 to 42.6', cond: '4.7', kg: '48', lift: '42' }),
  biRS(CFG_LIFE_R, 50, '41-406-94', { ng: '5.1', lpg: '3.8', mod: '6.3 to 48.9', out: '6.2 to 47.9', cond: '7.8', kg: '48', lift: '42' }),
  biRS(CFG_LIFE_S, 30, '41-406-91', { ng: '3.2', lpg: '2.3', mod: '3.0 to 30.2', out: '2.9 to 29.6', pump: '2.0', cond: '3.5', kg: '46', lift: '40' }),
  biRS(CFG_LIFE_S, 35, '41-406-90', { ng: '3.6', lpg: '2.7', mod: '5.1 to 34.4', out: '5.0 to 33.7', pump: '2.0', cond: '4.1', kg: '46', lift: '40' })
  ,
  biF('C', '35', '47-800-56', { ng: '3.7', lpg: '2.7', mod: '5.1 to 34.4', out: '33.8', dhwOut: '33.7', flow: '12', w: '116', kg: '73' }),
  biF('C', '50', '47-800-58', { ng: '5.1', lpg: '3.8', mod: '6.3 to 48.9', out: '47.8', dhwOut: '47.9', flow: '17', w: '152', kg: '75' }),
  biF('R', '35', '41-800-41', { ng: '3.7', lpg: '2.7', mod: '5.1 to 34.4', out: '33.8', w: '51', kg: '56' }),
  biF('R', '50', '41-800-43', { ng: '5.1', lpg: '3.8', mod: '6.3 to 48.9', out: '47.8', w: '86', kg: '58' })  ,
  biG(CFG_G4, 'GR4700iW 25 C', '47-800-30', { ng: '2.63', lpg: '1.98', gcl: '47-800-31', mod: '3.2 to 25.5', out: '3.0 to 24.0', dhwIn: '24.5', co2a: '9.4', co2b: '8.6', d40: '9', d35: '10.2', mp: '1.0', mpmin: '0.2', start: '1.9', maxop: '2.5', h60: '12', v60: '12', h80: '21', v80: '21', cond: '2', ph: '4.8', kg: '34.6', lift: '32.0' }),
  biG(CFG_G4, 'GR4700iW 30 C', '47-800-32', { ng: '3.14', lpg: '2.38', gcl: '47-800-33', mod: '3.2 to 30.6', out: '3.0 to 24.0', dhwIn: '29.4', co2a: '9.4', co2b: '8.6', d40: '11', d35: '12.3', mp: '1.2', mpmin: '0.2', start: '1.9', maxop: '2.5', h60: '12', v60: '12', h80: '21', v80: '21', cond: '2', ph: '4.8', kg: '34.9', lift: '32.3' }),
  biG(CFG_G2, 'GR2300iW 25 C', '47-800-26', { ng: '2.60', gcl: '47-800-27', mod: '4.9 to 20.4', out: '4.8 to 20.0', dhwIn: '25.5', co2a: '9.4', co2b: '8.6', d40: '9', d35: '10', mp: '1.5', mpmin: '0.3', start: '2.5', maxop: '3.0', h60: '9', v60: '12', h80: '12', v80: '15', cond: '1.7', ph: '4.8', kg: '36', lift: '33.4' }),
  biG(CFG_G2, 'GR2300iW 30 C', '47-800-28', { ng: '3.05', gcl: '47-800-29', mod: '4.9 to 20.4', out: '4.8 to 20.0', dhwIn: '30', co2a: '9.4', co2b: '8.6', d40: '10.8', d35: '12', mp: '1.5', mpmin: '0.3', start: '2.5', maxop: '3.0', h60: '9', v60: '12', h80: '12', v80: '15', cond: '1.7', ph: '4.8', kg: '36', lift: '33.4' }),
  biG(CFG_G1, 'GR1000W 24 C', '47-800-38', { ng: '2.47', mod: '5.4 to 24.6', out: '5.2 to 24.0', dhwIn: '24.6', co2a: '9.0', co2b: '8.5', d40: '8.5', d35: '9.8', mp: '1.5', mpmin: '0.3', start: '2.5', maxop: '3.0', h60: '9', v60: '9', h80: '12', v80: '12', cond: '3', ph: '3.15', kg: '27.7', lift: '26' }),
  biG(CFG_G1, 'GR1000W 30 C', '47-800-39', { ng: '3.02', mod: '6.6 to 24.6', out: '6.4 to 24.0', dhwIn: '30', co2a: '9.0', co2b: '8.5', d40: '10.7', d35: '12.2', mp: '1.5', mpmin: '0.3', start: '2.5', maxop: '3.0', h60: '9', v60: '9', h80: '12', v80: '12', cond: '3', ph: '3.15', kg: '27.7', lift: '26' })  ,
  biIdealRS('S', '15', '41-796-97', { rate: '1.537', max: '15.1', out: '15.0', co2a: '9.5', co2b: '8.9', w: '70' }),
  biIdealRS('S', '18', '41-796-98', { rate: '1.872', max: '18.1', out: '18.0', co2a: '9.3', co2b: '8.3', w: '75' }),
  biIdealRS('S', '24', '41-796-99', { rate: '2.512', max: '24.3', out: '24.2', co2a: '9.2', co2b: '8.5', w: '94' }),
  biIdealRS('S', '30', '41-860-01', { rate: '3.136', max: '30.4', out: '30.3', co2a: '9.6', co2b: '8.7', w: '102' }),
  biIdealRS('H', '12', '41-860-25', { rate: '1.246', max: '12.1', out: '12.0', co2a: '9.1', co2b: '8.5', w: '17' }),
  biIdealRS('H', '15', '41-860-26', { rate: '1.537', max: '15.1', out: '15.0', co2a: '9.4', co2b: '8.8', w: '20' }),
  biIdealRS('H', '18', '41-860-27', { rate: '1.872', max: '18.1', out: '18.0', co2a: '9.3', co2b: '8.7', w: '25' }),
  biIdealRS('H', '24', '41-860-28', { rate: '2.512', max: '24.3', out: '24.2', co2a: '9.3', co2b: '8.4', w: '44' }),
  biIdealRS('H', '30', '41-860-29', { rate: '3.136', max: '30.4', out: '30.3', co2a: '9.7', co2b: '8.8', w: '52' })  ,
  biIdealCombi('24', '47-387-15', { rate: '2.512', inj: '4.15', max: '24.3', min: '4.9', dhwOut: '24.2', minOut: '4.8', co2max: '9.2', co2min: '8.5', flow: '9.9', spec: '11.5', mp: '0.8', hf: '9.0', w: '96', pkg: '32.8', lift: '28.5' }, BI_IMINI),
  biIdealCombi('30', '47-387-16', { rate: '3.135', inj: '4.65', max: '30.4', min: '6.1', dhwOut: '30.3', minOut: '6.1', co2max: '9.3', co2min: '8.5', flow: '12.4', spec: '14.5', mp: '1.3', hf: '8.0', w: '91', pkg: '33', lift: '28.6' }, BI_IMINI),
  biIdealCombi('35', '47-387-17', { rate: '3.657', inj: '4.9', max: '35.4', min: '7.1', dhwOut: '35.3', minOut: '7.1', co2max: '9.7', co2min: '8.8', flow: '14.5', spec: '16.9', mp: '1.3', hf: '6.0', w: '110', pkg: '33', lift: '28.6' }, BI_IMINI)  ,
  biVogue('C', '26', '47-349-59', { rate: '2.695', inj: '4.30', max: '18.1', min: '3.7', out: '18.0', dhwIn: '26.1', co2a: '9.4', co2b: '8.0', flow: '10.6', spec: '12.4', mp: '0.62', wc: '1.5', w: '94', pkg: '40.1', inst: '32.4' }),
  biVogue('C', '32', '47-349-60', { rate: '3.314', inj: '4.40', max: '26.1', min: '4.6', out: '26.0', dhwIn: '32.1', co2a: '9.8', co2b: '8.5', flow: '13.1', spec: '15.3', mp: '0.83', wc: '1.8', w: '115', pkg: '41.4', inst: '33.8' }),
  biVogue('C', '40', '47-349-61', { rate: '4.150', inj: '5.15', max: '32.1', min: '5.7', out: '32.0', dhwIn: '40.2', co2a: '9.6', co2b: '8.1', flow: '16.4', spec: '19.1', mp: '1.23', wc: '2.2', w: '96', pkg: '43.4', inst: '35.4' }),
  biVogue('S', '15', '41-796-22', { rate: '1.559', inj: '3.40', max: '15.1', min: '3.0', out: '15.0', co2a: '9.4', co2b: '8.3', wc: '1.1', w: '73', pkg: '38.0', inst: '30.7' }),
  biVogue('S', '18', '41-796-23', { rate: '1.869', inj: '3.35', max: '18.1', min: '3.6', out: '18.0', co2a: '9.5', co2b: '8.5', wc: '1.5', w: '88', pkg: '38.8', inst: '31.5' }),
  biVogue('S', '26', '41-796-24', { rate: '2.695', inj: '4.30', max: '26.1', min: '5.2', out: '26.0', co2a: '9.5', co2b: '8.4', wc: '1.8', w: '98', pkg: '40.2', inst: '32.9' }),
  biVogue('S', '32', '41-796-25', { rate: '3.314', inj: '4.80', max: '32.1', min: '6.4', out: '32.0', co2a: '9.5', co2b: '8.2', wc: '2.2', w: '102', pkg: '42.2', inst: '34.3' })  ,
  biLM1('C', '24', '47-349-56', { rate: '2.512', inj: '4.15', max: '24.3', min: '4.9', out: '24.2', minOut: '4.8', co2a: '9.5', co2b: '8.8', flow: '9.9', spec: '11.5', mp: '0.8', hf: '9', w: '94', pkg: '36.5', inst: '29.2' }),
  biLM1('C', '30', '47-349-57', { rate: '3.135', inj: '4.65', max: '30.4', min: '6.1', out: '30.3', minOut: '6.1', co2a: '9.3', co2b: '8.8', flow: '12.4', spec: '14.5', mp: '1.3', hf: '8', w: '101', pkg: '36.6', inst: '29.3' }),
  biLM1('C', '35', '47-349-58', { rate: '3.657', inj: '4.9', max: '35.4', min: '7.1', out: '35.3', minOut: '7.1', co2a: '9.5', co2b: '8.9', flow: '14.5', spec: '16.9', mp: '1.3', hf: '6', w: '114', pkg: '36.7', inst: '29.4' }),
  biLM1('S', '15', '41-796-13', { rate: '1.537', inj: '4.15', max: '15.1', min: '4.9', out: '15.0', minOut: '4.8', co2a: '9.3', co2b: '8.8', hf: '9', w: '73', pkg: '34.0', inst: '26.1' }),
  biLM1('S', '18', '41-796-14', { rate: '1.872', inj: '4.15', max: '18.1', min: '4.9', out: '18.0', minOut: '4.8', co2a: '9.5', co2b: '8.9', hf: '9', w: '78', pkg: '34.0', inst: '26.1' }),
  biLM1('S', '24', '41-796-15', { rate: '2.512', inj: '4.15', max: '24.3', min: '4.9', out: '24.2', minOut: '4.8', co2a: '9.5', co2b: '8.8', hf: '9', w: '94', pkg: '34.0', inst: '26.1' }),
  biLM1('S', '30', '41-796-16', { rate: '3.135', inj: '4.65', max: '30.4', min: '6.1', out: '30.3', minOut: '6.1', co2a: '9.3', co2b: '8.8', hf: '8', w: '100', pkg: '34.0', inst: '26.1' }),
  biLM1('H', '12', '41-796-17', { rate: '1.246', inj: '4.15', max: '12.1', min: '4.9', out: '12.0', minOut: '4.8', co2a: '9.1', co2b: '8.5', hf: '9', w: '16', pkg: '28.7', inst: '22.7' }),
  biLM1('H', '15', '41-796-18', { rate: '1.537', inj: '4.15', max: '15.1', min: '4.9', out: '15.0', minOut: '4.8', co2a: '9.3', co2b: '8.8', hf: '9', w: '20', pkg: '28.7', inst: '22.7' }),
  biLM1('H', '18', '41-796-19', { rate: '1.872', inj: '4.15', max: '18.1', min: '4.9', out: '18.0', minOut: '4.8', co2a: '9.5', co2b: '8.9', hf: '9', w: '24', pkg: '28.7', inst: '22.7' }),
  biLM1('H', '24', '41-796-20', { rate: '2.512', inj: '4.15', max: '24.3', min: '4.9', out: '24.2', minOut: '4.8', co2a: '9.5', co2b: '8.8', hf: '9', w: '39', pkg: '28.7', inst: '22.7' }),
  biLM1('H', '30', '41-796-21', { rate: '3.135', inj: '4.65', max: '30.4', min: '6.1', out: '30.3', minOut: '6.1', co2a: '9.3', co2b: '8.8', hf: '8', w: '47', pkg: '28.7', inst: '22.7' })  ,
  biBaxiC(CFG_BX800, '24', '47-077-63', { ng: '2.61', ngMin: '0.52', lpg: '1.92', lpgMin: '0.38', chIn: '20.6', minIn: '4.9', chOut: '20', chOut2: '21.8', minOut: '4.8', dhwIn: '24.7', d25: '14.1', d35: '10.2', spec: '11.5', w: '85', kg: '28 / 30' }),
  biBaxiC(CFG_BX800, '30', '47-077-64', { ng: '3.26', ngMin: '0.63', lpg: '2.4', lpgMin: '0.47', chIn: '25.7', minIn: '6.0', chOut: '25', chOut2: '27.1', minOut: '5.8', dhwIn: '30.9', d25: '17.6', d35: '12.2', spec: '14.3', w: '88', kg: '29 / 31' }),
  biBaxiC(CFG_BX800, '36', '47-077-65', { ng: '3.9', ngMin: '0.78', lpg: '2.86', lpgMin: '0.58', chIn: '25.7', minIn: '7.4', chOut: '25', chOut2: '27.1', minOut: '7.2', dhwIn: '36.9', d25: '21.0', d35: '15.0', spec: '17.2', w: '91', kg: '30 / 31' })  ,
  biBaxiC(CFG_BX600, '24', '47-077-55', { ng: '2.61', ngMin: '0.52', lpg: '1.92', lpgMin: '0.38', chIn: '20.6', minIn: '4.9', chOut: '20', chOut2: '21.8', minOut: '4.8', dhwIn: '24.7', d25: '14.1', d35: '10.2', spec: '11.5', w: '85', kg: '28 / 30' }),
  biBaxiC(CFG_BX600, '30', '47-077-56', { ng: '3.26', ngMin: '0.63', lpg: '2.4', lpgMin: '0.47', chIn: '25.7', minIn: '6.0', chOut: '25', chOut2: '27.1', minOut: '5.8', dhwIn: '30.9', d25: '17.6', d35: '12.2', spec: '14.3', w: '88', kg: '29 / 31' }),
  biBaxiC(CFG_BX600, '36', '47-077-57', { ng: '3.9', ngMin: '0.78', lpg: '2.86', lpgMin: '0.58', chIn: '25.7', minIn: '7.2', chOut: '25', chOut2: '27.1', minOut: '7.2', dhwIn: '36.9', d25: '21.0', d35: '15.0', spec: '17.2', w: '91', kg: '30 / 31' }),
  biBaxiC(CFG_BX400, '24', 'not in the manual', { model: '424 Combi 2', ng: '2.61', ngMin: '0.52', lpg: '1.92', lpgMin: '0.38', chIn: '20.6', minIn: '4.9', chOut: '20', chOut2: '21.8', minOut: '4.8', dhwIn: '24.7', dhwOut: '24', d25: '13.8', d35: '9.8', spec: '11.5', w: '90', kg: '28 / 30' }),
  biBaxiC(CFG_BX400, '30', 'not in the manual', { model: '430 Combi 2', ng: '3.17', ngMin: '0.63', lpg: '2.33', lpgMin: '0.47', chIn: '20.6', minIn: '6.0', chOut: '20', chOut2: '21.8', minOut: '5.8', dhwIn: '30', dhwOut: '29.1', d25: '16.7', d35: '11.9', spec: '14', w: '90', kg: '29 / 31' })  ,
  biBaxiC(CFG_BX200, '24', 'not in the manual', { model: '224 Combi 2', ng: '2.61', ngMin: '0.52', lpg: '1.92', lpgMin: '0.38', chIn: '20.6', minIn: '4.9', chOut: '20', chOut2: '21.8', minOut: '4.8', dhwIn: '24.7', dhwOut: '24', d25: '13.8', d35: '9.8', spec: '11.1', w: '90', kg: '26.5 / 28.5' }),
  biBaxiC(CFG_BX200, '28', 'not in the manual', { model: '228 Combi 2', ng: '3.06', ngMin: '0.63', lpg: '2.24', lpgMin: '0.47', chIn: '20.6', minIn: '6.0', chOut: '20', chOut2: '21.8', minOut: '5.8', dhwIn: '28.9', dhwOut: '28.0', d25: '16.0', d35: '11.4', spec: '13.4', w: '85', kg: '27.5 / 29.5' })  ,
  biBaxiH(CFG_BH4, '412', '41-470-50', { ng: '1.42', inMax: '14.88', out: '13', w: '17', wc: '1.7', pkg: '21.5', lift: '19.5' }),
  biBaxiH(CFG_BH4, '415', '41-470-51', { ng: '1.75', inMax: '18.32', out: '16', w: '20', wc: '1.7', pkg: '21.5', lift: '19.5' }),
  biBaxiH(CFG_BH4, '418', '41-470-52', { ng: '2.07', inMax: '21.75', out: '19', w: '23', wc: '1.7', pkg: '21.5', lift: '19.5' }),
  biBaxiH(CFG_BH4, '424', '41-470-53', { ng: '2.73', inMax: '28.62', out: '25', w: '33', wc: '1.7', pkg: '21.5', lift: '19.5' }),
  biBaxiH(CFG_BH4, '430', '41-470-54', { ng: '3.27', inMax: '34.35', out: '30', w: '44', wc: '1.7', pkg: '21.5', lift: '19.5' }),
  biBaxiH(CFG_BH8, '816', '41-470-77', { ng: '1.75', inMax: '18.32', out: '16', w: '20', wc: '1.4', pkg: '21.3', lift: '17.4' }),
  biBaxiH(CFG_BH8, '825', '41-470-78', { ng: '2.73', inMax: '28.62', out: '25', w: '33', wc: '1.4', pkg: '21.3', lift: '17.4' }),
  biBaxiH(CFG_BH8, '830', '41-470-79', { ng: '3.27', inMax: '34.35', out: '30', w: '44', wc: '1.7', pkg: '23.4', lift: '19.5' })  ,
  biBaxiS(CFG_BS6, '15', '41-884-01', { ng: '1.64', lpg: '1.2', inp: '15.5', minIn: '4.9', out2: '16.3', minOut: '4.8', minOut2: '5.2', w: '85', kg: '28 / 30' }),
  biBaxiS(CFG_BS6, '18', '41-884-02', { ng: '1.97', lpg: '1.44', inp: '18.6', minIn: '4.9', out2: '19.9', minOut: '4.8', minOut2: '5.2', w: '88', kg: '29 / 31' }),
  biBaxiS(CFG_BS6, '24', '41-884-03', { ng: '2.61', lpg: '1.92', inp: '24.7', minIn: '4.9', out2: '26.3', minOut: '4.8', minOut2: '5.2', w: '91', kg: '30 / 31' }),
  biBaxiS(CFG_BS8, '18', '41-470-99', { ng: '1.97', lpg: '1.44', inp: '18.6', minIn: '4.9', out2: '19.9', minOut: '4.8', minOut2: '5.2', w: '88', kg: '29 / 31' }),
  biBaxiS(CFG_BS8, '24', '41-884-09', { ng: '2.61', lpg: '1.92', inp: '24.7', minIn: '4.9', out2: '26.3', minOut: '4.8', minOut2: '5.2', w: '91', kg: '30 / 31' }),
  biBaxiS(CFG_BS8, '30', '41-884-08', { ng: '3.26', lpg: '2.4', inp: '30.9', minIn: '6.0', out2: '32.4', minOut: '5.8', minOut2: '6.4', w: '92', kg: '30 / 31' })  ,
  biBaxiO(CFG_BO6, '624', '47-077-28', { ng: '2.71', ngMin: '0.67', lpg: '1.98', gcl: '47-077-33', dhwIn: '25.8', chIn: '20.6', minIn: '6.2', dhwOut: '25', chOut: '20', minOut: '6.1', out2: '21.2', d30: '12', spec: '10.2', w: '68', pkg: '32.2', lift: '29.2', inst: '30.2' }),
  biBaxiO(CFG_BO6, '630', '47-077-29', { ng: '3.26', ngMin: '0.67', lpg: '2.38', gcl: '47-077-32', dhwIn: '30.9', chIn: '20.6', minIn: '6.2', dhwOut: '30', chOut: '20', minOut: '6.1', out2: '21.2', d30: '14.3', spec: '12.2', w: '80', pkg: '32.2', lift: '29.2', inst: '30.2' }),
  biBaxiO(CFG_BO6, '636', '47-077-30', { ng: '3.81', ngMin: '0.71', gcl: '47-077-31', dhwIn: '36.8', chIn: '25.8', minIn: '6.7', dhwOut: '36', chOut: '25', minOut: '6.7', out2: '26.4', d30: '16.5', spec: '15.0', w: '110', pkg: '33.5', lift: '30.5', inst: '31.5' }),
  biBaxiO(CFG_BOA, '25', '47-077-42', { ng: '2.71', ngMin: '0.67', lpg: '1.98', gcl: '47-077-45', dhwIn: '25.8', chIn: '20.6', minIn: '6.2', dhwOut: '25', chOut: '20', minOut: '6.1', out2: '21.2', d30: '12', spec: '10.2', w: '68', pkg: '32.2', lift: '29.2', inst: '30.2' }),
  biBaxiO(CFG_BOA, '30', '47-077-43', { ng: '3.26', ngMin: '0.67', lpg: '2.38', gcl: '47-077-46', dhwIn: '30.9', chIn: '25.8', minIn: '6.2', dhwOut: '30', chOut: '25', minOut: '6.1', out2: '26.4', d30: '14.3', spec: '12.2', w: '80', pkg: '32.2', lift: '29.2', inst: '30.2' }),
  biBaxiO(CFG_BOA, '36', '47-077-44', { ng: '3.81', ngMin: '0.71', lpg: '2.83', gcl: '47-077-47', dhwIn: '36.8', chIn: '25.8', minIn: '6.7', dhwOut: '36', chOut: '25', minOut: '6.7', out2: '26.4', d30: '16.5', spec: '15.0', w: '110', pkg: '33.5', lift: '30.5', inst: '31.5' })  ,
  biBaxiC(CFG_BX21, '24', '47-077-74', { ng: '2.61', ngMin: '0.52', chIn: '20.6', minIn: '4.9', chOut: '20', chOut2: '21.8', minOut: '4.8', dhwIn: '24.7', d25: '14.1', d35: '10.2', spec: '11.5', w: '85', kg: '28 / 30' }),
  biBaxiC(CFG_BX21, '30', '47-077-75', { ng: '3.26', ngMin: '0.63', chIn: '25.7', minIn: '6.0', chOut: '25', chOut2: '27.1', minOut: '5.8', dhwIn: '30.9', d25: '17.6', d35: '12.2', spec: '14.3', w: '88', kg: '29 / 31' }),
  biBaxiC(CFG_BX21, '36', '47-077-76', { ng: '3.9', ngMin: '0.78', chIn: '25.7', minIn: '7.4', chOut: '25', chOut2: '27.1', minOut: '7.2', dhwIn: '36.9', d25: '21.0', d35: '15.0', spec: '17.2', w: '91', kg: '30 / 31' })  ,
  biVai(CFG_VSUS, 'VUW 246/7-2 (ecoTEC sustain 24)', '47-044-79', { ng: '2.6', chIn: '18.7', min: '6.6', out: '6.4 to 18.5', out2: '7.0 to 20.1', dhwIn: '24.4', dhwOut: '6.6 to 24.3', d30: '11.5', d35: '9.9', lim: '8.0', w: '100', kg: '30.8', kgw: '33.5' }),
  biVai(CFG_VSUS, 'VUW 286/7-2 (ecoTEC sustain 28)', '47-044-80', { ng: '3.0', chIn: '18.7', min: '7.6', out: '7.4 to 18.5', out2: '8.0 to 20.1', dhwIn: '28.5', dhwOut: '7.5 to 28.1', d30: '13.5', d35: '11.6', lim: '10.0', w: '110', kg: '30.8', kgw: '33.5' }),
  biVai(CFG_VSUS, 'VUW 346/7-2 (ecoTEC sustain 34)', '47-044-81', { ng: '3.7', chIn: '18.7', min: '8.6', out: '8.4 to 18.5', out2: '9.1 to 19.9', dhwIn: '34.6', dhwOut: '8.4 to 34.0', d30: '16.5', d35: '14.1', lim: '12.0', w: '115', kg: '32.8', kgw: '35.9' })  ,
  biVai(CFG_VFIT, 'VUW 256/6-3 (ecoFIT sustain 825)', '47-044-71', { ng: '2.7', ngMin: '0.540', chIn: '18.4', min: '5.1', out: '5.1 to 18.3', out2: '5.3 to 19.1', dhwIn: '25.7', dhwOut: '5.0 to 25.2', d30: '12.1', d35: '10.4', lim: '8.0', w: '87', kg: '32', kgw: '36' }),
  biVai(CFG_VFIT, 'VUW 306/6-3 (ecoFIT sustain 830)', '47-044-72', { ng: '3.2', ngMin: '0.646', chIn: '18.4', min: '6.1', out: '6.1 to 18.3', out2: '6.3 to 19.1', dhwIn: '30.6', dhwOut: '6.0 to 30.0', d30: '14.2', d35: '12.2', lim: '10.0', w: '87', kg: '33', kgw: '37' }),
  biVai(CFG_VFIT, 'VUW 356/6-3 (ecoFIT sustain 835)', '47-044-73', { ng: '3.8', ngMin: '0.762', chIn: '18.4', min: '7.2', out: '7.2 to 18.3', out2: '7.5 to 19.1', dhwIn: '35.7', dhwOut: '7.1 to 35.0', d30: '16.5', d35: '14.1', lim: '12.0', w: '98', kg: '33', kgw: '37' })
  ,
  biVaiR(CFG_VFSYS, 'VU 156/6-3 (ecoFIT sustain 615)', 'System', '41-694-30', { ngH: '1.6', ngW: '1.9', ngMin: '0.480', chIn: '15.3', min: '4.5', out: '4.5 to 15.2', out2: '4.7 to 15.9', dhwIn: '18.4', dhwOut: '4.4 to 18.0', fl20: '655', fl30: '436', cond: '1.53', w: '81', kg: '31', kgw: '35' }),
  biVaiR(CFG_VFSYS, 'VU 186/6-3 (ecoFIT sustain 618)', 'System', '41-694-31', { ngH: '1.9', ngW: '2.7', ngMin: '0.533', chIn: '18.4', min: '5.0', out: '5.0 to 18.3', out2: '5.2 to 19.1', dhwIn: '25.7', dhwOut: '4.9 to 25.2', fl20: '788', fl30: '525', cond: '1.84', w: '87', kg: '31', kgw: '35' }),
  biVaiR(CFG_VFSYS, 'VU 306/6-3 (ecoFIT sustain 630)', 'System', '41-694-32', { ngH: '3.2', ngW: '3.8', ngMin: '0.762', chIn: '30.6', min: '7.2', out: '7.2 to 30.5', out2: '7.5 to 31.8', dhwIn: '35.7', dhwOut: '7.1 to 35.0', fl20: '1,102', fl30: '876', cond: '3.06', w: '104', kg: '32', kgw: '36' }),
  biVaiR(CFG_VFOV, 'VU 156/6-3 OV (ecoFIT sustain 415)', 'Regular (open vent)', '41-694-33', { ngH: '1.6', ngW: '1.9', ngMin: '0.480', chIn: '15.3', min: '4.5', out: '4.5 to 15.2', out2: '4.7 to 15.9', dhwIn: '18.4', dhwOut: '4.4 to 18.0', fl20: '655', fl30: '436', cond: '1.53', w: '29', kg: '22', kgw: '26' }),
  biVaiR(CFG_VFOV, 'VU 186/6-3 OV (ecoFIT sustain 418)', 'Regular (open vent)', '41-694-34', { ngH: '1.9', ngW: '2.7', ngMin: '0.533', chIn: '18.4', min: '5.0', out: '5.0 to 18.3', out2: '5.2 to 19.1', dhwIn: '25.7', dhwOut: '4.9 to 25.2', fl20: '788', fl30: '525', cond: '1.84', w: '35', kg: '22', kgw: '26' }),
  biVaiR(CFG_VFOV, 'VU 306/6-3 OV (ecoFIT sustain 430)', 'Regular (open vent)', '41-694-35', { ngH: '3.2', ngW: '3.8', ngMin: '0.756', chIn: '30.6', min: '7.1', out: '7.1 to 30.2', out2: '7.4 to 31.8', dhwIn: '35.7', dhwOut: '7.0 to 35.0', fl20: '1,313', fl30: '876', cond: '3.06', w: '44', kg: '22', kgw: '27' })
  ,
  biVaiR(CFG_VEPOV, 'VU 126/6-5 OV (ecoTEC plus 12)', 'Regular (open vent)', '41-044-71', { ngH: '1.3', ngW: '1.9', ngMin: '0.480', chIn: '12.3', min: '5.0', out: '4.5 to 12.3', out2: '4.7 to 12.8', dhwIn: '18.4', dhwOut: '4.4 to 18.0', fl20: '530', fl30: '353', cond: '1.23', w: '65', kg: '23', kgw: '27' })
  ,
  biVaiR(CFG_VEPOV, 'VU 156/6-5 OV (ecoTEC plus 15)', 'Regular (open vent)', '41-044-72', { ngH: '1.6', ngW: '1.9', ngMin: '0.480', chIn: '15.3', min: '4.5', out: '4.5 to 15.2', out2: '4.7 to 15.9', dhwIn: '18.4', dhwOut: '4.4 to 18.0', fl20: '655', fl30: '436', cond: '1.53', w: '65', kg: '23', kgw: '27' })
  ,
  biVaiR(CFG_VEPOV, 'VU 186/6-5 OV (ecoTEC plus 18)', 'Regular (open vent)', '41-044-73', { ngH: '1.9', ngW: '2.7', ngMin: '0.533', chIn: '18.4', min: '5.0', out: '5.0 to 18.3', out2: '5.2 to 19.1', dhwIn: '25.7', dhwOut: '5.0 to 25.2', fl20: '788', fl30: '525', cond: '1.84', w: '66', kg: '23', kgw: '27' })
  ,
  biVaiR(CFG_VEPOV, 'VU 246/6-5 OV (ecoTEC plus 24)', 'Regular (open vent)', '41-044-74', { ngH: '2.6', ngW: '3.2', ngMin: '0.646', chIn: '24.7', min: '6.1', out: '6.1 to 24.6', out2: '6.3 to 25.7', dhwIn: '30.6', dhwOut: '6.0 to 30.0', fl20: '1,059', fl30: '706', cond: '2.47', w: '75', kg: '23', kgw: '28' })
  ,
  biVaiR(CFG_VEPOV, 'VU 306/6-5 OV (ecoTEC plus 30)', 'Regular (open vent)', '41-044-75', { ngH: '3.2', ngW: '3.8', ngMin: '0.762', chIn: '30.6', min: '7.2', out: '7.2 to 30.5', out2: '7.5 to 31.8', dhwIn: '35.7', dhwOut: '7.1 to 35.0', fl20: '1,313', fl30: '876', cond: '3.06', w: '60', kg: '23', kgw: '28' })
  ,
  biVai(CFG_GWSUS, 'Sustain 25c', '47-019-32', { ng: '2.7', ngMin: '0.540', chIn: '18.4', min: '5.1', out: '5.1 to 18.3', out2: '5.3 to 19.1', dhwIn: '25.7', dhwOut: '5.0 to 25.2', d30: '12.1', d35: '10.4', lim: '8.0', w: '75', kg: '32', kgw: '36', pump: '0.250 bar' }),
  biVai(CFG_GWSUS, 'Sustain 30c', '47-019-33', { ng: '3.2', ngMin: '0.646', chIn: '18.4', min: '6.1', out: '6.1 to 18.3', out2: '6.3 to 19.1', dhwIn: '30.6', dhwOut: '6.0 to 30.0', d30: '14.2', d35: '12.2', lim: '10.0', w: '75', kg: '33', kgw: '37', pump: '0.250 bar' }),
  biVai(CFG_GWSUS, 'Sustain 35c', '47-019-34', { ng: '3.8', ngMin: '0.762', chIn: '18.4', min: '7.2', out: '7.2 to 18.3', out2: '7.5 to 19.1', dhwIn: '35.7', dhwOut: '7.1 to 35.0', d30: '16.5', d35: '14.1', lim: '12.0', w: '38', kg: '33', kgw: '37', pump: '0.180 bar' })
  ,
  biVai(CFG_GWEN, 'Energy 25c', '47-019-24', { ng: '2.7', ngMin: '0.540', chIn: '18.4', min: '5.1', out: '5.0 to 18.3', out2: '5.3 to 19.1', dhwIn: '25.7', dhwOut: '5.0 to 25.2', d30: '12.1', d35: '10.4', lim: '8.0', w: '66', kg: '32', kgw: '36', pump: '0.250 bar', cond: '1.84 l/h' }),
  biVai(CFG_GWEN, 'Energy 30c', '47-019-25', { ng: '3.2', ngMin: '0.646', chIn: '25.5', min: '6.1', out: '6.1 to 25.4', out2: '6.3 to 26.5', dhwIn: '30.6', dhwOut: '6.0 to 30.0', d30: '14.2', d35: '12.2', lim: '10.0', w: '75', kg: '33', kgw: '38', pump: '0.250 bar', cond: '2.55 l/h' }),
  biVai(CFG_GWEN, 'Energy 35c', '47-019-26', { ng: '3.8', ngMin: '0.762', chIn: '25.7', min: '7.2', out: '7.2 to 25.6', out2: '7.5 to 26.7', dhwIn: '35.7', dhwOut: '7.1 to 35.0', d30: '16.5', d35: '14.1', lim: '12.0', w: '60', kg: '33', kgw: '38', pump: '0.180 bar', cond: '2.57 l/h' }),
  biVai(CFG_GWHOME, 'Home 25c', '47-019-29', { ng: '2.7', chIn: '15.3', min: '5.1', out: '5.1 to 15.2', out2: '5.3 to 15.9', dhwIn: '25.7', dhwOut: '5.0 to 25.2', d30: '12.1', d35: '10.4', lim: '8', w: '105', kg: '32', kgw: '36', pump: '0.410 bar' }),
  biVai(CFG_GWHOME, 'Home 30c', '47-019-30', { ng: '3.2', chIn: '15.3', min: '6.1', out: '6.1 to 15.2', out2: '6.3 to 15.9', dhwIn: '30.6', dhwOut: '6.0 to 30.0', d30: '14.2', d35: '12.2', lim: '10', w: '110', kg: '32.6', kgw: '37', pump: '0.390 bar' }),
  biVai(CFG_GWHOME, 'Home 35c', '47-019-31', { ng: '3.8', chIn: '15.3', min: '7.2', out: '7.2 to 15.2', out2: '7.5 to 15.9', dhwIn: '35.7', dhwOut: '7.1 to 35.0', d30: '16.5', d35: '14.1', lim: '12', w: '120', kg: '32.7', kgw: '37.2', pump: '0.420 bar' }),
  biVai(CFG_GWEASI, 'Easicom 3 24c', '47-019-50', { ng: '2.6', chIn: '20.4', min: '5.1', out: '5.0 to 20.2', out2: '5.3 to 21.2', dhwIn: '24.7', dhwOut: '5.0 to 24.2', d30: '11.7', d35: '10.0', lim: '8', w: '105', kg: '32', kgw: '36', pump: '0.250 bar', cond: '2.04 l/h' }),
  biVai(CFG_GWEASI, 'Easicom 3 28c', '47-019-51', { ng: '3.0', chIn: '24.7', min: '6.1', out: '6.1 to 24.4', out2: '6.3 to 25.7', dhwIn: '28.6', dhwOut: '6.0 to 28.0', d30: '13.6', d35: '11.7', lim: '10', w: '110', kg: '32.6', kgw: '37.1', pump: '0.250 bar', cond: '2.47 l/h' }),
  biVai(CFG_GWULT, 'Ultimate 3 30c', '47-019-55', { ng: '3.2', chIn: '25.5', min: '6.1', out: '6.0 to 25.2', out2: '6.3 to 26.5', dhwIn: '30.6', dhwOut: '6.0 to 30.0', d30: '14.5', d35: '12.4', lim: '10', w: '110', kg: '32.6', kgw: '37.1', pump: '0.220 bar' }),
  biVai(CFG_GWULT, 'Ultimate 3 35c', '47-019-57', { ng: '3.8', chIn: '25.5', min: '7.1', out: '7.0 to 25.3', out2: '7.4 to 26.5', dhwIn: '35.7', dhwOut: '7.0 to 35.0', d30: '16.8', d35: '14.4', lim: '12', w: '120', kg: '32.7', kgw: '37.2', pump: '0.250 bar' })
  ,
  biVaiR(CFG_GWSR, 'Sustain 12r', 'Regular', '41-019-39', { ngH: '1.3', ngW: '1.6', ngMin: '0.480', chIn: '12.3', min: '4.5', out: '4.5 to 12.3', out2: '4.7 to 12.8', dhwIn: '15.3', dhwOut: '4.4 to 15.0', fl20: '530', fl30: '353', cond: '1.23', w: '65', kg: '22', kgw: '26' }),
  biVaiR(CFG_GWSR, 'Sustain 15r', 'Regular', '41-019-40', { ngH: '1.6', ngW: '1.9', ngMin: '0.480', chIn: '15.3', min: '4.5', out: '4.5 to 15.2', out2: '4.7 to 15.9', dhwIn: '18.4', dhwOut: '4.4 to 18.0', fl20: '655', fl30: '436', cond: '1.53', w: '65', kg: '22', kgw: '26' }),
  biVaiR(CFG_GWSR, 'Sustain 18r', 'Regular', '41-019-41', { ngH: '1.9', ngW: '2.7', ngMin: '0.533', chIn: '18.4', min: '5.0', out: '5.0 to 18.3', out2: '5.2 to 19.1', dhwIn: '25.7', dhwOut: '4.9 to 25.2', fl20: '788', fl30: '525', cond: '1.84', w: '66', kg: '22', kgw: '26' }),
  biVaiR(CFG_GWSS, 'Sustain 12s', 'System', '41-019-36', { ngH: '1.3', ngW: '1.6', ngMin: '0.480', chIn: '12.3', min: '4.5', out: '4.5 to 12.3', out2: '4.7 to 12.8', dhwIn: '15.3', dhwOut: '4.4 to 15.0', fl20: '530', fl30: '353', cond: '1.23', w: '65', kg: '31', kgw: '35' }),
  biVaiR(CFG_GWSS, 'Sustain 15s', 'System', '41-019-37', { ngH: '1.6', ngW: '1.9', ngMin: '0.480', chIn: '15.3', min: '4.5', out: '4.5 to 15.2', out2: '4.7 to 15.9', dhwIn: '18.4', dhwOut: '4.4 to 18.0', fl20: '655', fl30: '436', cond: '1.53', w: '65', kg: '31', kgw: '35' }),
  biVaiR(CFG_GWSS, 'Sustain 18s', 'System', '41-019-38', { ngH: '1.9', ngW: '2.7', ngMin: '0.533', chIn: '18.4', min: '5.0', out: '5.0 to 18.3', out2: '5.2 to 19.1', dhwIn: '25.7', dhwOut: '4.9 to 25.2', fl20: '788', fl30: '525', cond: '1.84', w: '66', kg: '31', kgw: '35' }),
  biVaiR(CFG_GWENR, 'Energy 12r', 'Regular', '41-019-21', { ngH: '1.3', ngW: '1.6', ngMin: '0.480', chIn: '12.3', min: '4.5', out: '4.5 to 12.3', out2: '4.7 to 12.8', dhwIn: '15.3', dhwOut: '4.4 to 15.0', fl20: '530', fl30: '353', cond: '1.23', w: '65', kg: '22', kgw: '26' }),
  biVaiR(CFG_GWENR, 'Energy 15r', 'Regular', '41-019-22', { ngH: '1.6', ngW: '1.9', ngMin: '0.480', chIn: '15.3', min: '4.5', out: '4.5 to 15.2', out2: '4.7 to 15.9', dhwIn: '18.4', dhwOut: '4.4 to 18.0', fl20: '655', fl30: '436', cond: '1.53', w: '65', kg: '22', kgw: '26' }),
  biVaiR(CFG_GWENR, 'Energy 18r', 'Regular', '41-019-23', { ngH: '1.9', ngW: '2.7', ngMin: '0.533', chIn: '18.4', min: '5.0', out: '5.0 to 18.3', out2: '5.2 to 19.1', dhwIn: '25.7', dhwOut: '4.9 to 25.2', fl20: '788', fl30: '525', cond: '1.84', w: '66', kg: '22', kgw: '26' }),
  biVaiR(CFG_GWENR, 'Energy 25r', 'Regular', '41-019-24', { ngH: '2.7', ngW: '3.2', ngMin: '0.648', chIn: '25.5', min: '6.1', out: '6.1 to 25.4', out2: '6.4 to 26.5', dhwIn: '30.6', dhwOut: '6.0 to 30.0', fl20: '1,094', fl30: '729', cond: '2.55', w: '75', kg: '22', kgw: '26' }),
  biVaiR(CFG_GWENR, 'Energy 30r', 'Regular', '41-019-25', { ngH: '3.2', ngW: '3.8', ngMin: '0.756', chIn: '30.6', min: '7.1', out: '7.1 to 30.5', out2: '7.4 to 31.8', dhwIn: '35.7', dhwOut: '7.0 to 35.0', fl20: '1,313', fl30: '876', cond: '3.06', w: '60', kg: '22', kgw: '27' }),
  biVaiR(CFG_GWENS, 'Energy 12s', 'System', '41-019-16', { ngH: '1.3', ngW: '1.6', ngMin: '0.476', chIn: '12.3', min: '4.5', out: '4.5 to 12.3', out2: '4.7 to 12.8', dhwIn: '15.3', dhwOut: '4.4 to 15.0', fl20: '530', fl30: '353', cond: '1.23', w: '65', kg: '31', kgw: '35' }),
  biVaiR(CFG_GWENS, 'Energy 15s', 'System', '41-019-17', { ngH: '1.6', ngW: '1.9', ngMin: '0.480', chIn: '15.3', min: '4.5', out: '4.5 to 15.2', out2: '4.7 to 15.9', dhwIn: '18.4', dhwOut: '4.4 to 18.0', fl20: '655', fl30: '436', cond: '1.53', w: '75', kg: '31', kgw: '35' }),
  biVaiR(CFG_GWENS, 'Energy 18s', 'System', '41-019-18', { ngH: '1.9', ngW: '2.7', ngMin: '0.533', chIn: '18.4', min: '5.0', out: '5.0 to 18.3', out2: '5.2 to 19.1', dhwIn: '25.7', dhwOut: '4.9 to 25.2', fl20: '788', fl30: '525', cond: '1.84', w: '66', kg: '31', kgw: '35' }),
  biVaiR(CFG_GWENS, 'Energy 25s', 'System', '41-019-19', { ngH: '2.7', ngW: '3.2', ngMin: '0.648', chIn: '25.5', min: '6.1', out: '6.1 to 25.4', out2: '6.4 to 26.5', dhwIn: '30.6', dhwOut: '6.0 to 30.0', fl20: '1,094', fl30: '729', cond: '2.55', w: '75', kg: '32', kgw: '36' }),
  biVaiR(CFG_GWENS, 'Energy 30s', 'System', '41-019-20', { ngH: '3.2', ngW: '3.8', ngMin: '0.762', chIn: '30.6', min: '7.2', out: '7.2 to 30.5', out2: '7.5 to 31.8', dhwIn: '35.7', dhwOut: '7.1 to 35.0', fl20: '1,102', fl30: '876', cond: '3.06', w: '60', kg: '32', kgw: '36' })
  ,
  biVaiR(CFG_GWHR, 'Home 12r', 'Regular', '41-019-31', { ngH: '1.3', ngW: '1.6', ngMin: '0.480', chIn: '12.3', min: '4.5', out: '4.5 to 12.3', out2: '4.7 to 12.8', dhwIn: '15.3', dhwOut: '4.4 to 15.0', fl20: '530', fl30: '353', cond: '1.23', w: '65', kg: '22', kgw: '26' }),
  biVaiR(CFG_GWHR, 'Home 15r', 'Regular', '41-019-32', { ngH: '1.6', ngW: '1.9', ngMin: '0.480', chIn: '15.3', min: '4.5', out: '4.5 to 15.2', out2: '4.7 to 15.9', dhwIn: '18.4', dhwOut: '4.4 to 18.0', fl20: '655', fl30: '436', cond: '1.53', w: '65', kg: '22', kgw: '26' }),
  biVaiR(CFG_GWHR, 'Home 18r', 'Regular', '41-019-33', { ngH: '1.9', ngW: '2.7', ngMin: '0.533', chIn: '18.4', min: '5.0', out: '5.0 to 18.3', out2: '5.2 to 19.1', dhwIn: '25.7', dhwOut: '4.9 to 25.2', fl20: '788', fl30: '525', cond: '1.84', w: '66', kg: '22', kgw: '26' }),
  biVaiR(CFG_GWHR, 'Home 25r', 'Regular', '41-019-34', { ngH: '2.7', ngW: '3.2', ngMin: '0.648', chIn: '25.5', min: '6.1', out: '6.1 to 25.4', out2: '6.4 to 26.5', dhwIn: '30.6', dhwOut: '6.0 to 30.0', fl20: '1,094', fl30: '729', cond: '2.55', w: '75', kg: '22', kgw: '27' }),
  biVaiR(CFG_GWHR, 'Home 30r', 'Regular', '41-019-35', { ngH: '3.2', ngW: '3.8', ngMin: '0.756', chIn: '30.6', min: '7.1', out: '7.1 to 30.5', out2: '7.4 to 31.8', dhwIn: '35.7', dhwOut: '7.0 to 35.0', fl20: '1,313', fl30: '876', cond: '3.06', w: '60', kg: '22', kgw: '27' }),
  biVaiR(CFG_GWHS, 'Home 12s', 'System', '41-019-27', { chIn: '12.2', min: '4.1', out: '4.1 to 12.1', out2: '4.3 to 12.7', dhwIn: '17', dhwOut: '4.0 to 15.0', ngW: '1.6', fl20: '521', fl30: '347', cond: '1.22', w: '105', kg: '31.3', kgw: '35.1', pump: '0.360 bar' }),
  biVaiR(CFG_GWHS, 'Home 15s', 'System', '41-019-28', { chIn: '15.3', min: '4.1', out: '4.1 to 15.2', out2: '4.3 to 15.9', dhwIn: '20.4', dhwOut: '4.0 to 18.0', ngW: '1.9', fl20: '655', fl30: '436', cond: '1.53', w: '105', kg: '31.3', kgw: '35.1', pump: '0.410 bar' }),
  biVaiR(CFG_GWHS, 'Home 18s', 'System', '41-019-29', { chIn: '18.4', min: '5.1', out: '5.1 to 18.3', out2: '5.3 to 19.1', dhwIn: '28.5', dhwOut: '5.0 to 25.2', ngW: '2.7', fl20: '788', fl30: '525', cond: '1.84', w: '105', kg: '31.3', kgw: '35.1', pump: '0.450 bar' }),
  biVaiR(CFG_GWHS, 'Home 25s', 'System', '41-019-30', { chIn: '25.5', min: '6.1', out: '6.1 to 25.4', out2: '6.3 to 26.5', dhwIn: '34', dhwOut: '6.0 to 30.0', ngW: '3.2', fl20: '1,094', fl30: '729', cond: '2.55', w: '110', kg: '31.9', kgw: '36.1', pump: '0.210 bar' }),
  biVaiR(CFG_GWER, 'Easicom 3 25r', 'Regular', '41-019-50', { ngH: '2.7', ngW: '3.2', ngMin: '0.648', chIn: '25.5', min: '6.1', out: '6.0 to 25.2', out2: '6.4 to 26.5', dhwIn: '30.6', dhwOut: '6.0 to 30.0', fl20: '1,085', fl30: '723', cond: '2.55', w: '29', kg: '22', kgw: '27' }),
  biVaiR(CFG_GWES, 'Easicom 3 25s', 'System', '41-019-49', { ngW: '3.2', chIn: '25.5', min: '6.1', out: '6.0 to 25.2', out2: '6.3 to 26.5', dhwIn: '30.6', dhwOut: '6.0 to 30.0', fl20: '1,085', fl30: '723', cond: '2.55', w: '110', kg: '31.9', kgw: '36.1' }),
  biVaiR(CFG_GWUR, 'Ultimate 3 25r', 'Regular', '41-019-52', { ngH: '2.7', ngW: '3.2', ngMin: '0.648', chIn: '25.5', min: '6.1', out: '6.0 to 25.2', out2: '6.4 to 26.5', dhwIn: '30.6', dhwOut: '6.0 to 30.0', fl20: '1,085', fl30: '723', cond: '2.55', w: '75', kg: '22', kgw: '26' }),
  biVaiR(CFG_GWUS, 'Ultimate 3 25s', 'System', '41-019-51', { ngW: '3.2', chIn: '25.5', min: '6.1', out: '6.0 to 25.2', out2: '6.3 to 26.5', dhwIn: '30.6', dhwOut: '6.0 to 30.0', fl20: '1,085', fl30: '723', cond: '2.55', w: '110', kg: '31.9', kgw: '36.1' })
  ,
  biVok(CFG_VKEV, 'evolve 24C', 'Combi', '47-364-37', { maxP: '2.5 bar', minP: '0.25 to 0.45 bar', sysVol: '74 litres', pre: '1 bar', minHF: '350 l/h', minFlow: '2', dMin: '0.2 bar', dMax: '8 bar', fuseI: '4 A T (PCB), 3.15 A F (connections block)', fuseE: '3 A', inCH: '18.00', inMin: '6.70', o8Max: '17.60', o8Min: '3.61', o5Max: '19.17', o5Min: '3.99', inDHW: '26.00', flow35: '10.6', reg: '9', gasCH: '1.90', gasDHW: '2.75', gasMin: '0.39', vessel: '8 litres', dims: '420 x 740 x 275 mm', kg: '35', pCH: '54', pDHW: '86', fH: '10.0 m', fV: '11.0 m' }),
  biVok(CFG_VKEV, 'evolve 28C', 'Combi', '47-364-38', { maxP: '2.5 bar', minP: '0.25 to 0.45 bar', sysVol: '74 litres', pre: '1 bar', minHF: '350 l/h', minFlow: '2', dMin: '0.2 bar', dMax: '8 bar', fuseI: '4 A T (PCB), 3.15 A F (connections block)', fuseE: '3 A', inCH: '24.00', inMin: '4.30', o8Max: '23.54', o8Min: '4.19', o5Max: '25.56', o5Min: '4.58', inDHW: '30.00', flow35: '12.3', reg: '10', gasCH: '2.54', gasDHW: '3.17', gasMin: '0.45', vessel: '8 litres', dims: '420 x 740 x 275 mm', kg: '36', pCH: '65', pDHW: '89', fH: '10.0 m', fV: '11.0 m' }),
  biVok(CFG_VKEV, 'evolve 32C', 'Combi', '47-364-39', { maxP: '2.5 bar', minP: '0.25 to 0.45 bar', sysVol: '74 litres', pre: '1 bar', minHF: '350 l/h', minFlow: '2', dMin: '0.2 bar', dMax: '8 bar', fuseI: '4 A T (PCB), 3.15 A F (connections block)', fuseE: '3 A', inCH: '30.00', inMin: '4.90', o8Max: '29.37', o8Min: '4.74', o5Max: '31.77', o5Min: '5.26', inDHW: '34.60', flow35: '14.2', reg: '12', gasCH: '3.17', gasDHW: '3.66', gasMin: '0.52', vessel: '8 litres', dims: '420 x 740 x 275 mm', kg: '38', pCH: '79', pDHW: '94', fH: '8.0 m', fV: '9.0 m' }),
  biVok(CFG_VKEV, 'evolve 36C', 'Combi', '47-364-40', { maxP: '2.5 bar', minP: '0.25 to 0.45 bar', sysVol: '74 litres', pre: '1 bar', minHF: '350 l/h', minFlow: '2', dMin: '0.2 bar', dMax: '8 bar', fuseI: '4 A T (PCB), 3.15 A F (connections block)', fuseE: '3 A', inCH: '32.00', inMin: '5.10', o8Max: '31.39', o8Min: '4.99', o5Max: '34.08', o5Min: '5.28', inDHW: '36.00', flow35: '14.7', reg: '12', gasCH: '3.38', gasDHW: '3.81', gasMin: '0.54', vessel: '9 litres', dims: '420 x 740 x 350 mm', kg: '39', pCH: '93', pDHW: '103', fH: '6.0 m', fV: '7.0 m' }),
  biVok(CFG_VKEV, 'evolve 42C', 'Combi', '47-364-41', { maxP: '2.5 bar', minP: '0.25 to 0.45 bar', sysVol: '74 litres', pre: '1 bar', minHF: '350 l/h', minFlow: '2', dMin: '0.2 bar', dMax: '8 bar', fuseI: '4 A T (PCB), 3.15 A F (connections block)', fuseE: '3 A', inCH: '35.00', inMin: '6.00', o8Max: '34.30', o8Min: '5.87', o5Max: '37.21', o5Min: '6.32', inDHW: '42.00', flow35: '17.2', reg: '14', gasCH: '3.70', gasDHW: '4.44', gasMin: '0.63', vessel: '9 litres', dims: '420 x 740 x 350 mm', kg: '39', pCH: '85', pDHW: '110', fH: '5.0 m', fV: '6.0 m' }),
  biVok(CFG_VKEVS, 'evolve 18S', 'System', '41-094-98', { maxP: '3.0 bar', minP: '0.25 to 0.45 bar', sysVol: '74 litres', pre: '1 bar', minHF: '350 l/h', fuseI: '4 A T (PCB), 3.15 A F (connections block)', fuseE: '3 A', inCH: '18.00', inMin: '6.70', o8Max: '17.60', o8Min: '3.61', o5Max: '19.17', o5Min: '3.99', gasCH: '1.90', gasMin: '0.39', vessel: '8 litres', dims: '420 x 740 x 275 mm', kg: '34', pCH: '54', fH: '10.0 m', fV: '11.0 m' }),
  biVok(CFG_VKEVS, 'evolve 24S', 'System', '41-094-99', { maxP: '3.0 bar', minP: '0.25 to 0.45 bar', sysVol: '74 litres', pre: '1 bar', minHF: '350 l/h', fuseI: '4 A T (PCB), 3.15 A F (connections block)', fuseE: '3 A', inCH: '24.00', inMin: '4.30', o8Max: '23.54', o8Min: '4.19', o5Max: '25.56', o5Min: '4.58', gasCH: '2.54', gasMin: '0.45', vessel: '8 litres', dims: '420 x 740 x 275 mm', kg: '34', pCH: '65', fH: '10.0 m', fV: '11.0 m' }),
  biVok(CFG_VKEVS, 'evolve 30S', 'System', '41-364-01', { maxP: '3.0 bar', minP: '0.25 to 0.45 bar', sysVol: '74 litres', pre: '1 bar', minHF: '350 l/h', fuseI: '4 A T (PCB), 3.15 A F (connections block)', fuseE: '3 A', inCH: '32.00', inMin: '5.10', o8Max: '31.39', o8Min: '4.99', o5Max: '34.08', o5Min: '5.28', gasCH: '3.38', gasMin: '0.54', vessel: '9 litres', dims: '420 x 740 x 350 mm', kg: '37', pCH: '93', fH: '6.0 m', fV: '7.0 m' }),
  biVok(CFG_VKEVS, 'evolve 35S', 'System', '41-364-02', { maxP: '3.0 bar', minP: '0.25 to 0.45 bar', sysVol: '74 litres', pre: '1 bar', minHF: '350 l/h', fuseI: '4 A T (PCB), 3.15 A F (connections block)', fuseE: '3 A', inCH: '35.00', inMin: '6.00', o8Max: '34.30', o8Min: '5.87', o5Max: '37.21', o5Min: '6.32', gasCH: '3.70', gasMin: '0.63', vessel: '9 litres', dims: '420 x 740 x 350 mm', kg: '37', pCH: '85', fH: '5.0 m', fV: '6.0 m' })
  ,
  biVok(CFG_VKEHI, 'Easi-Heat i 25C', 'Combi', '47-364-71', { maxP: '2.5 bar', minP: '0.25 to 0.45 bar', minHF: '350 l/h', sysVol: '74 litres', pre: '1 bar', vessel: '8 litres', minFlow: '2', dMin: '0.5 bar', dMax: '8 bar', fuseI: '3.15 A T (PCB), 3.15 A F (connections block)', fuseE: '4 A', dims: '400 x 700 x 275 mm', fH: '5.85 m', fV: '6.85 m', inCH: '20.00', inMin: '8.20', o8Max: '19.38', o8Min: '2.94', o5Max: '20.92', o5Min: '3.04', inDHW: '25.00', flow35: '10.2', gasCH: '2.12', gasDHW: '2.64', gasMin: '0.33', kg: '28.5', pCH: '65', pDHW: '98' }),
  biVok(CFG_VKEHI, 'Easi-Heat i 29C', 'Combi', '47-364-72', { maxP: '2.5 bar', minP: '0.25 to 0.45 bar', minHF: '350 l/h', sysVol: '74 litres', pre: '1 bar', vessel: '8 litres', minFlow: '2', dMin: '0.5 bar', dMax: '8 bar', fuseI: '3.15 A T (PCB), 3.15 A F (connections block)', fuseE: '4 A', dims: '400 x 700 x 275 mm', fH: '4.85 m', fV: '5.85 m', inCH: '25.00', inMin: '12.00', o8Max: '24.38', o8Min: '3.79', o5Max: '26.78', o5Min: '4.09', inDHW: '30.00', flow35: '12.3', gasCH: '2.64', gasDHW: '3.17', gasMin: '0.42', kg: '30', pCH: '88', pDHW: '105' }),
  biVok(CFG_VKVMC, 'Vibe Max 26C', 'Combi', '47-364-69', { maxP: '2.5 bar', minP: '0.25 to 0.45 bar', minHF: '350 l/h', sysVol: '74 litres', pre: '1 bar', vessel: '8 litres', minFlow: '2', dMin: '0.5 bar', dMax: '8 bar', fuseI: '3.15 A T (PCB), 3.15 A F (connections block)', fuseE: '4 A', dims: '400 x 700 x 275 mm', fH: '5.85 m', fV: '6.85 m', inCH: '20.00', inMin: '8.20', o8Max: '19.38', o8Min: '2.94', o5Max: '20.92', o5Min: '3.04', inDHW: '25.00', flow35: '10.2', gasCH: '2.12', gasDHW: '2.64', gasMin: '0.33', kg: '28.5', pCH: '65', pDHW: '98' }),
  biVok(CFG_VKVMC, 'Vibe Max 30C', 'Combi', '47-364-70', { maxP: '2.5 bar', minP: '0.25 to 0.45 bar', minHF: '350 l/h', sysVol: '74 litres', pre: '1 bar', vessel: '8 litres', minFlow: '2', dMin: '0.5 bar', dMax: '8 bar', fuseI: '3.15 A T (PCB), 3.15 A F (connections block)', fuseE: '4 A', dims: '400 x 700 x 275 mm', fH: '4.85 m', fV: '5.85 m', inCH: '25.00', inMin: '12.00', o8Max: '24.38', o8Min: '3.79', o5Max: '26.78', o5Min: '4.09', inDHW: '30.00', flow35: '12.3', gasCH: '2.64', gasDHW: '3.17', gasMin: '0.42', kg: '30', pCH: '88', pDHW: '105' }),
  biVok(CFG_VKEPL, 'Easi-Heat Plus 25C', 'Combi', '47-364-29', { maxP: '2.5 bar', minP: '0.25 to 0.45 bar', sysVol: '74 litres', pre: '1 bar', vessel: '8 litres', minFlow: '2', dMin: '0.15 bar', dMax: '6 bar', fuseI: '3.15 A T (PCB), 3.15 A F (connections block)', fuseE: '3 A', dims: '405 x 792 x 253 mm', nox: '5', inCH: '20.00', o8Max: '19.50', o8Min: '4.91', o5Max: '20.84', o5Min: '5.36', inDHW: '25.00', flow35: '10.2', gasCH: '2.12', gasDHW: '2.64', gasMin: '0.53', kg: '27', pW: '82', fH: '5.85 m', fV: '6.85 m', fH2: '15.3 m', fV2: '20.3 m' }),
  biVok(CFG_VKEPL, 'Easi-Heat Plus 29C', 'Combi', '47-364-30', { maxP: '2.5 bar', minP: '0.25 to 0.45 bar', sysVol: '74 litres', pre: '1 bar', vessel: '8 litres', minFlow: '2', dMin: '0.15 bar', dMax: '6 bar', fuseI: '3.15 A T (PCB), 3.15 A F (connections block)', fuseE: '3 A', dims: '405 x 792 x 253 mm', nox: '5', inCH: '25.00', o8Max: '24.45', o8Min: '5.90', o5Max: '26.23', o5Min: '6.40', inDHW: '29.00', flow35: '11.9', gasCH: '2.64', gasDHW: '3.07', gasMin: '0.63', kg: '28', pW: '89', fH: '4.85 m', fV: '5.85 m', fH2: '12.8 m', fV2: '17.8 m' }),
  biVok(CFG_VKVMS, 'Vibe Max 20S', 'System', '41-364-19', { maxP: '3.0 bar', minP: '0.25 to 0.45 bar', minHF: '350 l/h', sysVol: '74 litres', pre: '1 bar', vessel: '8 litres', fuseI: '4 A T (PCB), 3.15 A F (connections block)', fuseE: '3 A', dims: '400 x 700 x 275 mm', inCH: '20.00', inMin: '8.20', o8Max: '19.38', o8Min: '2.94', o5Max: '20.92', o5Min: '3.04', gasCH: '2.12', gasMin: '0.33', kg: '27.5', pCH: '62', fH: '5.85 m', fV: '6.85 m' }),
  biVok(CFG_VKVMS, 'Vibe Max 25S', 'System', '41-364-20', { maxP: '3.0 bar', minP: '0.25 to 0.45 bar', minHF: '350 l/h', sysVol: '74 litres', pre: '1 bar', vessel: '8 litres', fuseI: '4 A T (PCB), 3.15 A F (connections block)', fuseE: '3 A', dims: '400 x 700 x 275 mm', inCH: '25.00', inMin: '12.00', o8Max: '24.38', o8Min: '3.79', o5Max: '26.78', o5Min: '4.09', gasCH: '2.64', gasMin: '0.42', kg: '29', pCH: '85', fH: '4.85 m', fV: '5.85 m' }),
  biVok(CFG_VKVA, 'Vibe 20A', 'System', '41-094-84', { maxP: '3.0 bar', minP: '0.25 to 0.45 bar', minHF: '350 l/h', sysVol: '74 litres', pre: '1 bar', vessel: '8 litres', fuseI: '3.15 A T (PCB), 3.15 A F (connections block)', fuseE: '3 A', dims: '405 x 715 x 250 mm', nox: '5', inCH: '20.00', o8Max: '19.50', o8Min: '4.91', o5Max: '20.84', o5Min: '5.36', gasCH: '2.12', gasMin: '0.53', kg: '26', pW: '96', fH: '5.85 m', fV: '6.85 m', fHt: '45 m / 45 m', fVt: '45 m / 45 m' }),
  biVok(CFG_VKVA, 'Vibe 25A', 'System', '41-094-85', { maxP: '3.0 bar', minP: '0.25 to 0.45 bar', minHF: '350 l/h', sysVol: '74 litres', pre: '1 bar', vessel: '8 litres', fuseI: '3.15 A T (PCB), 3.15 A F (connections block)', fuseE: '3 A', dims: '405 x 715 x 250 mm', nox: '5', inCH: '25.00', o8Max: '24.45', o8Min: '5.90', o5Max: '26.23', o5Min: '6.40', gasCH: '2.64', gasMin: '0.63', kg: '28', pW: '107', fH: '4.85 m', fV: '5.85 m', fHt: '40 m / 40 m', fVt: '40 m / 40 m' }),
  biVok(CFG_VKUM, 'Unica Max 30C', 'Combi', '47-364-75', { inCH: '25.00', o8Max: '24.43', o8Min: '4.68', o5Max: '26.88', o5Min: '5.06', inDHW: '30.00', flow35: '12.9', reg: '10', gasCH: '2.64', gasDHW: '3.17', pCH: '85', pDHW: '96', maxP: '2.5 bar', minP: '0.25 to 0.45 bar', minHF: '350 l/h', sysVol: '74 litres', pre: '1 bar', vessel: '10 litres', minFlow: '2', dMin: '0.2 bar', dMax: '8 bar', fuseI: '4 A T (PCB), 3.15 A F (connections block)', fuseE: '3 A', dims: '470 x 740 x 350 mm', kg: '39.5', gasMin: '0.52', fH: '6.0 m', fV: '7.0 m' }),
  biVok(CFG_VKUM, 'Unica Max 35C', 'Combi', '47-364-61', { inCH: '32.00', o8Max: '31.23', o8Min: '4.69', o5Max: '34.37', o5Min: '5.06', inDHW: '34.60', flow35: '14.9', reg: '12', gasCH: '3.38', gasDHW: '3.66', pCH: '85', pDHW: '96', maxP: '2.5 bar', minP: '0.25 to 0.45 bar', minHF: '350 l/h', sysVol: '74 litres', pre: '1 bar', vessel: '10 litres', minFlow: '2', dMin: '0.2 bar', dMax: '8 bar', fuseI: '4 A T (PCB), 3.15 A F (connections block)', fuseE: '3 A', dims: '470 x 740 x 350 mm', kg: '39.5', gasMin: '0.52', fH: '6.0 m', fV: '7.0 m' }),
  biVok(CFG_VKUM, 'Unica Max 40C', 'Combi', '47-364-62', { inCH: '32.00', o8Max: '31.23', o8Min: '4.69', o5Max: '34.37', o5Min: '5.06', inDHW: '40.00', flow35: '16.4', reg: '14', gasCH: '3.38', gasDHW: '4.23', pCH: '101', pDHW: '112', maxP: '2.5 bar', minP: '0.25 to 0.45 bar', minHF: '350 l/h', sysVol: '74 litres', pre: '1 bar', vessel: '10 litres', minFlow: '2', dMin: '0.2 bar', dMax: '8 bar', fuseI: '4 A T (PCB), 3.15 A F (connections block)', fuseE: '3 A', dims: '470 x 740 x 350 mm', kg: '39.5', gasMin: '0.52', fH: '6.0 m', fV: '7.0 m' }),
  biVok(CFG_VKMY, 'Mynute i20', 'System', '41-094-81', { inCH: '20.00', o8Max: '19.62', o8Min: '2.76', o5Max: '21.44', o5Min: '3.00', gasCH: '2.12', gasMin: '0.30', dims: '400 x 780 x 338 mm', kg: '40', pW: '102', fH: '7.80 m', fV: '8.80 m', fH2: '20 m', fV2: '21 m', fHt: '50 m / 50 m', fVt: '50 m / 50 m', maxP: '2.5 bar', minP: '0.25 to 0.45 bar', minHF: '300 l/h', sysVol: '76 litres', pre: '1 bar', vessel: '8 litres', fuseI: '3.15 A T (PCB), 3.15 A F (connections block)', fuseE: '3 A', nox: '5' }),
  biVok(CFG_VKMY, 'Mynute i30', 'System', '41-094-82', { inCH: '30.00', o8Max: '29.25', o8Min: '3.50', o5Max: '31.77', o5Min: '3.80', gasCH: '3.17', gasMin: '0.38', dims: '400 x 780 x 388 mm', kg: '38', pW: '118', fH: '7.85 m', fV: '8.85 m', fH2: '14.85 m', fV2: '15.85 m', fHt: '38 m / 38 m', fVt: '38 m / 38 m', maxP: '2.5 bar', minP: '0.25 to 0.45 bar', minHF: '300 l/h', sysVol: '76 litres', pre: '1 bar', vessel: '8 litres', fuseI: '3.15 A T (PCB), 3.15 A F (connections block)', fuseE: '3 A', nox: '5' }),
  biVok(CFG_VKUI, 'Unica i28', 'Combi', '47-364-14', { inCH: '20.00', o8Max: '19.62', o8Min: '2.76', o5Max: '21.44', o5Min: '3.00', inDHW: '28.00', flow35: '11.5', gasCH: '2.12', gasDHW: '2.96', gasMin: '0.30', dims: '400 x 780 x 358 mm', kg: '40', pW: '120', fH: '7.80 m', fV: '8.80 m', fH2: '20 m', fV2: '25 m', fHt: '50 m / 50 m', fVt: '50 m / 50 m', maxP: '2.5 bar', minP: '0.25 to 0.45 bar', minHF: '300 l/h', sysVol: '76 litres', pre: '1 bar', vessel: '8 litres', minFlow: '2', dMin: '0.2 bar', dMax: '6 bar', fuseI: '3.15 A T (PCB), 3.15 A F (connections block)', fuseE: '3 A', nox: '5' }),
  biVok(CFG_VKUI, 'Unica i32', 'Combi', '47-364-15', { inCH: '25.00', o8Max: '24.58', o8Min: '3.16', o5Max: '26.70', o5Min: '3.44', inDHW: '32.00', flow35: '13.1', gasCH: '2.64', gasDHW: '3.38', gasMin: '0.34', dims: '400 x 780 x 358 mm', kg: '42', pW: '126', fH: '7.80 m', fV: '8.80 m', fH2: '20 m', fV2: '25 m', fHt: '50 m / 50 m', fVt: '50 m / 50 m', maxP: '2.5 bar', minP: '0.25 to 0.45 bar', minHF: '300 l/h', sysVol: '76 litres', pre: '1 bar', vessel: '8 litres', minFlow: '2', dMin: '0.2 bar', dMax: '6 bar', fuseI: '3.15 A T (PCB), 3.15 A F (connections block)', fuseE: '3 A', nox: '5' }),
  biVok(CFG_VKUI, 'Unica i36', 'Combi', '47-364-16', { inCH: '30.00', o8Max: '29.25', o8Min: '3.50', o5Max: '31.77', o5Min: '3.80', inDHW: '36.00', flow35: '14.7', gasCH: '3.17', gasDHW: '3.81', gasMin: '0.38', dims: '400 x 780 x 384 mm', kg: '41', pW: '136', fH: '7.85 m', fV: '8.85 m', fH2: '14.85 m', fV2: '19.85 m', fHt: '38 m / 38 m', fVt: '38 m / 38 m', maxP: '2.5 bar', minP: '0.25 to 0.45 bar', minHF: '300 l/h', sysVol: '76 litres', pre: '1 bar', vessel: '8 litres', minFlow: '2', dMin: '0.2 bar', dMax: '6 bar', fuseI: '3.15 A T (PCB), 3.15 A F (connections block)', fuseE: '3 A', nox: '5' }),
  biVok(CFG_VKLO, 'Linea ONE', 'Combi', '47-364-03', { inCH: '30.00', o8Max: '29.34', o8Min: '3.70', o5Max: '31.92', o5Min: '4.02', inDHW: '38.10', flow35: '15.60', gasCH: '3.17', gasDHW: '4.03', gasMin: '0.40', maxP: '2.5 bar', minP: '0.50 bar', minHF: '1000 l/h', sysVol: '91 litres', pre: '1 bar', vessel: '10 litres', minFlow: '2', dMin: '0.2 bar', dMax: '6 bar', dims: '453 x 845 x 358 mm', kg: '44', pW: '116', fuseI: '2 A', fuseE: '3 A', nox: '5', fH: '3.85 m', fV: '4.85 m', fH2: '7.85 m', fV2: '8.85 m', fHt: '30 m + 30 m', fVt: '30 m + 30 m' })
  ,
  biAlp(CFG_ALIN, 'InTec 30C', 'Combi', '47-532-48', {'inNetCH': '24.4', 'inNetDHW': '29.5', 'outCond': '26.3', 'outNon': '23.6', 'outMin': '4.8', 'outDHW': '29.0', 'outDHWmax': '31.7', 'gas': '3.12', 'flow35': '12.0', 'flow30': '14.0', 'nox': '5', 'maxT': '82', 'maxP': '2.5', 'minP': '0.5', 'recP': '1.0', 'prv': '3.0', 'vessel': '8.0', 'charge': '1.0', 'pw': '120', 'h': '720', 'w': '440', 'dp': '300', 'bottom': '150', 'topH': '235', 'topV': '150', 'sides': '5', 'front': '450', 'jig': '250', 'fH': '12', 'fV': '14', 'kg': '39', 'kgw': '42'}),
  biAlp(CFG_ALIN, 'InTec 34C', 'Combi', '47-532-49', {'inNetCH': '28.0', 'inNetDHW': '33.7', 'outCond': '30.7', 'outNon': '27.6', 'outMin': '7.2', 'outDHW': '33.7', 'outDHWmax': '36.7', 'gas': '3.62', 'flow35': '14.5', 'flow30': '16.9', 'nox': '5', 'maxT': '82', 'maxP': '2.5', 'minP': '0.5', 'recP': '1.0', 'prv': '3.0', 'vessel': '8.0', 'charge': '1.0', 'pw': '125', 'h': '720', 'w': '440', 'dp': '300', 'bottom': '150', 'topH': '235', 'topV': '150', 'sides': '5', 'front': '450', 'jig': '250', 'fH': '12', 'fV': '14', 'kg': '41', 'kgw': '44'}),
  biAlp(CFG_ALIN2, 'InTec2 26CE', 'Combi', '47-532-66', {'inNetCH': '20.5', 'inNetDHW': '26.7', 'outCond': '21.3', 'outNon': '20', 'outMin': '2.8', 'outDHW': '26', 'gas': '2.83', 'flow35': '10.7', 'flow30': '12.5', 'nox': '5', 'maxT': '85', 'maxP': '2.5', 'minP': '0.5', 'recP': '1.0', 'prv': '3.0', 'vessel': '8.0', 'charge': '1.0', 'pw': '90', 'h': '712', 'w': '440', 'dp': '276', 'bottom': '150', 'topH': '235', 'topV': '150', 'sides': '5', 'front': '450', 'jig': '250', 'fH': '12', 'fV': '14', 'kg': '33.4', 'kgw': '35.8'}),
  biAlp(CFG_ALIN2, 'InTec2 30CE', 'Combi', '47-532-67', {'inNetCH': '24.6', 'inNetDHW': '28.7', 'outCond': '25.5', 'outNon': '24', 'outMin': '2.8', 'outDHW': '28', 'gas': '3.04', 'flow35': '11.7', 'flow30': '13.7', 'nox': '5', 'maxT': '85', 'maxP': '2.5', 'minP': '0.5', 'recP': '1.0', 'prv': '3.0', 'vessel': '8.0', 'charge': '1.0', 'pw': '95', 'h': '712', 'w': '440', 'dp': '276', 'bottom': '150', 'topH': '235', 'topV': '150', 'sides': '5', 'front': '450', 'jig': '250', 'fH': '12', 'fV': '14', 'kg': '33.4', 'kgw': '35.8'}),
  biAlp(CFG_ALIN2, 'InTec2 35CE', 'Combi', '47-532-68', {'inNetCH': '28.7', 'inNetDHW': '34.9', 'outCond': '29.8', 'outNon': '28', 'outMin': '3.5', 'outDHW': '34', 'gas': '3.69', 'flow35': '14.4', 'flow30': '16.8', 'nox': '5', 'maxT': '85', 'maxP': '2.5', 'minP': '0.5', 'recP': '1.0', 'prv': '3.0', 'vessel': '8.0', 'charge': '1.0', 'pw': '105', 'h': '712', 'w': '440', 'dp': '276', 'bottom': '150', 'topH': '235', 'topV': '150', 'sides': '5', 'front': '450', 'jig': '250', 'fH': '12', 'fV': '14', 'kg': '33.4', 'kgw': '35.8'}),
  biAlp(CFG_ALER, 'E-Tec 15R', 'Regular', '41-532-49', {'inNetCH': '15.4', 'outCond': '16.3', 'outNon': '15', 'outMin': '4.3', 'gas': '3.05', 'nox': '6', 'maxT': '80', 'maxP': '2.5', 'minP': '0.5', 'recP': '1.0', 'prv': '3.0', 'vessel': '8.0', 'charge': '1.0', 'pw': '55', 'h': '600', 'w': '390', 'dp': '300', 'bottom': '250', 'topH': '235', 'topV': '150', 'sides': '5', 'front': '450', 'fH': '12', 'fV': '14', 'kg': '25', 'kgw': '27'}),
  biAlp(CFG_ALER, 'E-Tec 20R', 'Regular', '41-532-50', {'inNetCH': '20.6', 'outCond': '21.7', 'outNon': '20', 'outMin': '4.3', 'gas': '3.05', 'nox': '6', 'maxT': '80', 'maxP': '2.5', 'minP': '0.5', 'recP': '1.0', 'prv': '3.0', 'vessel': '8.0', 'charge': '1.0', 'pw': '55', 'h': '600', 'w': '390', 'dp': '300', 'bottom': '250', 'topH': '235', 'topV': '150', 'sides': '5', 'front': '450', 'fH': '12', 'fV': '14', 'kg': '25', 'kgw': '27'}),
  biAlp(CFG_ALER, 'E-Tec 25R', 'Regular', '41-532-51', {'inNetCH': '24.6', 'outCond': '26.1', 'outNon': '24.1', 'outMin': '4.3', 'gas': '3.05', 'nox': '6', 'maxT': '80', 'maxP': '2.5', 'minP': '0.5', 'recP': '1.0', 'prv': '3.0', 'vessel': '8.0', 'charge': '1.0', 'pw': '55', 'h': '600', 'w': '390', 'dp': '300', 'bottom': '250', 'topH': '235', 'topV': '150', 'sides': '5', 'front': '450', 'fH': '12', 'fV': '14', 'kg': '25', 'kgw': '27'}),
  biAlp(CFG_ALES, 'E-Tec 20S', 'System', '41-532-47', {'inNetCH': '24.6', 'inNetDHW': '28.8', 'outCond': '26.1', 'outNon': '24.1', 'outMin': '4.3', 'outDHW': '28.3', 'gas': '3.05', 'nox': '6', 'maxT': '85', 'maxP': '2.5', 'minP': '0.5', 'recP': '1.0', 'prv': '3.0', 'vessel': '8.0', 'charge': '1.0', 'pw': '80', 'h': '712', 'w': '440', 'dp': '256', 'bottom': '150', 'topH': '235', 'topV': '150', 'sides': '5', 'front': '450', 'jig': '250', 'fH': '12', 'fV': '14', 'kg': '32.2', 'kgw': '33.9'}),
  biAlp(CFG_ALES, 'E-Tec 30S', 'System', '41-532-48', {'inNetCH': '28.6', 'inNetDHW': '32.6', 'outCond': '29.7', 'outNon': '28', 'outMin': '4.9', 'outDHW': '32', 'gas': '3.45', 'nox': '6', 'maxT': '85', 'maxP': '2.5', 'minP': '0.5', 'recP': '1.0', 'prv': '3.0', 'vessel': '8.0', 'charge': '1.0', 'pw': '105', 'h': '712', 'w': '440', 'dp': '256', 'bottom': '150', 'topH': '235', 'topV': '150', 'sides': '5', 'front': '450', 'jig': '250', 'fH': '12', 'fV': '14', 'kg': '34.1', 'kgw': '36.0'}),
  biAlp(CFG_ALES, 'E-Tec 35S', 'System', '41-532-52', {'inNetCH': '32.7', 'inNetDHW': '39.0', 'outCond': '34.4', 'outNon': '32', 'outMin': '6.1', 'outDHW': '37.9', 'gas': '4.13', 'nox': '6', 'maxT': '85', 'maxP': '2.5', 'minP': '0.5', 'recP': '1.0', 'prv': '3.0', 'vessel': '8.0', 'charge': '1.0', 'pw': '120', 'h': '712', 'w': '440', 'dp': '256', 'bottom': '150', 'topH': '235', 'topV': '150', 'sides': '5', 'front': '450', 'jig': '250', 'fH': '12', 'fV': '14', 'kg': '36.7', 'kgw': '40.5'}),
  biAlp(CFG_ALEC, 'E-Tec 28', 'Combi', '47-532-69', {'inNetCH': '24.6', 'inNetDHW': '28.8', 'outCond': '26.1', 'outNon': '24.1', 'outMin': '4.3', 'outDHW': '28.3', 'gas': '3.05', 'flow35': '12.1', 'flow30': '14.1', 'nox': '6', 'maxT': '85', 'maxP': '2.5', 'minP': '0.5', 'recP': '1.0', 'prv': '3.0', 'vessel': '8.0', 'charge': '1.0', 'pw': '80', 'h': '712', 'w': '440', 'dp': '268', 'bottom': '150', 'topH': '235', 'topV': '150', 'sides': '5', 'front': '450', 'jig': '250', 'fH': '12', 'fV': '14', 'kg': '33.6', 'kgw': '35.8'}),
  biAlp(CFG_ALEC, 'E-Tec 33', 'Combi', '47-532-70', {'inNetCH': '28.6', 'inNetDHW': '32.6', 'outCond': '29.7', 'outNon': '28', 'outMin': '4.9', 'outDHW': '32', 'gas': '3.45', 'flow35': '14.1', 'flow30': '16.5', 'nox': '6', 'maxT': '85', 'maxP': '2.5', 'minP': '0.5', 'recP': '1.0', 'prv': '3.0', 'vessel': '8.0', 'charge': '1.0', 'pw': '105', 'h': '712', 'w': '440', 'dp': '268', 'bottom': '150', 'topH': '235', 'topV': '150', 'sides': '5', 'front': '450', 'jig': '250', 'fH': '12', 'fV': '14', 'kg': '35.5', 'kgw': '37.9'}),
  biAlp(CFG_ALEP, 'E-Tec Plus 28', 'Combi', '47-532-77', {'inNetCH': '24.6', 'inNetDHW': '28.8', 'outCond': '26.1', 'outNon': '24.1', 'outMin': '4.3', 'outDHW': '28.3', 'gas': '3.05', 'flow35': '12.1', 'flow30': '14.1', 'nox': '6', 'maxT': '85', 'maxP': '2.5', 'minP': '0.5', 'recP': '1.0', 'prv': '3.0', 'vessel': '8.0', 'charge': '1.0', 'pw': '80', 'h': '712', 'w': '440', 'dp': '268', 'bottom': '150', 'topH': '235', 'topV': '150', 'sides': '5', 'front': '450', 'jig': '250', 'fH': '12', 'fV': '14', 'kg': '33.6', 'kgw': '35.8'}),
  biAlp(CFG_ALEP, 'E-Tec Plus 33', 'Combi', '47-532-78', {'inNetCH': '28.6', 'inNetDHW': '32.6', 'outCond': '29.7', 'outNon': '28', 'outMin': '4.9', 'outDHW': '32', 'gas': '3.45', 'flow35': '14.1', 'flow30': '16.5', 'nox': '6', 'maxT': '85', 'maxP': '2.5', 'minP': '0.5', 'recP': '1.0', 'prv': '3.0', 'vessel': '8.0', 'charge': '1.0', 'pw': '105', 'h': '712', 'w': '440', 'dp': '268', 'bottom': '150', 'topH': '235', 'topV': '150', 'sides': '5', 'front': '450', 'jig': '250', 'fH': '12', 'fV': '14', 'kg': '35.5', 'kgw': '37.9'}),
  biAlp(CFG_ALEP, 'E-Tec Plus 38', 'Combi', '47-532-79', {'inNetCH': '32.7', 'inNetDHW': '39', 'outCond': '34.4', 'outNon': '32', 'outMin': '6.1', 'outDHW': '37.9', 'gas': '4.13', 'flow35': '15.9', 'flow30': '18.6', 'nox': '6', 'maxT': '85', 'maxP': '2.5', 'minP': '0.5', 'recP': '1.0', 'prv': '3.0', 'vessel': '8.0', 'charge': '1.0', 'pw': '120', 'h': '712', 'w': '440', 'dp': '268', 'bottom': '150', 'topH': '235', 'topV': '150', 'sides': '5', 'front': '450', 'jig': '250', 'fH': '12', 'fV': '14', 'kg': '36.7', 'kgw': '40.5'}),
  biAlp(CFG_ALEV, 'Evoke 28', 'Combi', '47-532-71', {'inNetCH': '24.6', 'inNetDHW': '28.8', 'outCond': '26.1', 'outNon': '24.1', 'outMin': '4.3', 'outDHW': '28.3', 'gas': '3.05', 'flow35': '12.1', 'flow30': '14.1', 'nox': '6', 'maxT': '85', 'maxP': '2.5', 'minP': '0.5', 'recP': '1.0', 'prv': '3.0', 'vessel': '8.0', 'charge': '1.0', 'pw': '80', 'h': '712', 'w': '440', 'dp': '268', 'bottom': '150', 'topH': '235', 'topV': '150', 'sides': '5', 'front': '450', 'jig': '250', 'fH': '12', 'fV': '14', 'kg': '33.6', 'kgw': '35.8'}),
  biAlp(CFG_ALEV, 'Evoke 33', 'Combi', '47-532-72', {'inNetCH': '28.6', 'inNetDHW': '32.6', 'outCond': '29.7', 'outNon': '28', 'outMin': '4.9', 'outDHW': '32', 'gas': '3.45', 'flow35': '14.1', 'flow30': '16.5', 'nox': '6', 'maxT': '85', 'maxP': '2.5', 'minP': '0.5', 'recP': '1.0', 'prv': '3.0', 'vessel': '8.0', 'charge': '1.0', 'pw': '105', 'h': '712', 'w': '440', 'dp': '268', 'bottom': '150', 'topH': '235', 'topV': '150', 'sides': '5', 'front': '450', 'jig': '250', 'fH': '12', 'fV': '14', 'kg': '35.5', 'kgw': '37.9'}),
  biBia(CFG_BIAP, '25C ERP', 'Combi', '47-583-35', { ...BIA_COMBI, inCH: '20.0', inDHW: '25.0', inMin: '6.0', outMax: '19.5', outCond: '21.2', outDHW: '24.4', outMin: '5.8', flow35: '11.4', flow30: '13.3', gasCH: '2.15', gasDHW: '2.67', gasMin: '0.65', co2max: '9.3 to 9.9', co2min: '8.5 to 9.1', pw: '82', kg: '33' }),
  biBia(CFG_BIAP, '30C ERP', 'Combi', '47-583-36', { ...BIA_COMBI, inCH: '25.0', inDHW: '30.0', inMin: '8.5', outMax: '24.4', outCond: '26.6', outDHW: '29.2', outMin: '8.3', flow35: '13.5', flow30: '16.2', gasCH: '2.65', gasDHW: '3.18', gasMin: '0.90', pw: '78', kg: '34.5' }),
  biBia(CFG_BIAP, '35C ERP', 'Combi', '47-583-37', { ...BIA_COMBI, inCH: '30.0', inDHW: '34.0', inMin: '8.5', outMax: '29.5', outCond: '32.1', outDHW: '33.4', outMin: '8.3', flow35: '15.6', flow30: '19.2', gasCH: '3.17', gasDHW: '3.60', gasMin: '0.90', pw: '85', kg: '34.5' }),
  biBia(CFG_BIIN, '25C ERP', 'Combi', '47-583-38', { ...BIA_COMBI, inCH: '20.0', inDHW: '25.0', inMin: '6.0', outMax: '19.5', outCond: '21.2', outDHW: '24.4', outMin: '5.8', flow35: '11.4', flow30: '13.3', gasCH: '2.15', gasDHW: '2.67', gasMin: '0.65', pw: '82', kg: '33' }),
  biBia(CFG_BIIN, '30C ERP', 'Combi', '47-583-39', { ...BIA_COMBI, inCH: '25.0', inDHW: '30.0', inMin: '8.5', outMax: '24.4', outCond: '26.6', outDHW: '29.2', outMin: '8.3', flow35: '13.5', flow30: '16.2', gasCH: '2.65', gasDHW: '3.18', gasMin: '0.90', pw: '78', kg: '34.5' }),
  biBia(CFG_BIIN, '35C ERP', 'Combi', '47-583-40', { ...BIA_COMBI, inCH: '30.0', inDHW: '34.0', inMin: '8.5', outMax: '29.5', outCond: '32.1', outDHW: '33.4', outMin: '8.3', flow35: '15.6', flow30: '19.2', gasCH: '3.17', gasDHW: '3.60', gasMin: '0.90', pw: '85', kg: '34.5' }),
  biBia(CFG_BIAPO, '25C', 'Combi', '47-583-29', { ...BIA_COMBI_OLD, inCH: '20.0', inDHW: '25.0', inMin: '6.0', outMax: '19.5', outCond: '21.2', outDHW: '24.4', outMin: '5.9', flow35: '11.4', flow30: '13.3', gasCH: '2.15', gasDHW: '2.67', gasMin: '0.65', pw: '102', kg: '33' }),
  biBia(CFG_BIAPO, '30C', 'Combi', '47-583-30', { ...BIA_COMBI_OLD, inCH: '25.0', inDHW: '30.0', inMin: '8.5', outMax: '24.4', outCond: '26.6', outDHW: '29.2', outMin: '8.3', flow35: '13.5', flow30: '16.2', gasCH: '2.65', gasDHW: '3.18', gasMin: '0.90', pw: '130', kg: '34.5' }),
  biBia(CFG_BIAPO, '35C', 'Combi', '47-583-31', { ...BIA_COMBI_OLD, inCH: '30.0', inDHW: '34.0', inMin: '8.5', outMax: '29.5', outCond: '32.1', outDHW: '33.4', outMin: '8.3', flow35: '15.6', flow30: '19.2', gasCH: '3.17', gasDHW: '3.60', gasMin: '0.90', pw: '135', kg: '34.5' }),
  biBia(CFG_BIINO, '25C', 'Combi', '47-583-32', { ...BIA_COMBI_OLD, inCH: '20.0', inDHW: '25.0', inMin: '6.0', outMax: '19.5', outCond: '21.2', outDHW: '24.4', outMin: '5.9', flow35: '11.4', flow30: '13.3', gasCH: '2.15', gasDHW: '2.67', gasMin: '0.65', pw: '102', kg: '31.5' }),
  biBia(CFG_BIINO, '30C', 'Combi', '47-583-33', { ...BIA_COMBI_OLD, inCH: '25.0', inDHW: '30.0', inMin: '8.5', outMax: '24.4', outCond: '26.6', outDHW: '29.2', outMin: '8.3', flow35: '13.5', flow30: '16.2', gasCH: '2.65', gasDHW: '3.18', gasMin: '0.90', pw: '130', kg: '37' }),
  biBia(CFG_BIINO, '35C', 'Combi', '47-583-34', { ...BIA_COMBI_OLD, inCH: '30.0', inDHW: '34.0', inMin: '8.5', outMax: '29.5', outCond: '32.1', outDHW: '33.4', outMin: '8.3', flow35: '15.6', flow30: '19.2', gasCH: '3.17', gasDHW: '3.60', gasMin: '0.90', pw: '135', kg: '37' }),
  biBia(CFG_BIAPSE, '25S ERP', 'System', '41-583-28', { ...BIA_SYS, ...BIA_25, nox: '6', gasMin: '0.65', pw: '82', kg: '31' }),
  biBia(CFG_BIAPSE, '30S ERP', 'System', '41-583-29', { ...BIA_SYS, ...BIA_30, nox: '6', gasMin: '0.90', pw: '78', kg: '32.5' }),
  biBia(CFG_BIAPS16, '16S ERP', 'System', '41-583-27', { ...BIA_SYS, ...BIA_16, nox: '5', gasMin: '0.65', pw: '78', kg: '31' }),
  biBia(CFG_BIAPS, '16S', 'System', '41-583-22', { ...BIA_SYS, ...BIA_16, nox: '5', pw: '94', kg: '31' }),
  biBia(CFG_BIAPS, '25S', 'System', '41-583-23', { ...BIA_SYS, ...BIA_25, nox: '5', pw: '102', kg: '31' }),
  biBia(CFG_BIAPS, '30S', 'System', '41-583-24', { ...BIA_SYS, ...BIA_30, nox: '5', pw: '135', kg: '32.5' }),
  biBia(CFG_BIINS, '16S', 'System', '41-583-25', { ...BIA_SYS, ...BIA_16, nox: '5', pw: '94', kg: '30' }),
  biBia(CFG_BIINS, '25S', 'System', '41-583-26', { ...BIA_SYS, ...BIA_25, nox: '5', pw: '102', kg: '30' }),
  biBia(CFG_BIINSE, '25S ERP', 'System', '41-583-30', { ...BIA_SYS, ...BIA_25, nox: '5', gasMin: '0.64', pw: '95', kg: '31' }),
  biBia(CFG_BIRC, '24C ERP', 'Combi', '47-583-41', { ...BIA_RIVA, dhwT: '35 to 55', dhwMaxP: '10', dhwMinP: '0.3', inCH: '25.0', inDHW: '25.0', inMin: '7.5', outMax: '24.4', outCond: '26.3', outMin: '7.3', flow35: '10.0', flow30: '11.6', gasCH: '2.65', gasMin: '0.79', pw: '79', kg: '36.8' }),
  biBia(CFG_BIRC, '28C ERP', 'Combi', '47-583-42', { ...BIA_RIVA, dhwT: '35 to 55', dhwMaxP: '10', dhwMinP: '0.3', inCH: '29.0', inDHW: '29.0', inMin: '8.7', outMax: '28.3', outCond: '30.6', outMin: '8.4', flow35: '11.6', flow30: '13.6', gasCH: '3.07', gasMin: '0.92', pw: '90', kg: '37.7' }),
  biBia(CFG_BIRS, '24S ERP', 'System', '41-583-31', { ...BIA_RIVA, inCH: '25.0', inMin: '7.5', outMax: '24.4', outCond: '26.3', outMin: '7.3', gasCH: '2.65', gasMin: '0.79', pw: '79', kg: '35.5' }),
  biBia(CFG_BIRS, '28S ERP', 'System', '41-583-32', { ...BIA_RIVA, inCH: '29.0', inMin: '8.7', outMax: '28.3', outCond: '30.6', outMin: '8.4', gasCH: '3.07', gasMin: '0.92', pw: '90', kg: '36.7' }),
  biBia(CFG_BIM296, 'M296.24SM/C', 'Combi', '47-583-24', { ...BIA_M296, dhwT: '35 to 55', dhwMaxP: '10', dhwMinP: '0.3', inCH: '25.0', inDHW: '25.0', inMin: '7.5', outMax: '24.4', outCond: '26.3', outMin: '7.3', flow30: '11.6', gasCH: '2.65', gasMin: '0.79', pw: '140', kg: '42.5' }),
  biBia(CFG_BIM296, 'M296.28SM/C', 'Combi', '47-583-25', { ...BIA_M296, dhwT: '35 to 55', dhwMaxP: '10', dhwMinP: '0.3', inCH: '29.0', inDHW: '29.0', inMin: '8.7', outMax: '28.3', outCond: '30.6', outMin: '8.4', flow35: '11.6', flow30: '13.6', gasCH: '3.07', gasMin: '0.92', pw: '150', kg: '44' }),
  biBia(CFG_BIOV, '15OV', 'Regular (open vent)', '41-583-35', { ...BIA_OV, inCH: '17.0', inMin: '5.1', outMax: '16.5', outCond: '18.1', outMin: '4.8', gasCH: '1.80', gasMin: '0.54', pw: '24', kg: '30' }),
  biBia(CFG_BIOV, '18OV', 'Regular (open vent)', '41-583-36', { ...BIA_OV, inCH: '21.0', inMin: '5.1', outMax: '20.3', outCond: '22.4', outMin: '4.8', gasCH: '2.22', pw: '36', kg: '30' }),
  biBia(CFG_BIOV, '24OV', 'Regular (open vent)', '41-583-37', { ...BIA_OV, inCH: '25.0', inMin: '7.5', outMax: '24.4', outCond: '26.8', outMin: '7.0', gasCH: '2.65', pw: '40', kg: '33.5' }),
  biBia(CFG_BIM110, 'M110B.24SM/C', 'Combi', '47-583-11', { ...BIA_M110, inCH: '25.7', inDHW: '25.7', inMin: '6.0', outMax: '25.1', outCond: '27.3', outMin: '5.8', flow35: '10.7', flow30: '12.7', gasCH: '2.72', gasMin: '0.63', pw: '108', kg: '44.5' }),
  biBia(CFG_BIM110, 'M110B.32SM/C', 'Combi', '47-583-12', { ...BIA_M110, inCH: '34.0', inDHW: '34.0', inMin: '8.5', outMax: '33.1', outCond: '35.7', outMin: '8.2', flow35: '14.2', flow30: '16.7', gasCH: '3.60', gasMin: '0.90', pw: '125', kg: '45' }),
  biFer(CFG_FBT, 'RRT 24 C', 'Combi', '47-267-71', { ...CLR_FER, gasMax: '2.65', gasMin: '0.53', inCH: '20.4', inDHW: '25.0', inMin: '5.0', outCH: '20.0', outCHmin: '4.9', outCond: '21.7', outCondMin: '5.4', outDHW: '24.5', nox: '6', co2: '9 ± 0.8', flow30: '11.7', flow25: '14.0', dhwMaxP: '9', dhwMinP: '0.3', maxT: '95', maxP: '2.5', minP: '0.8', vessel: '8', charge: '0.8', water: '2.9', w: '420', h: '700', dp: '250', flue: FER_FLUE(28, 80), pw: '73', kg: '28' }),
  biFer(CFG_FBT, 'RRT 28 C', 'Combi', '47-267-72', { ...CLR_FER, gasMax: '3.02', gasMin: '0.53', inCH: '24.5', inDHW: '28.5', inMin: '5.0', outCH: '24.0', outCHmin: '4.9', outCond: '26.0', outCondMin: '5.4', outDHW: '28.0', nox: '6', co2: '9 ± 0.8', flow30: '13.4', flow25: '16.1', dhwMaxP: '9', dhwMinP: '0.3', maxT: '95', maxP: '3', minP: '0.8', vessel: '8', charge: '0.8', water: '2.9', w: '420', h: '700', dp: '250', flue: FER_FLUE(20, 70), pw: '82', kg: '28' }),
  biFer(CFG_FBT, 'RRT 34 C', 'Combi', '47-267-73', { ...CLR_FER, gasMax: '3.67', gasMin: '0.68', inCH: '30.6', inDHW: '34.7', inMin: '6.4', outCH: '30.0', outCHmin: '6.3', outCond: '32.5', outCondMin: '6.9', outDHW: '34.0', nox: '6', co2: '9 ± 0.8', flow30: '16.2', flow25: '19.5', dhwMaxP: '9', dhwMinP: '0.3', maxT: '95', maxP: '3', minP: '0.8', vessel: '10', charge: '0.8', water: '4.2', w: '420', h: '700', dp: '320', flue: FER_FLUE(20, 70), pw: '99', kg: '32' }),
  biFer(CFG_FBP, 'RRT 18 S', 'System', '41-267-49', { ...CLR_FER, gasMax: '1.95', gasMin: '0.53', inCH: '18.4', inMin: '5.0', outCH: '18.0', outCHmin: '4.9', outCond: '19.5', outCondMin: '5.4', nox: '6', co2: '9 ± 0.8', maxT: '95', maxP: '2.5', minP: '0.8', vessel: '8', charge: '0.8', water: '2.9', w: '420', h: '700', dp: '250', flue: FER_FLUE(28, 80), pw: '60', kg: '28' }),
  biFer(CFG_FBP, 'RRT 24 S', 'System', '41-267-50', { ...CLR_FER, gasMax: '2.59', gasMin: '0.53', inCH: '24.5', inMin: '5.0', outCH: '24.0', outCHmin: '4.9', outCond: '26.0', outCondMin: '5.4', nox: '6', co2: '9 ± 0.8', maxT: '95', maxP: '2.5', minP: '0.8', vessel: '8', charge: '0.8', water: '2.9', w: '420', h: '700', dp: '250', flue: FER_FLUE(20, 70), pw: '63', kg: '28' }),
  biFer(CFG_FBP, 'RRT 30 S', 'System', '41-267-51', { ...CLR_FER, gasMax: '3.24', gasMin: '0.68', inCH: '30.6', inMin: '6.4', outCH: '30.0', outCHmin: '6.3', outCond: '32.5', outCondMin: '6.9', nox: '6', co2: '9 ± 0.8', maxT: '95', maxP: '2.5', minP: '0.8', vessel: '10', charge: '0.8', water: '4.2', w: '420', h: '700', dp: '320', flue: FER_FLUE(20, 70), pw: '80', kg: '32' }),
  biFer(CFG_FTO, '25C HE', 'Combi', '47-267-59', { top: '300', sides: '25', bottom: '100', front: '300', gasMax: '2.86', gasMin: '0.61', inCH: '25.0', inDHW: '27.0', inMin: '5.8', outCH: '24.5', outCHmin: '5.7', outCond: '26.5', outCondMin: '6.2', outDHW: '27.0', nox: '5', co2: '9.2 at maximum, 8.7 at minimum', flow30: '12.9', flow25: '15.5', dhwMaxP: '9', dhwMinP: '0.3', maxT: '90', maxP: '3', minP: '0.8', vessel: '8', charge: '0.8', water: '1.7', w: '400', h: '600', dp: '320', flue: FER_FLUE2(7, 8, 28, 28, 80), pw: '100', kg: '29' }),
  biFer(CFG_FTO, '30C HE', 'Combi', '47-267-60', { top: '300', sides: '25', bottom: '100', front: '300', gasMax: '3.38', gasMin: '0.71', inCH: '29.5', inDHW: '32.0', inMin: '6.7', outCH: '28.9', outCHmin: '6.6', outCond: '31.3', outCondMin: '7.2', outDHW: '32.0', nox: '5', co2: '9.2 at maximum, 8.7 at minimum', flow30: '15.3', flow25: '18.3', dhwMaxP: '9', dhwMinP: '0.3', maxT: '90', maxP: '3', minP: '0.8', vessel: '10', charge: '0.8', water: '2.1', w: '400', h: '600', dp: '320', flue: FER_FLUE2(7, 8, 28, 28, 70), pw: '120', kg: '31.5' }),
  biFer(CFG_FOPC, '31 C', 'Combi', '47-267-44', { top: '300', sides: '25', bottom: '200', front: '600', gasMax: '3.33', gasMin: '0.56', inCH: '25.2', inDHW: '31.5', inMin: '5.3', outCH: '24.6', outCHmin: '5.2', outCond: '26.6', outCondMin: '5.7', outDHW: '30.8', nox: '5', co2: '9.0 at maximum, 8.7 at minimum', dhwT: '40 to 55', flow35: '12.6', flow30: '14.7', flow25: '17.6', dhwMaxP: '9', dhwMinP: '0.25', maxT: '95', maxP: '3', minP: '0.8', vessel: '8', charge: '1', water: '1.5', w: '400', h: '700', dp: '330', flue: FER_FLUE2(5, null, 15, null, 75), pw: '130', kg: '37' }),
  biFer(CFG_FOPC, '38 C', 'Combi', '47-267-45', { top: '300', sides: '25', bottom: '200', front: '600', gasMax: '4.07', gasMin: '0.69', inCH: '30.8', inDHW: '38.5', inMin: '6.5', outCH: '30.2', outCHmin: '6.3', outCond: '32.5', outCondMin: '6.9', outDHW: '37.7', nox: '5', co2: '9.0 at maximum, 8.7 at minimum', dhwT: '40 to 55', dhwMaxP: '9', dhwMinP: '0.25', maxT: '95', maxP: '3', minP: '0.8', vessel: '10', charge: '1', water: '2', w: '450', h: '700', dp: '330', flue: FER_FLUE2(5, null, 15, null, null), pw: '140', kg: '42' }),
  biFer(CFG_FOPS, '18 S', 'System', '41-267-27', { top: '300', sides: '25', bottom: '200', front: '350', gasMax: '1.90', gasMin: '0.32', inCH: '18.0', inMin: '3.0', outCH: '17.7', outCHmin: '2.9', outCond: '19.0', outCondMin: '3.2', nox: '5', co2: '9 at maximum, 8.5 at minimum', maxT: '85', maxP: '3', minP: '0.8', vessel: '7', charge: '1', water: '1', w: '320', h: '700', dp: '300', flue: FER_FLUE2(8, 9, 30, 30, 95), pw: '50', kg: '36' }),
  biFer(CFG_FOPS, '25 S', 'System', '41-267-32', { top: '300', sides: '25', bottom: '200', front: '350', gasMax: '2.67', gasMin: '0.56', inCH: '25.2', inMin: '5.3', outCH: '24.6', outCHmin: '5.2', outCond: '26.6', outCondMin: '5.7', nox: '5', co2: '9 at maximum, 8.5 at minimum', maxT: '95', maxP: '3', minP: '0.8', vessel: '8', charge: '1', water: '1.5', w: '400', h: '700', dp: '330', flue: FER_FLUE2(7, 8, 28, 28, 75), pw: '120', kg: '36' }),
  biFer(CFG_FOPS, '35 S', 'System', '41-267-33', { top: '300', sides: '25', bottom: '200', front: '350', gasMax: '3.68', gasMin: '0.69', inCH: '34.8', inMin: '6.5', outCH: '34.2', outCHmin: '6.3', outCond: '36.7', outCondMin: '6.9', nox: '5', co2: '9 at maximum, 8.5 at minimum', maxT: '95', maxP: '3', minP: '0.8', vessel: '10', charge: '1', water: '2', w: '450', h: '700', dp: '330', flue: FER_FLUE2(6, 7, 25, 25, 55), pw: '125', kg: '41' }),
  biFer(CFG_FMC, '27C HE', 'Combi', '47-267-57', { ...CLR_FMO, gasMax: '2.86', gasMin: '0.61', inCH: '25.0', inDHW: '27.0', inMin: '5.8', outCH: '24.5', outCHmin: '5.7', outCond: '26.5', outCondMin: '6.2', outDHW: '27.0', nox: '5', co2: '9.2 at maximum, 8.7 at minimum', flow30: '12.9', flow25: '15.5', dhwMaxP: '9', dhwMinP: '0.3', maxT: '90', maxP: '3', minP: '0.8', vessel: '8', charge: '0.8', water: '1.7', w: '400', h: '600', dp: '320', flue: FER_FLUE2(7, 8, 28, 28, 80), pw: '80', kg: '29' }),
  biFer(CFG_FMC, '32C HE', 'Combi', '47-267-55', { ...CLR_FMO, gasMax: '3.38', gasMin: '0.71', inCH: '29.5', inDHW: '32.0', inMin: '6.7', outCH: '28.9', outCHmin: '6.6', outCond: '31.3', outCondMin: '7.2', outDHW: '32.0', nox: '5', co2: '9.2 at maximum, 8.7 at minimum', flow30: '15.3', flow25: '18.3', dhwMaxP: '9', dhwMinP: '0.3', maxT: '90', maxP: '3', minP: '0.8', vessel: '10', charge: '0.8', water: '2.1', w: '400', h: '600', dp: '320', flue: FER_FLUE2(7, 8, 28, 28, 70), pw: '85', kg: '31.5' }),
  biFer(CFG_FMC38, '38C HE', 'Combi', '47-267-63', { ...CLR_FMO, gasMax: '4.13', gasMin: '0.74', inCH: '35.0', inDHW: '39.0', inMin: '7.0', outCH: '34.3', outCHmin: '6.9', outCond: '37.1', outCondMin: '7.5', outDHW: '39.0', nox: '5', co2: '9.3 at maximum, 8.3 at minimum', flow30: '18.6', flow25: '22.4', dhwMaxP: '9', dhwMinP: '0.3', maxT: '90', maxP: '3', minP: '0.8', vessel: '10', charge: '0.8', water: '2.4', w: '400', h: '600', dp: '350', flue: FER_FLUE2(6, 7, 25, 25, 60), pw: '90', kg: '33' }),
  biFer(CFG_FMS, '18S HE', 'System', '41-267-40', { ...CLR_FMO, gasMax: '1.84', gasMin: '0.42', inCH: '17.4', inMin: '4.0', outCH: '17.0', outCHmin: '3.9', outCond: '18.5', outCondMin: '4.3', nox: '5', co2: '9.2 at maximum, 8.7 at minimum', maxT: '90', maxP: '3', minP: '0.8', vessel: '8', charge: '0.8', water: '1.7', w: '400', h: '600', dp: '320', flue: FER_FLUE2(7, 8, 28, 28, 70), pw: '60', kg: '28' }),
  biFer(CFG_FMS, '25S HE', 'System', '41-267-41', { ...CLR_FMO, gasMax: '2.64', gasMin: '0.61', inCH: '25.0', inMin: '5.8', outCH: '24.5', outCHmin: '5.7', outCond: '26.5', outCondMin: '6.2', nox: '5', co2: '9.2 at maximum, 8.7 at minimum', maxT: '90', maxP: '3', minP: '0.8', vessel: '8', charge: '0.8', water: '1.7', w: '400', h: '600', dp: '320', flue: FER_FLUE2(7, 8, 28, 28, 70), pw: '80', kg: '28' }),
  biFer(CFG_FMS, '32S HE', 'System', '41-267-42', { ...CLR_FMO, gasMax: '3.38', gasMin: '0.71', inCH: '32.0', inMin: '6.7', outCH: '31.4', outCHmin: '6.6', outCond: '34.0', outCondMin: '7.2', nox: '5', co2: '9.2 at maximum, 8.7 at minimum', maxT: '90', maxP: '3', minP: '0.8', vessel: '10', charge: '0.8', water: '1.7', w: '400', h: '600', dp: '320', flue: FER_FLUE2(7, 8, 28, 28, 70), pw: '100', kg: '30' }),
  biVie(CFG_VIB, '050-W 29 kW combi', 'Combi', '47-819-31', { gasCH: '2.37', inRange: '6.1 to 22.4', out5030: '6.5 to 24', out8060: '5.9 to 22.1', outDHW: '5.9 to 29', flow30: '13.8', setFlow: '10', minFlow: '2.1', dhwMaxP: '10', dhwMinP: '1', w: '400', h: '707', dp: '350', top: '250', sides: '5', bottom: '150', front: '700', flue: VIE_NOFLUE, pw: '72' }),
  biVie(CFG_VIB, '050-W 35 kW combi', 'Combi', '47-819-32', { gasCH: '3.28', inRange: '8.2 to 30.9', out5030: '8.8 to 33', out8060: '8.0 to 30.3', outDHW: '8.0 to 35', flow30: '16.7', setFlow: '14', minFlow: '2.1', dhwMaxP: '10', dhwMinP: '1', w: '400', h: '707', dp: '350', top: '250', sides: '5', bottom: '150', front: '700', flue: VIE_NOFLUE, pw: '110' }),
  biVie(CFG_VIB2, '050-W 29 kW combi', 'Combi', '47-819-38', { gasCH: '2.37', inRange: '6.1 to 22.4', out5030: '6.5 to 24', out8060: '5.9 to 22.1', outDHW: '5.9 to 29', flow30: '13.8', setFlow: '10', minFlow: '2.1', dhwMaxP: '10', dhwMinP: '1', w: '400', h: '707', dp: '350', top: '250', sides: '5', bottom: '150', front: '700', flue: VIE_NOFLUE, pw: '72' }),
  biVie(CFG_VIB2, '050-W 35 kW combi', 'Combi', '47-819-39', { gasCH: '3.28', inRange: '8.2 to 30.9', out5030: '8.8 to 33', out8060: '8.0 to 30.3', outDHW: '8.0 to 35', flow30: '16.7', setFlow: '14', minFlow: '2.1', dhwMaxP: '10', dhwMinP: '1', w: '400', h: '707', dp: '350', top: '250', sides: '5', bottom: '150', front: '700', flue: VIE_NOFLUE, pw: '110' }),
  biVie(CFG_VI2, 'WB2B combi 26 kW', 'Combi', '47-819-09', { gasCH: '2.61', gasDHW: '2.87', inRange: '6.2 to 24.7', out5030: '6.5 to 26.0', out8060: '5.9 to 24.1', outDHW: '5.9 to 26.0', inDHW: '6.1 to 27.1', nox: '5', dhwT: '10 to 57', flow35: '10.7', minFlow: '3', dhwMaxP: '10', dhwMinP: '0.5', chT: '30 to 80', maxP: '2.5', minP: '1', vessel: '10', charge: '0.75', sysVol: '125', water: '7.8', top: '300', sides: '5', bottom: '100', front: '700', w: '450', h: '850', dp: '360', flue: VIE_FLUE_WB, pw: '95', kg: '46' }),
  biVie(CFG_VI2, 'WB2B combi 30 kW', 'Combi', '47-819-10', { gasCH: '3.01', gasDHW: '3.31', inRange: '8.3 to 28.5', out5030: '8.8 to 30.0', out8060: '7.9 to 27.8', outDHW: '7.9 to 30.0', inDHW: '8.2 to 31.3', nox: '5', dhwT: '10 to 57', flow35: '12.3', minFlow: '3', dhwMaxP: '10', dhwMinP: '0.5', chT: '30 to 80', maxP: '2.5', minP: '1', vessel: '10', charge: '0.75', sysVol: '125', water: '8.2', top: '300', sides: '5', bottom: '100', front: '700', w: '450', h: '850', dp: '360', flue: VIE_FLUE_WB, pw: '115', kg: '48' }),
  biVie(CFG_VI2, 'WB2B system 19 kW', 'System', '41-819-14', { gasCH: '1.89', inRange: '4.5 to 17.9', out5030: '4.8 to 19.0', out8060: '4.3 to 17.5', nox: '5', chT: '30 to 80', maxP: '2.5', minP: '1', vessel: '10', charge: '0.75', sysVol: '125', water: '7.2', top: '300', sides: '5', bottom: '100', front: '700', w: '450', h: '850', dp: '360', flue: VIE_FLUE_WB, pw: '85', kg: '43' }),
  biVie(CFG_VI1A, 'WB1A 13 kW heat only', 'Regular', '41-819-13', { gasCH: '1.28', inRange: '7.4 to 12.1', out5030: '8 to 13', out8060: '7.3 to 11.8', chT: '80 (maximum)', top: '300', sides: '5', bottom: '140', front: '700', w: '350', h: '530', dp: '340', flue: VIE_FLUE_WB1A, pw: '55', kg: '37' }),
  biVie(CFG_VI1A, 'WB1A 18 kW heat only', 'Regular', '41-819-12', { gasCH: '1.77', inRange: '7.4 to 16.7', out5030: '8 to 18', out8060: '7.3 to 16.4', chT: '80 (maximum)', top: '300', sides: '5', bottom: '140', front: '700', w: '350', h: '530', dp: '340', flue: VIE_FLUE_WB1A, pw: '55', kg: '37' }),
  biVie(CFG_VI1A, 'WB1A 24 kW heat only', 'Regular', '41-819-10', { gasCH: '2.36', inRange: '7.4 to 22.3', out5030: '8 to 24', out8060: '7.3 to 21.8', chT: '80 (maximum)', top: '300', sides: '5', bottom: '140', front: '700', w: '350', h: '530', dp: '340', flue: VIE_FLUE_WB1A, pw: '55', kg: '37' }),
  biBaxiC(CFG_BX800S, '25', '47-077-38', { model: '825 Combi', ng: '2.71', ngMin: '0.67', chIn: '20.6', minIn: '6.2', chOut: '20', chOut2: '21.2', minOut: '6.1', dhwIn: '25.8', d25: '12', d35: '10.2', spec: '10.2', w: '68', kg: '29.2 / 30.2' }),
  biBaxiC(CFG_BX800S, '30', '47-077-39', { model: '830 Combi', ng: '3.26', ngMin: '0.67', chIn: '20.6', minIn: '6.2', chOut: '20', chOut2: '21.2', minOut: '6.1', dhwIn: '30.9', d25: '14.3', d35: '12.2', spec: '12.2', w: '80', kg: '29.2 / 30.2' }),
  biBaxiC(CFG_BX800S, '36', '47-077-40', { model: '836 Combi', ng: '3.81', ngMin: '0.71', chIn: '25.8', minIn: '6.7', chOut: '25', chOut2: '26.4', minOut: '6.7', dhwIn: '36.8', d25: '16.5', d35: '15.0', spec: '15.0', w: '110', kg: '30.5 / 31.5' })
];
function biState() { return ui.bi || (ui.bi = { q: '', id: '', m: '' }); }
function biListHtml() {
  const q = biState().q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const mk = biState().m;
  if (!mk && !q.length) return '<p class="small muted">Tap a make above, or type in the search box, to see boilers.</p>';
  const hits = BI_LIST.filter(b => (!mk || b.make === mk) && q.every(w => (b.make + ' ' + b.range + ' ' + b.model + ' ' + b.gc + ' ' + b.type).toLowerCase().includes(w)));
  return hits.length ? hits.map(b => `<button type="button" class="item cpick" style="width:100%;text-align:left" data-bi="open" data-v="${esc(b.id)}"><div class="t">${esc(b.make)} ${esc(b.range)} ${esc(b.model)}</div><div class="s">${esc(b.type)} · GC ${esc(b.gc)}</div></button>`).join('') : '<p class="muted small">No boiler matches that yet. More are being added.</p>';
}
function biChipsHtml() {
  const m = biState().m, makes = [...new Set(BI_LIST.map(b => b.make))].sort();
  return makes.map(k => `<button type="button" class="chip${k === m ? ' on' : ''}" style="padding:10px 14px${k === m ? ';color:var(--txt);font-weight:700' : ''}" data-bi-make="${esc(k)}">${esc(k)}</button>`).join('');
}
function biView() {
  const s = biState(), b = BI_LIST.find(x => x.id === s.id);
  if (b) return `<h1>${esc(b.model)}</h1><p class="small muted" style="margin-top:0">${esc(b.make)} ${esc(b.range)} · ${esc(b.type)} · GC ${esc(b.gc)}</p>
    ${b.sections.map(([h, rows]) => `<h2>${esc(h)}</h2><div class="card">${rows.map(([k, v]) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--line,#ddd5c0)"><span class="small muted" style="flex:1">${esc(k)}</span><b style="flex:1;text-align:right">${esc(v)}</b></div>`).join('')}</div>`).join('')}
    <p class="small muted">From: ${esc(b.src)}. Check the manual for your exact boiler before you rely on a figure.</p>
    <button class="btn ghost block" data-bi="list">Back to boiler list</button>`;
  return `<h1>Boiler information</h1><p class="small muted" style="margin-top:0">Key figures from the manufacturer's manual. Search by model or GC number.</p>
    <div class="f"><input class="search" type="search" data-bi-q value="${esc(s.q)}" placeholder="e.g. 8000 40 or 47-800-46" autocomplete="off"></div><div class="chips" id="biChips" style="margin-top:0">${biChipsHtml()}</div><div id="biList">${biListHtml()}</div>`;
}
document.addEventListener('input', e => { const t = e.target; if (!t.hasAttribute || !t.hasAttribute('data-bi-q') || ui.view !== 'tools') return; biState().q = t.value; const el = document.getElementById('biList'); if (el) el.innerHTML = biListHtml(); });
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-bi]'); if (!b || ui.view !== 'tools') return; const s = biState(); s.id = b.dataset.bi === 'open' ? b.dataset.v : ''; render(); window.scrollTo(0, 0); });

document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-bi-make]'); if (!b || ui.view !== 'tools') return; const s = biState(); s.m = s.m === b.dataset.biMake ? '' : b.dataset.biMake; const c = document.getElementById('biChips'), l = document.getElementById('biList'); if (c) c.innerHTML = biChipsHtml(); if (l) l.innerHTML = biListHtml(); });
