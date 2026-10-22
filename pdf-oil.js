/* Oil boiler service record and oil tank check – portrait A4, same black & gold look as the other records.
   Layout: contractor / installation / client details, appliance (or tank) details, checks, readings, result, notes and sign-off. */
'use strict';

async function buildOilPdf(rec, s) { return buildOilKindPdf(rec, s, 'oil'); }
async function buildTankPdf(rec, s) { return buildOilKindPdf(rec, s, 'tank'); }
async function buildOFormPdf(rec, s) { return buildOilKindPdf(rec, s, 'form'); }

async function buildOilKindPdf(rec, s, kind) {
  const levels = [{ f: 1, p: 1 }, { f: 0.95, p: 0.85 }, { f: 0.9, p: 0.7 }, { f: 0.86, p: 0.55 }, { f: 0.82, p: 0.42 }, { f: 0.78, p: 0.3 }];
  let doc;
  for (const lv of levels) { doc = await drawOilPdf(rec, s, lv, kind); if (doc.getNumberOfPages() === 1) break; }
  await PH.addPages(doc, rec, false);
  const W = 210, H = 297, M = 8, LINE = [190, 190, 190], GREY = [105, 105, 105];
  const pages = doc.getNumberOfPages();
  const sp = kind === 'form' ? OFORM.of(rec) : null;
  const title = sp ? sp.subj : kind === 'oil' ? 'Oil Boiler Service Record' : 'Oil Tank Check';
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINE); doc.setLineWidth(0.25); doc.line(M, H - 11.5, W - M, H - 11.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...GREY);
    doc.text(sp ? sp.foot : kind === 'oil' ? 'THIS RECORD SHOWS THE CHECKS CARRIED OUT ON THE OIL-FIRED APPLIANCE AT THE VISIT DATED ABOVE.' : 'THIS RECORD SHOWS THE CHECKS CARRIED OUT ON THE OIL STORAGE TANK AND SUPPLY PIPEWORK AT THE VISIT DATED ABOVE.', W / 2, H - 8.2, { align: 'center' });
    doc.setFontSize(6.8);
    doc.text(`${s.businessName || ''}${s.oftecReg ? '  ·  OFTEC Reg. No. ' + s.oftecReg : ''}`, M, H - 4.2);
    doc.text(`${rec.ref}${pages > 1 ? `  ·  Page ${p} of ${pages}` : ''}`, W - M, H - 4.2, { align: 'right' });
  }
  doc.setProperties({ title: `${title} ${rec.ref}`, subject: rec.jobAddress, author: s.businessName || 'Your business' });
  return doc.output('blob');
}

