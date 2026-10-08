/* Boiler quotation – form definition, totals and validation. Shared by app.js and pdf-quote.js.
   Kept simple on purpose: the boiler, the flue, any extras picked from the saved price list, labour, VAT. */
'use strict';
const QUO = (() => {
  const STEPS = ['Customer', 'Boiler & flue', 'Extras & labour', 'Acceptance', 'Review'];
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
      boilerPrice: '', flueDesc: '', fluePrice: '', labourDesc: 'Installation labour', labourPrice: '',
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
  return { STEPS, KIND, WARRANTY, DEFAULT_INCLUDED, DEFAULT_TERMS, num, blank, makeText, rows, totals, money, parseItems, validate, warnings };
})();
