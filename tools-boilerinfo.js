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
      ['Gas', [['Gas rate, natural gas, maximum', o.ng + ' m³/h'], ['Gas rate, natural gas, minimum', o.ngMin + ' m³/h'], o.lpg ? ['Gas rate, LPG, maximum', o.lpg + ' kg/h'] : null, o.lpgMin ? ['Gas rate, LPG, minimum', o.lpgMin + ' kg/h'] : null, ['Gas supply', '20 mbar natural gas, 37 mbar LPG'], ['Gas category', c.cat || 'I2H / I3P']].filter(Boolean)],
      ['Heat', [['Heating input, maximum', o.chIn + ' kW'], ['Heating input, minimum (80/60 °C)', o.minIn + ' kW'], ['Heating output, maximum (80/60 °C)', o.chOut + ' kW'], ['Heating output, maximum (50/30 °C)', o.chOut2 + ' kW'], ['Heating output, minimum (80/60 °C)', o.minOut + ' kW'], ['Hot water input', o.dhwIn + ' kW'], ['Hot water output', (o.dhwOut || kw) + ' kW']]],
      ['Combustion', [['NOx class', '6']]],
      ['Hot water', [['Flow at 25 °C rise', o.d25 + ' l/min'], ['Flow at 35 °C rise', o.d35 + ' l/min'], o.spec ? ['Specific flow (D)', o.spec + ' l/min'] : null, ['Minimum mains pressure', '0.8 bar'], ['Maximum mains pressure', '8 bar'], ['Minimum dynamic pressure', '0.15 bar'], ['Minimum flow', '2 l/min']].filter(Boolean)],
      ['Heating circuit', [['Maximum pressure', '2.5 bar'], ['Minimum pressure', '0.5 bar'], ['Expansion vessel', '7 litres']]],
      ['Flue', c.flue || [['Horizontal concentric 60/100, maximum', '10 m'], ['Horizontal concentric 80/125, maximum', '20 m'], ['Each 135° bend counts as', '0.5 m'], ['Each 93° bend counts as', '1.0 m'], ['Elbow supplied with the flue kit', 'Not counted'], ['Vertical flues', 'See the Flue Installation Guide supplied with the boiler']]],
      ['Clearances', [['Case size (W x H x D)', '395 x 700 x 285 mm']].concat(c.clear || [['In front', '450 mm for servicing, 5 mm in operation'], ['Either side', '2.5 mm'], ['Below', '150 mm']])],
      ['Electrics', [['Supply', '230 V a.c., 50 Hz'], ['Power', o.w + ' W'], ['Protection rating', 'IPX5D']]],
      ['Weight', [['Empty / filled with water', o.kg + ' kg']]]
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

const CFG_BX21 = { key: 'baxi-400c21-', range: '400 Combi 2.1', src: 'Baxi 400 Combi 2.1 installation and service manual (7875578-02): technical data pages 8 to 10, clearances page 18. Listed in the manual as 424-2.1, 430-2.1 and 436-2.1',
  flue: [['Flue lengths', 'Not given in this manual. See the Flue Installation Guide supplied with the boiler']] };
/* Vaillant combis (natural gas figures; page numbers are PDF pages). */
function biVai(c, model, gc, o) {
  return {
    id: c.key + model.replace(/\W+/g, '').toLowerCase(), make: 'Vaillant', range: c.range, model, type: 'Combi', gc, src: c.src,
    sections: [
      ['Gas', [['Gas rate, natural gas, hot water maximum', o.ng + ' m³/h'], ['Gas supply', c.gasSup], ['Gas category', c.cat]].concat(o.ngMin ? [['Gas rate, natural gas, minimum', o.ngMin + ' m³/h']] : [])],
      ['Heat', [['Heating input, maximum', o.chIn + ' kW'], ['Heating input, minimum', o.min + ' kW'], ['Heating output (80/60 °C)', o.out + ' kW'], ['Heating output (50/30 °C)', o.out2 + ' kW'], ['Hot water input, maximum', o.dhwIn + ' kW'], ['Hot water output', o.dhwOut + ' kW']]],
      ['Combustion', [['NOx class', '6']]],
      ['Hot water', [['Specific flow (D, 30 K rise)', o.d30 + ' l/min'], ['Flow at 35 K rise', o.d35 + ' l/min']].concat(c.dhwRows).concat([[c.limLabel || 'Cold water flow limiter', o.lim + ' l/min']])],
      ['Heating circuit', c.chRows],
      ['Clearances', [['Case size (W x H x D)', c.dims]].concat(c.clear)],
      ['Flue', [['Maximum flue lengths', 'Not given in this manual. See the separate flue guide supplied with the boiler']]],
      ['Condensate and electrics', [['Condensate, at 50/30 °C', c.cond], ['Supply', '230 V a.c., 50 Hz'], ['Power', o.w + ' W'], ['Built-in fuse', 'T2/2A 250 V'], ['Protection rating', 'IPX4D']]],
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