async function drawOilPdf(rec, s, lv, kind) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 8, CW = W - 2 * M, FOOT = 14, GAP = 2.2;
  const GOLD = [255, 242, 0], GOLD_L = [241, 241, 241], INK = [22, 22, 22], GREY = [105, 105, 105], LINE = [190, 190, 190];
  const GREEN = [22, 120, 70], RED = [190, 35, 30];
  const F = lv.f, P = lv.p;
  const logo = await getLogo();
  const ukd = iso => (iso ? iso.split('-').reverse().join('/') : '');
  const blank = '________________';
  const isOilK = kind === 'oil', SP = kind === 'form' ? OFORM.of(rec) : null, CFG = isOilK ? OIL : TANK;
  const TITLE = SP ? SP.pdf : isOilK ? 'OIL BOILER SERVICE RECORD' : 'OIL TANK CHECK';
  const SUB = SP ? SP.sub : isOilK ? 'Record of the service, commissioning or repair of an oil-fired boiler.' : 'Record of the condition of the oil storage tank, bund and oil supply pipework.';
  let y = 0;

  const BAR = 5.2;
  function band(first) {
    const bh = first ? 26 : 12;
    doc.setFillColor(12, 12, 12); doc.rect(0, 0, W, bh, 'F');
    doc.setFillColor(...GOLD); doc.rect(0, bh, W, 0.8, 'F');
    if (first) {
      doc.addImage(logo, 'PNG', M, 4, 18, 18);
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
      doc.text(TITLE, 29, 11);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.setTextColor(215, 215, 215);
      doc.splitTextToSize(SUB, 100).forEach((t, i) => doc.text(t, 29, 16 + i * 2.7));
      const vR = W - M;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...GOLD);
      doc.text('RECORD NO.', vR, 8, { align: 'right' }); doc.text((SP ? SP.dateLabel.toUpperCase() : 'DATE OF VISIT'), vR, 17, { align: 'right' });
      doc.setFontSize(10); doc.setTextColor(255, 255, 255);
      doc.text(rec.ref, vR, 13, { align: 'right' }); doc.text(ukd(rec.inspectionDate), vR, 22, { align: 'right' });
      y = bh + 3;
    } else {
      doc.setTextColor(...GOLD); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.text(TITLE + ' (continued)', M, 8);
      doc.setTextColor(255, 255, 255); doc.text(rec.ref, W - M, 8, { align: 'right' });
      y = bh + 4;
    }
  }
  function ensure(h) { if (y + h > H - FOOT) { doc.addPage(); band(false); } }
  function bar(title, x, w, yy) {
    doc.setFillColor(...GOLD); doc.rect(x, yy, w, BAR, 'F');
    doc.setDrawColor(...INK); doc.setLineWidth(0.2); doc.rect(x, yy, w, BAR);
    doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.2);
    doc.text(title, x + 2.4, yy + 3.6);
  }
  const lh = fs => fs * 0.4;
  function wrap(text, w, fs, style) {
    doc.setFont('helvetica', style || 'normal'); doc.setFontSize(fs);
    return String(text ?? '').split('\n').flatMap(l => doc.splitTextToSize(l || ' ', w));
  }
  function box(title, x, w, yy, lines, minH, dry) {
    const pad = 2.2, out = [];
    lines.forEach(l => { const fs = (l.fs || 8) * F; wrap(l.t, w - 2 * pad, fs, l.b ? 'bold' : 'normal').forEach(t => out.push({ t, fs, b: l.b, c: l.c })); });
    const step = o => lh(o.fs) + 0.8 * P;
    const h = Math.max(minH || 0, BAR + pad * 2 + out.reduce((a, o) => a + step(o), 0) - 0.4);
    if (dry) return h;
    bar(title, x, w, yy); doc.setDrawColor(...LINE); doc.setLineWidth(0.25); doc.rect(x, yy + BAR, w, h - BAR);
    let ty = yy + BAR + pad + 2.3;
    out.forEach(o => { doc.setFont('helvetica', o.b ? 'bold' : 'normal'); doc.setFontSize(o.fs); doc.setTextColor(...(o.c || INK)); doc.text(o.t, x + pad, ty); ty += step(o); });
    return h;
  }
  /* table: title '' = no title bar; a cell {dot:[r,g,b]} draws a filled marker (used for the PASS / FAIL / N/A columns) */
  function table(title, cols, rows) {
    const tw = cols.reduce((a, c) => a + c.w, 0), k = CW / tw;
    cols = cols.map(c => ({ ...c, w: c.w * k }));
    const fsH = 6 * F, fsB = 7.6 * F, padX = 1.2, padY = 1.0 * P;
    const headH = Math.max(...cols.map(c => wrap(c.h, c.w - 2 * padX, fsH, 'bold').length)) * lh(fsH) * 1.05 + 2 * padY + 0.8;
    function head() {
      let x = M; doc.setFillColor(...GOLD_L); doc.rect(M, y, CW, headH, 'F'); doc.setDrawColor(...LINE); doc.setLineWidth(0.25);
      cols.forEach(c => {
        doc.rect(x, y, c.w, headH); doc.setFont('helvetica', 'bold'); doc.setFontSize(fsH); doc.setTextColor(0, 0, 0);
        wrap(c.h, c.w - 2 * padX, fsH, 'bold').forEach((t, i) => doc.text(t, c.a === 'c' ? x + c.w / 2 : x + padX, y + padY + 1.9 + i * lh(fsH) * 1.05, { align: c.a === 'c' ? 'center' : 'left' }));
        x += c.w;
      });
      y += headH;
    }
    ensure((title ? BAR : 0) + headH + 8); if (title) { bar(title, M, CW, y); y += BAR; } head();
    rows.forEach(r => {
      const cells = r.map((v, i) => { const o = typeof v === 'object' && v !== null && !Array.isArray(v) ? v : { t: v }; return { ...o, lines: wrap(o.t === '' && (o.keep || o.dot) ? ' ' : (o.t === '' || o.t == null ? '–' : o.t), cols[i].w - 2 * padX, fsB, o.b ? 'bold' : 'normal') }; });
      const rh = Math.max(...cells.map(c => c.lines.length)) * lh(fsB) * 1.1 + 2 * padY + 0.9;
      if (y + rh > H - FOOT) { doc.addPage(); band(false); if (title) { bar(title + ' (continued)', M, CW, y); y += BAR; } head(); }
      let x = M;
      cells.forEach((c, i) => {
        doc.setDrawColor(...LINE); doc.rect(x, y, cols[i].w, rh);
        if (c.dot) { doc.setFillColor(...c.dot); doc.circle(x + cols[i].w / 2, y + rh / 2, 1.35, 'F'); }
        doc.setFont('helvetica', c.b ? 'bold' : 'normal'); doc.setFontSize(fsB); doc.setTextColor(...(c.c || INK));
        c.lines.forEach((t, j) => doc.text(t, cols[i].a === 'c' ? x + cols[i].w / 2 : x + padX, y + padY + 2.5 + j * lh(fsB) * 1.1, { align: cols[i].a === 'c' ? 'center' : 'left' }));
        x += cols[i].w;
      });
      y += rh;
    });
    y += GAP;
  }
  const pfCell = (v) => v === 'PASS' ? { t: 'PASS', b: 1, c: GREEN } : v === 'FAIL' ? { t: 'FAIL', b: 1, c: RED } : { t: v || '–', c: GREY };

  const ynCell = v => ({ t: v || '–', b: 1, c: v === 'YES' ? GREEN : v === 'NO' ? RED : INK });
  function stampBar(h, label) {
    doc.setFillColor(...RED); doc.rect(M, y, CW, h, 'F');
    doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.5); doc.rect(M + 1.2, y + 1.2, CW - 2.4, h - 2.4);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.setFontSize(h > 14 ? 28 : 24); doc.text(label || 'NOT SAFE – DO NOT USE', M + CW / 2, y + h / 2 + (h > 14 ? 3.6 : 3.1), { align: 'center', charSpace: 1.2 });
    doc.setLineWidth(0.25); y += h + GAP;
  }

  /* ================= LAYOUT ================= */
  band(true);
  if (SP ? OFORM.stamp(rec) : CFG.stamp(rec)) stampBar(15, SP && SP.stampText);
  const g3 = 3, bw = (CW - 2 * g3) / 3;
  const biz = [{ t: s.businessName || 'Your business', b: 1, fs: 8.6 }];
  if (s.address) biz.push({ t: addrLine(s.address) });
  biz.push({ t: 'Tel: ' + (s.phone || blank) });
  if (s.email) biz.push({ t: s.email });
  biz.push({ t: 'OFTEC Reg. No: ' + (s.oftecReg || blank), b: 1 });
  const site = [{ t: rec.customer.name, b: 1, fs: 8.6 }, { t: addrLine(rec.jobAddress || '') }];
  if (rec.customer.phone) site.push({ t: 'Tel: ' + rec.customer.phone });
  { const pc = typeof propContact === 'function' ? propContact((typeof customers !== 'undefined' ? customers : []).find(c => c.id === rec.customerId), rec.jobAddress) : null; if (pc && (pc.n || pc.p)) site.push({ t: 'Site contact: ' + [pc.n, pc.p].filter(Boolean).join('  Tel: ') }); }
  const cli = [{ t: rec.customer.name, b: 1, fs: 8.6 }, { t: addrLine(rec.customer.billing || rec.jobAddress || '') }];
  if (rec.customer.phone) cli.push({ t: 'Tel: ' + rec.customer.phone });
  if (rec.customer.email) cli.push({ t: rec.customer.email });
  const T = ['CONTRACTOR DETAILS', 'INSTALLATION DETAILS', 'CLIENT DETAILS'], D = [biz, site, cli];
  const bh = Math.max(...D.map((d, i) => box(T[i], 0, bw, 0, d, 0, true)));
  D.forEach((d, i) => box(T[i], M + i * (bw + g3), bw, y, d, bh));
  y += bh + GAP;

  const kv = (label, v) => [{ t: label, b: 1 }, v];
  const unit = (v, u) => (String(v ?? '').trim() ? v + ' ' + u : '');
  /* four-column key / value layout: two items per row */
  const cols4 = [{ h: 'Item', w: 36 }, { h: 'Details', w: 60 }, { h: 'Item', w: 36 }, { h: 'Details', w: 60 }];
  const pairs = items => { const rows = []; for (let i = 0; i < items.length; i += 2) { const a = items[i], b = items[i + 1]; rows.push([{ t: a[0], b: 1 }, a[1], b ? { t: b[0], b: 1 } : { t: '', keep: 1 }, b ? b[1] : { t: '', keep: 1 }]); } return rows; };
  /* checks in two columns, then the fault details for anything that failed */
  const cols2c = [{ h: 'Check', w: 63 }, { h: 'Result', w: 16, a: 'c' }, { h: 'Check', w: 63 }, { h: 'Result', w: 16, a: 'c' }];
  function checksTable(title, list) {
    const half = Math.ceil(list.length / 2), rows = [];
    for (let i = 0; i < half; i++) { const a = list[i], b = list[i + half]; rows.push([a[0], pfCell(a[1]), b ? b[0] : { t: '', keep: 1 }, b ? pfCell(b[1]) : { t: '', keep: 1 }]); }
    table(title, cols2c, rows);
    const bad = list.filter(x => x[1] === 'FAIL');
    if (bad.length) table('FAULT DETAILS', [{ h: 'Check', w: 60 }, { h: 'Details of the fault', w: 134 }], bad.map(x => [{ t: x[0], b: 1 }, x[2] || '']));
  }

  if (SP) {
    const F2 = rec.f, ynC = v => ({ t: v || '–', b: 1, c: v === 'YES' ? GREEN : v === 'NO' ? RED : INK });
    const fmt = fd => {
      let v = F2[fd.k] ?? (fd.top ? rec[fd.k] : '');
      if (fd.top) v = rec[fd.k];
      if (fd.t === 'yn' || fd.t === 'ynna') return ynC(v);
      if (fd.t === 'date') return ukd(v);
      if (fd.other && v === 'Other') return F2[fd.k + 'Other'] || 'Other';
      if (fd.t === 'num' && String(v ?? '').trim()) return fd.u ? v + ' ' + fd.u : String(v);
      if (fd.k === 'cls' || fd.k === 'defectClass') return { t: v || '–', b: 1, c: v === 'Immediately dangerous' || v === 'At risk' ? RED : INK };
      return v;
    };
    SP.sections.forEach(sec => {
      const fds = sec.fields.filter(fd => OFORM.visible(fd, rec));
      const kvs = fds.filter(fd => !['area', 'pfn', 'info'].includes(fd.t));
      if (kvs.length) table(sec.h.toUpperCase(), cols4, pairs(kvs.map(fd => [fd.l.replace(/₂/g, '2'), fmt(fd)])));
      const pfs = fds.filter(fd => fd.t === 'pfn');
      if (pfs.length) checksTable(kvs.length ? sec.h.toUpperCase() + ' – CHECKS' : sec.h.toUpperCase(), pfs.map(fd => [fd.l, F2[fd.k], F2[fd.k + '_d']]));
      fds.filter(fd => fd.t === 'area' && String(F2[fd.k] ?? '').trim()).forEach(fd => {
        const al = [{ t: F2[fd.k], fs: 7.6 }], ah = box('', 0, CW, 0, al, 0, true); ensure(ah + 3);
        box(fd.l.toUpperCase(), M, CW, y, al, ah); y += ah + GAP;
      });
    });
  } else if (isOilK) {
    table('APPLIANCE DETAILS', cols4, pairs([
      ['Make', OIL.makeText(rec)], ['Model', rec.model],
      ['System type', OIL.sysText(rec)], ['Serial number', rec.serial],
      ['Fuel', OIL.fuelText(rec)], ['Flue type', OIL.flueText(rec)],
      ['Location', OIL.locText(rec)], ['Burner', rec.burner],
      ['Reason for visit', rec.reason], ['Full strip down service', rec.stripDown], ['Age of boiler', rec.age]
    ]));
    checksTable('CHECKS', OIL.ALL.map(c => [c.label, rec.chk[c.k], rec.fault[c.k]]));
    table('BURNER SETTINGS AND COMBUSTION', cols4, pairs([
      ['Nozzle', rec.nozzleSize], ['Pump pressure', unit(rec.pumpPressure, 'bar')],
      ['Oil filter cleaned / replaced', rec.filterChanged], ['Flue gas analysis done', rec.fgDone],
      ['CO2', rec.fgDone === 'YES' ? unit(rec.fgCo2, '%') : ''], ['O2', rec.fgDone === 'YES' ? unit(rec.fgO2, '%') : ''],
      ['CO', rec.fgDone === 'YES' ? unit(rec.fgCo, 'ppm') : ''], ['Smoke number', rec.fgDone === 'YES' ? rec.fgSmoke : ''],
      ['Flue gas temperature', rec.fgDone === 'YES' ? unit(rec.fgTemp, '°C') : ''], ['Ambient temperature', rec.fgDone === 'YES' ? unit(rec.fgAmb, '°C') : ''],
      ['Net efficiency', rec.fgDone === 'YES' ? unit(rec.fgEff, '%') : ''], ['Flue draught', rec.fgDone === 'YES' ? unit(rec.fgDraught, 'mbar') : ''],
      ['Within maker’s figures', rec.fgDone === 'YES' ? pfCell(rec.fgResult) : ''], ['Analyser', rec.fgDone === 'YES' ? rec.analyser : '']
    ]));
    table('RESULT', cols4, pairs([
      ['Meets maker’s instructions', ynCell(rec.manufacturer)], ['Safe to use', ynCell(rec.safe)],
      ['Defects found', { t: rec.defectClass || '–', b: 1, c: rec.defectClass === 'Immediately dangerous' ? RED : rec.defectClass === 'At risk' ? RED : INK }], ['Next service due', ukd(rec.renewal)]
    ]));
  } else {
    table('TANK DETAILS', cols4, pairs([
      ['Position', TANK.posText(rec)], ['Material', TANK.matText(rec)],
      ['Bunded', rec.bunded], ['Capacity', unit(rec.capacity, 'litres')],
      ['Make', rec.tankMake], ['Age', rec.tankAge],
      ['Fuel stored', OIL.fuelText({ fuel: rec.fuel, fuelOther: '' })], ['Fire protection', rec.fireProt],
      ['Distance from building', unit(rec.distBuilding, 'm')], ['Distance from boundary', unit(rec.distBoundary, 'm')],
      ['Near water / drain / well', rec.nearWater], ['Water in fuel', rec.waterTest]
    ]));
    checksTable('CHECKS', TANK.CHK.map(c => [c.label, rec.chk[c.k], rec.fault[c.k]]));
    table('RESULT', cols4, pairs([
      ['Safe to use', ynCell(rec.safe)], ['Pollution risk', rec.risk],
      ['Defects found', { t: rec.defectClass || '–', b: 1, c: rec.defectClass === 'Immediately dangerous' || rec.defectClass === 'At risk' ? RED : INK }], ['Next check due', ukd(rec.renewal)]
    ]));
  }

  /* defects and advice, then notes */
  if (rec.defectClass && rec.defectClass !== 'None') {
    const dl = [{ t: rec.defects || '–', fs: 7.6 }];
    const dh = box('', 0, CW, 0, dl, 0, true); ensure(dh + 3);
    box('DEFECTS FOUND AND ADVICE GIVEN', M, CW, y, dl, dh); y += dh + GAP;
  }
  if (!SP) {
    const nl = [{ t: rec.notes || 'None.', fs: 7.6 }];
    const nh = Math.max(box('', 0, CW, 0, nl, 0, true), 18);
    ensure(nh + 3);
    box('NOTES', M, CW, y, nl, nh);
    y += nh + GAP;
  }

  /* sign-off */
  const sh = Math.round(32 * Math.max(P, 0.8) * 10) / 10 + 15; ensure(sh + 1);
  const sw = (CW - g3) / 2, sigH = sh - 21;
  const sigBox = (x, title, sigImg, lines, noOne) => {
    bar(title, x, sw, y); doc.setDrawColor(...LINE); doc.rect(x, y + BAR, sw, sh - BAR);
    if (sigImg) doc.addImage(sigImg, 'PNG', x + 3, y + BAR + 1.2, 50, sigH * 0.95, undefined, 'FAST');
    if (noOne) { doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(...GREY); doc.text('No-one present at time of visit', x + sw / 2, y + BAR + sigH / 2 + 1, { align: 'center' }); }
    const ly = y + BAR + sigH + 1.5; doc.setDrawColor(...LINE); doc.line(x + 3, ly, x + sw - 3, ly);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...GREY); doc.text('Signature', x + 3, ly + 2.6);
    doc.setFontSize(7.6); doc.setTextColor(...INK); lines.forEach((t, i) => doc.text(t, x + 3, ly + 6 + i * 3.4));
  };
  sigBox(M, 'ENGINEER', rec.engineerSig, ['Engineer: ' + (s.engineerName || blank), 'OFTEC Reg. No: ' + (s.oftecReg || blank), 'Date: ' + ukd(rec.inspectionDate)]);
  const here = rec.customerPresent === 'Yes' && rec.customerSig;
  sigBox(M + sw + g3, 'CLIENT', here ? rec.customerSig : null, ['Client: ' + (here ? (rec.customerName || rec.customer.name) : rec.customer.name), 'Date: ' + ukd(rec.inspectionDate)], !here);
  return doc;
}
