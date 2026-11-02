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
function biIdealCombi(kw, gc, o) {
  return {
    id: 'ideal-lmc2-' + kw, make: 'Ideal', range: 'Logic Max Combi2', model: 'C' + kw, type: 'Combi', gc, src: BI_SRC_LMC2,
    sections: [
      ['Gas', [['Gas rate, natural gas (at maximum)', o.rate + ' m³/h'], ['Gas supply', 'Natural gas only, 20 mbar'], ['Gas pressure at the boiler inlet', 'Above 18 mbar (fault finding)'], ['Injector size', o.inj + ' mm'], ['Gas connection', '15 mm copper compression']]],
      ['Heat', [['Heat input (net), maximum', o.max + ' kW'], ['Heat input (net), minimum', o.min + ' kW'], ['Hot water output, maximum', o.dhwOut + ' kW'], ['Heating output at minimum (70 °C mean)', o.minOut + ' kW']]],
      ['Combustion', [['CO₂ at maximum (hot water), ±0.7', o.co2max + ' %'], ['CO₂ at minimum (heating), ±0.7', o.co2min + ' %'], ['Combustion check', 'CO under 350 ppm and CO/CO₂ ratio under 0.004'], ['NOx class', '6']]],
      ['Hot water', [['Flow at 35 °C rise', o.flow + ' l/min'], ['Specific rate', o.spec + ' l/min'], ['Mains pressure for full flow', o.mp + ' bar'], ['Maximum mains pressure', '10 bar'], ['Runs down to', '2 l/min']]],
      ['Heating circuit', [['Maximum working pressure', '2.5 bar'], ['PRV setting', '3.0 bar'], ['Expansion vessel charge', '0.5 to 0.75 bar'], ['Heating water content', '1.2 litres'], ['Flow and return', '22 mm copper compression']]],
      ['Flue (100 mm concentric)', [['Horizontal, maximum effective length', o.hf + ' m'], ['Vertical, maximum effective length', '7.5 m'], ['Each 45° elbow counts as', '0.6 m'], ['Each 90° elbow counts as', '1.0 m']]],
      ['Clearances', [['Case size (W x H x D)', '395 x 700 x 278 mm'], ['Either side', '2.5 mm from the case'], ['Below, for servicing', '100 mm (15 mm after installation, with an easily removable panel)'], ['In front, in a cupboard', '5 mm from the door, but 450 mm overall with the door open'], ['Above', 'See the clearance diagram, page 11']]],
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
  biIdealRS('H', '30', '41-860-29', { rate: '3.136', max: '30.4', out: '30.3', co2a: '9.7', co2b: '8.8', w: '52' })
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
