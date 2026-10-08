/* Boiler quotation – form definition, totals and validation. Shared by app.js and pdf-quote.js.
   Kept simple on purpose: the boiler, the flue, any extras picked from the saved price list, labour, VAT. */
'use strict';
const QUO = (() => {
  const STEPS = ['Customer', 'Boiler & flue', 'Extras & labour', 'Review'];
  const KIND = ['Combination', 'System', 'Heat only'];
  const WARRANTY = ['5 years', '7 years', '10 years', '12 years'];
  const DEFAULT_INCLUDED = [
    'Removal of your old boiler: we isolate and drain down the system, remove the old boiler and dispose of it responsibly.',
    'Your new boiler: fitted to the manufacturer\'s instructions.',
    'New flue: fitted and sealed to current regulations.',
    'Pipework: gas, water and heating pipework connected, with the condensate run to a suitable drain.',
    'Gas safety checks: a full gas tightness test and safety checks on the supply and the new boiler.',
    'System protection: the system cleaned and protected with inhibitor.',
    'Commissioning: the boiler set up, tested and checked, and the commissioning checklist completed.',
    'Paperwork: Building Regulations notification through Gas Safe, and your warranty registered with the manufacturer.',
    'Handover: we show you how to use the boiler and controls and leave you with the documents.',
    'Clean and tidy: floors and furniture protected, and all old parts and packaging removed.'
  ].join('\n');
  const DEFAULT_TERMS = [
    'This quotation is valid for 30 days and is based on the survey carried out at your property.',
    'If we find anything during the installation that could not reasonably be seen at the survey, we will talk to you and agree any extra cost before doing the work.',
    'Payment: the balance is due within 14 days of completing the work.',
    'Your boiler warranty is subject to the manufacturer\'s terms, which include an annual service by a Gas Safe registered engineer.'
  ].join('\n');

  const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const num = v => { const n = parseFloat(String(v ?? '').replace(/[£,\s]/g, '')); return Number.isFinite(n) ? n : null; };
  const n0 = v => num(v) || 0;

  function blank() {
    return {
      kind: '', make: '', makeOther: '', model: '', kw: '', warranty: '',
      boilerPrice: '', boilerCost: '', flueDesc: '', fluePrice: '', flueCost: '', labourDesc: 'Installation labour', labourPrice: '', labourCost: '',
      lines: [], homeNotes: '', accepted: ''
    };
  }
  const makeText = r => (r.make === 'Other' ? r.makeOther : r.make);

  /* every priced row on the quote, in the order they are shown */
  function rows(rec) {
    const out = [];
    const boiler = [makeText(rec), rec.model, rec.kw ? rec.kw + ' kW' : '', rec.kind ? rec.kind.toLowerCase() + ' boiler' : ''].filter(Boolean).join(' ');
    if (num(rec.boilerPrice) !== null) out.push({ d: boiler || 'New boiler', q: 1, p: n0(rec.boilerPrice) });
    if (num(rec.fluePrice) !== null) out.push({ d: rec.flueDesc || 'Flue kit', q: 1, p: n0(rec.fluePrice) });
    (rec.lines || []).forEach(l => { if (String(l.name || '').trim() || num(l.price) !== null) out.push({ d: l.name || 'Extra', q: n0(l.qty) || 1, p: n0(l.price) }); });
    if (num(rec.labourPrice) !== null) out.push({ d: rec.labourDesc || 'Installation labour', q: 1, p: n0(rec.labourPrice) });
    return out;
  }
  function totals(rec, s) {
    const sub = rows(rec).reduce((a, r) => a + r.q * r.p, 0);
    const rate = s && s.vatReg === 'Yes' ? n0(s.vatRate) : 0;
    const vat = Math.round(sub * rate) / 100;
    return { sub, rate, vat, total: sub + vat };
  }
  const money = v => '£' + (Math.round(v * 100) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* the saved price list: one "item | price" per line in Settings */
  const parseItems = text => String(text || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [n, p] = l.split('|'); return { name: (n || '').trim(), price: (p || '').trim() }; }).filter(x => x.name);


  /* ---------- the price list (downloaded to Excel, edited, imported back) ---------- */
  const SHEET_HEAD = ['Category', 'Make', 'Item', 'Boiler type', 'kW', 'Warranty', 'Unit', 'My cost (£)', 'Mark-up %', 'Sale price (£)'];
  /* starter list: boiler ranges, flue kits, labour and extras. Prices are left blank for the engineer to fill in. */
  const BOILERS = [
    ['Worcester Bosch', 'Greenstar 4000', 'Combination', [25, 30]], ['Worcester Bosch', 'Greenstar 8000 Life', 'Combination', [35]], ['Worcester Bosch', 'Greenstar 4000 System', 'System', [18, 25]], ['Worcester Bosch', 'Greenstar 4000 Regular', 'Heat only', [15, 18]],
    ['Ideal', 'I-Mini', 'Combination', [24, 30, 35]], ['Ideal', 'Logic Max Combi', 'Combination', [24, 30, 35]], ['Ideal', 'Logic+', 'Combination', [24]], ['Ideal', 'Vogue Max', 'Combination', [26, 32, 40]], ['Ideal', 'Logic Max System', 'System', [15, 18, 24]], ['Ideal', 'Logic Max Heat', 'Heat only', [15, 18, 24]],
    ['Vaillant', 'ecoTEC plus', 'Combination', [25, 32, 35]], ['Vaillant', 'ecoTEC plus System', 'System', [18, 24]], ['Vaillant', 'ecoTEC plus Regular', 'Heat only', [15, 18]],
    ['Baxi', '600 Combi', 'Combination', [24, 30, 36]], ['Baxi', '800 Combi', 'Combination', [25, 30, 36]], ['Baxi', '600 System', 'System', [18, 24]], ['Baxi', '800 System', 'System', [24]], ['Baxi', '600 Heat', 'Heat only', [15, 18, 24]],
    ['Viessmann', 'Vitodens 100-W', 'Combination', [26, 30, 35]], ['Viessmann', 'Vitodens 100-W System', 'System', [19, 25]], ['Viessmann', 'Vitodens 100-W Open Vent', 'Heat only', [13, 19]],
    ['Glow Worm', 'Energy c', 'Combination', [25, 30, 35]], ['Glow Worm', 'Energy s', 'System', [18, 25]], ['Glow Worm', 'Energy r', 'Heat only', [15, 18]]
  ];
  const STARTER = [];
  BOILERS.forEach(b => b[3].forEach(kw => STARTER.push(['Boiler', b[0], b[1] + ' ' + kw + 'kW', b[2], String(kw), ''])));
  ['Horizontal flue kit', 'Telescopic horizontal flue kit', 'Rear flue kit', 'Vertical flue kit', 'Vertical flue terminal only', 'Plume displacement kit', '90 degree flue elbow', '45 degree flue elbows (pair)', 'Flue extension 1 metre', 'Flue extension 2 metre', 'Flue extension 3 metre'].forEach(n => STARTER.push(['Flue', '', n, '', '', '']));
  ['Combi swap, same location', 'Combi, new location up to 3 metres', 'Combi, new location up to 6 metres', 'Combi, new location up to 9 metres', 'Combi, new location up to 12 metres', 'System boiler, same location', 'System boiler, new location up to 6 metres', 'Heat only boiler, same location', 'Heat only boiler, new location up to 6 metres', 'Extra labour day'].forEach(n => STARTER.push(['Labour', '', 'Installation labour: ' + n, '', '', '']));
  const EXTRA_CATS = {"Controls & thermostats": ["Smart thermostat (Hive)", "Smart thermostat (Nest)", "Wireless programmable thermostat"], "Water treatment": ["Magnetic filter 22mm", "Magnetic filter 28mm", "MagnaCleanse up to 8 radiators", "MagnaCleanse up to 15 radiators", "Chemical flush", "Inhibitor (Sentinel X100)", "Scale reducer"], "Fittings": ["Condensate pipework internal 3m", "Condensate pipework external 3m", "Condensate pump", "Condensate soakaway", "External filling loop", "Shock arrestor", "Pipe lagging per metre"], "Copper & pipe": ["Gas pipework run (per 5m)", "Copper pipe 15mm (3m)", "Copper pipe 22mm (3m)", "Copper pipe 28mm (3m)", "15mm fittings pack", "22mm fittings pack", "28mm fittings pack"], "Radiators & valves": ["Thermostatic radiator valve", "Radiator valve pair 15mm", "Radiator 600 x 1000 Type 22"], "Electrical": ["New fused spur", "Carbon monoxide alarm"], "System components": ["8 litre expansion vessel", "12 litre expansion vessel", "Circulating pump", "2 port zone valve", "3 port mid-position valve", "Cylinder replacement"], "Other": ["Waste removal (small)", "Waste removal (medium)", "Waste removal (large)"]};
  Object.keys(EXTRA_CATS).forEach(c => EXTRA_CATS[c].forEach(n => STARTER.push([c, '', n, '', '', ''])));
  const TYPES = ['Boiler', 'Flue', 'Labour', 'Copper & pipe', 'Fittings', 'Controls & thermostats', 'Radiators & valves', 'Water treatment', 'System components', 'Electrical', 'Other'];
  const MAIN = ['Boiler', 'Flue', 'Labour'];
  const norm = h => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const asKind = v => { const t = String(v || '').toLowerCase(); return /comb/.test(t) ? 'Combination' : /system/.test(t) ? 'System' : /heat|regular|conv/.test(t) ? 'Heat only' : ''; };
  const asType = v => { const t = String(v || '').trim(), l = t.toLowerCase(); return TYPES.find(x => x.toLowerCase() === l) || (/boil/.test(l) ? 'Boiler' : /flue/.test(l) ? 'Flue' : /lab/.test(l) ? 'Labour' : /copper|pipe/.test(l) ? 'Copper & pipe' : /fitting/.test(l) ? 'Fittings' : /thermo|control/.test(l) ? 'Controls & thermostats' : /rad|valve/.test(l) ? 'Radiators & valves' : /water|filter|flush|inhib/.test(l) ? 'Water treatment' : /component|pump/.test(l) ? 'System components' : /elec/.test(l) ? 'Electrical' : t && !/^(extra|part|item|material)$/.test(l) ? t : 'Other'); };
  const clean = v => (v == null ? '' : String(v).replace(/[£,\s]/g, '').trim());
  /* the rows of the sheet (an array of arrays, first row = headings) -> price list items */
  let _id = 0;
  const newId = () => 'p' + Date.now().toString(36) + (++_id).toString(36) + Math.random().toString(36).slice(2, 5);
  function itemsFromRows(rows) {
    if (!rows || rows.length < 2) return [];
    const hdr = rows[0].map(norm), col = (...names) => hdr.findIndex(h => names.includes(h));
    const c = { type: col('category', 'type'), make: col('make', 'manufacturer', 'brand'), item: col('item', 'model', 'name', 'description'), kind: col('boilertype', 'kind'), kw: col('kw', 'output'), warr: col('warranty'), unit: col('unit'), cost: col('mycost', 'cost', 'costprice'), mk: col('markup', 'markup', 'margin'), price: col('saleprice', 'sale', 'price', 'sellprice') };
    if (c.item < 0) return [];
    return rows.slice(1).map(r => {
      const g = i => (i >= 0 && r[i] != null ? String(r[i]).trim() : '');
      return { id: newId(), type: asType(g(c.type)), make: g(c.make), name: g(c.item), kind: asKind(g(c.kind)), kw: g(c.kw), warranty: g(c.warr), unit: g(c.unit), cost: clean(r[c.cost]), markup: clean(r[c.mk]), price: clean(r[c.price]) };
    }).filter(x => x.name);
  }
  const blankNum = v => (v === '' || v == null ? '' : num(v));
  const rowsFromItems = items => [SHEET_HEAD].concat(items.map(x => [x.type, x.make || '', x.name, x.kind || '', x.kw || '', x.warranty || '', x.unit || '', blankNum(x.cost), blankNum(x.markup), blankNum(x.price)]));
  const itemsOf = (s, type) => (s.qList || []).filter(x => x.type === type);
  const label = x => [x.make, x.name].filter(Boolean).join(' ') + (x.kw && x.type === 'Boiler' ? ' · ' + x.kw + ' kW' : '');
  /* sale price of an item: a fixed price if one is typed, otherwise cost + mark-up % (the item's own, else its category's, else the default) */
  const markupOf = (x, s) => { const m = num(x.markup); if (m !== null) return m; const c = num(((s && s.qMarkup) || {})[x.type]); if (c !== null) return c; const d = num(s && s.qMarkupDef); return d === null ? 0 : d; };
  const saleOf = (x, s) => { const p = num(x.price); if (p !== null) return p; const c = num(x.cost); return c === null ? null : Math.round(c * (1 + markupOf(x, s) / 100) * 100) / 100; };
  const saleText = (x, s) => { const v = saleOf(x, s); return v === null ? '' : String(v); };
  /* the total cost price of a quote, when the cost prices are known */
  function costOf(rec) {
    let c = 0, any = false;
    [[rec.boilerCost, 1], [rec.flueCost, 1], [rec.labourCost, 1]].forEach(([v, q]) => { if (num(v) !== null) { c += q * num(v); any = true; } });
    (rec.lines || []).forEach(l => { if (num(l.cost) !== null) { c += (n0(l.qty) || 1) * num(l.cost); any = true; } });
    return any ? c : null;
  }

  function validate(rec) {
    const out = [];
    const need = (step, path, label) => { if (!String(getP(rec, path) ?? '').trim()) out.push({ step, path, label }); };
    need(0, 'customer.name', 'Customer name'); need(0, 'jobAddress', 'Job address');
    need(1, 'kind', 'Boiler type'); need(1, 'make', 'Boiler make'); if (rec.make === 'Other') need(1, 'makeOther', 'Boiler make (other)');
    need(1, 'model', 'Boiler model');
    if (num(rec.boilerPrice) === null) out.push({ step: 1, path: 'boilerPrice', label: 'Boiler price' });
    if (num(rec.labourPrice) === null) out.push({ step: 2, path: 'labourPrice', label: 'Labour price' });
    return out;
  }
  function warnings(rec, s) {
    const w = [];
    if (!s.address || !s.phone || !s.engineerName) w.push('Business and engineer details are missing in Settings – they will be blank on the PDF.');
    if (!rec.customer.email) w.push('No customer email – you can still share the PDF from your phone.');
    if (s.vatReg === 'Yes' && !n0(s.vatRate)) w.push('VAT registered is on but no VAT rate is set in Settings.');
    return w;
  }
  return { SHEET_HEAD, STARTER, TYPES, MAIN, newId, markupOf, saleOf, saleText, itemsFromRows, rowsFromItems, itemsOf, label, costOf, STEPS, KIND, WARRANTY, DEFAULT_INCLUDED, DEFAULT_TERMS, num, blank, makeText, rows, totals, money, parseItems, validate, warnings };
})();
