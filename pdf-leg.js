/* Legionella Risk Assessment – landscape A4, same black & gold look as the Gas Safety Record */
'use strict';

async function buildLegPdf(rec, s) {
  const levels = [{ f: 1, p: 1 }, { f: 0.96, p: 0.85 }, { f: 0.92, p: 0.7 }, { f: 0.88, p: 0.55 }, { f: 0.84, p: 0.42 }, { f: 0.8, p: 0.3 }];
  let doc;
  for (const lv of levels) { doc = await drawLegPdf(rec, s, lv); if (doc.getNumberOfPages() === 1) break; }
  await PH.addPages(doc, rec, false);
  const W = 210, H = 297, M = 8, LINE = [190, 190, 190], GREY = [105, 105, 105];
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINE); doc.setLineWidth(0.25); doc.line(M, H - 14, W - M, H - 14);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...GREY);
    doc.text('THIS ASSESSMENT REFLECTS CONDITIONS AT THE TIME OF INSPECTION. NO WATER SAMPLING OR LABORATORY', W / 2, H - 11, { align: 'center' });
    doc.text('TESTING FOR LEGIONELLA HAS BEEN CARRIED OUT. GUIDANCE FOR LANDLORDS: WWW.HSE.GOV.UK/LEGIONNAIRES', W / 2, H - 8.3, { align: 'center' });
    doc.setFontSize(6.8);
    doc.text(s.businessName || '', M, H - 4.2);
    doc.text('Review if the system changes or the property is left empty.', W / 2, H - 4.2, { align: 'center' });
    doc.text(`${rec.ref}${pages > 1 ? `  ·  Page ${p} of ${pages}` : ''}`, W - M, H - 4.2, { align: 'right' });
  }
  doc.setProperties({ title: `Legionella Risk Assessment ${rec.ref}`, subject: rec.jobAddress, author: s.businessName || 'Your business' });
  return doc.output('blob');
}

async function drawLegPdf(rec, s, lv) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 8, CW = W - 2 * M, FOOT = 17, GAP = 2.2;
  const GOLD = [255, 242, 0], GOLD_L = [241, 241, 241], INK = [22, 22, 22], GREY = [105, 105, 105], LINE = [190, 190, 190];
  const GREEN = [22, 120, 70], RED = [190, 35, 30], AMBER = [196, 120, 0];
  const F = lv.f, P = lv.p;
  const logo = await getLogo();
  const ukd = iso => (iso ? iso.split('-').reverse().join('/') : '');
  const blank = '________________';
  const defs = rec.defects;
  let y = 0;

  const BAR = 5.2;
  function band(first) {
    const bh = first ? 29 : 12;
    doc.setFillColor(12, 12, 12); doc.rect(0, 0, W, bh, 'F');
    doc.setFillColor(...GOLD); doc.rect(0, bh, W, 0.8, 'F');
    if (first) {
      doc.addImage(logo, 'PNG', M, 5, 19, 19);
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
      doc.text('LEGIONELLA RISK ASSESSMENT', 31, 10);
      doc.setFontSize(8.5); doc.setTextColor(...GOLD); doc.text('HOT & COLD WATER SERVICES', 31, 15);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.setTextColor(215, 215, 215);
      const intro = 'Checks made on the hot and cold water systems to assess the risk of exposure to Legionella, in line with HSE guidance for landlords (ACOP L8 and HSG274 Part 2). A proportionate assessment of water temperatures and system condition for a domestic property – not a laboratory test for Legionella.';
      doc.splitTextToSize(intro, 122).forEach((t, i) => doc.text(t, 31, 19.5 + i * 2.7));
      const vR = W - M;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...GOLD);
      doc.text('CERTIFICATE REF.', vR, 7, { align: 'right' }); doc.text('DATE OF ASSESSMENT', vR, 19, { align: 'right' });
      doc.setFontSize(10.5); doc.setTextColor(255, 255, 255);
      doc.text(rec.ref, vR, 12.5, { align: 'right' }); doc.text(ukd(rec.inspectionDate), vR, 24.5, { align: 'right' });
      y = bh + 3;
    } else {
      doc.setTextColor(...GOLD); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.text('LEGIONELLA RISK ASSESSMENT (continued)', M, 8);
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
  function table(title, cols, rows) {
    const tw = cols.reduce((a, c) => a + c.w, 0), k = CW / tw;
    cols = cols.map(c => ({ ...c, w: c.w * k }));
    const fsH = 6 * F, fsB = 7.8 * F, padX = 1.2, padY = 1.1 * P;
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
    ensure(BAR + headH + 8); bar(title, M, CW, y); y += BAR; head();
    rows.forEach(r => {
      const cells = r.map((v, i) => { const o = typeof v === 'object' && v !== null ? v : { t: v }; return { ...o, lines: wrap(o.t === '' && o.keep ? ' ' : (o.t === '' || o.t == null ? '–' : o.t), cols[i].w - 2 * padX, fsB, o.b ? 'bold' : 'normal') }; });
      const rh = Math.max(...cells.map(c => c.lines.length)) * lh(fsB) * 1.1 + 2 * padY + 0.9;
      if (y + rh > H - FOOT) { doc.addPage(); band(false); bar(title + ' (continued)', M, CW, y); y += BAR; head(); }
      let x = M;
      cells.forEach((c, i) => {
        doc.setDrawColor(...LINE); doc.rect(x, y, cols[i].w, rh);
        doc.setFont('helvetica', c.b ? 'bold' : 'normal'); doc.setFontSize(fsB); doc.setTextColor(...(c.c || INK));
        c.lines.forEach((t, j) => doc.text(t, cols[i].a === 'c' ? x + cols[i].w / 2 : x + padX, y + padY + 2.5 + j * lh(fsB) * 1.1, { align: cols[i].a === 'c' ? 'center' : 'left' }));
        x += cols[i].w;
      });
      y += rh;
    });
    y += GAP;
  }
  const yn = v => v === 'Yes' ? { t: 'YES', b: 1, c: GREEN } : v === 'No' ? { t: 'NO', b: 1, c: RED } : v === 'NA' ? { t: 'N/A', c: GREY } : { t: v };
  const pf = v => v === true ? { t: 'PASS', b: 1, c: GREEN } : v === false ? { t: 'FAIL', b: 1, c: RED } : { t: '–' };

  /* ================= LAYOUT ================= */
  band(true);
  const g3 = 3, bw = (CW - 2 * g3) / 3;
  const biz = [{ t: s.businessName || 'Your business', b: 1, fs: 8.6 }];
  if (s.address) biz.push({ t: addrLine(s.address) });
  biz.push({ t: 'Tel: ' + (s.phone || blank) + (s.email ? '   ' + s.email : '') });
  if (s.gasSafeReg) biz.push({ t: 'Gas Safe Register No: ' + s.gasSafeReg, b: 1 });
  const site = [{ t: rec.customer.name, b: 1, fs: 8.6 }, { t: addrLine(rec.jobAddress || '') }];
  if (rec.customer.phone) site.push({ t: 'Tel: ' + rec.customer.phone });
  const cli = [{ t: rec.customer.name, b: 1, fs: 8.6 }, { t: addrLine(rec.customer.billing || rec.jobAddress || '') }];
  if (rec.customer.email) cli.push({ t: rec.customer.email });
  const T = ['CONTRACTOR DETAILS', 'PROPERTY ASSESSED', 'CLIENT DETAILS'], D = [biz, site, cli];
  const bh = Math.max(...D.map((d, i) => box(T[i], 0, bw, 0, d, 0, true)));
  D.forEach((d, i) => box(T[i], M + i * (bw + g3), bw, y, d, bh));
  y += bh + GAP;

  /* system details + overall risk */
  function kvBox(title, x, w, yy, pairs, minH, dry) {
    const pad = 2.2, fs = 7.6 * F, vw = w * 0.4, kw = w - vw - 2 * pad - 2;
    const rows = pairs.map(([k, v]) => ({ k: wrap(k, kw, fs, 'normal'), v: wrap(v || '–', vw, fs, 'bold'), val: v }));
    const rh = r => Math.max(r.k.length, r.v.length) * lh(fs) * 1.1 + 1 * P;
    const h = Math.max(minH || 0, BAR + pad * 2 + rows.reduce((a, r) => a + rh(r), 0));
    if (dry) return h;
    bar(title, x, w, yy); doc.setDrawColor(...LINE); doc.rect(x, yy + BAR, w, h - BAR);
    let ty = yy + BAR + pad + 2;
    rows.forEach(r => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(fs); doc.setTextColor(...INK);
      r.k.forEach((t, i) => doc.text(t, x + pad, ty + i * lh(fs) * 1.1));
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...INK);
      r.v.forEach((t, i) => doc.text(t, x + w - pad, ty + i * lh(fs) * 1.1, { align: 'right' }));
      ty += rh(r); doc.setDrawColor(232, 232, 232); doc.line(x + pad, ty - 1.9 * P - 0.1, x + w - pad, ty - 1.9 * P - 0.1);
    });
    return h;
  }
  const sys = [
    ['Susceptible occupant (age, health, lifestyle)', rec.susceptible],
    ['Property occupancy', rec.occupancy],
    ['Cold water supply', rec.coldSupply],
    ['Hot water system', rec.hotType === 'Other' ? 'Other: ' + rec.hotOther : rec.hotType + (rec.cylHeat ? ' (' + rec.cylHeat.toLowerCase() + ')' : '')],
    ['Showers fitted', rec.showers]
  ];
  const w1 = 128, w2 = CW - w1 - g3;
  const sysH = kvBox('', 0, w1, 0, sys, 0, true);
  ensure(sysH + 4);
  kvBox('SYSTEM DETAILS', M, w1, y, sys, sysH);
  const ox = M + w1 + g3, rc = rec.overall === 'High' ? RED : rec.overall === 'Medium' ? AMBER : GREEN;
  doc.setFillColor(12, 12, 12); doc.rect(ox, y, w2, sysH, 'F'); doc.setFillColor(...GOLD); doc.rect(ox, y, w2, 0.8, 'F');
  doc.setTextColor(...GOLD); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.text('OVERALL RISK RATING', ox + w2 / 2, y + sysH * 0.28, { align: 'center' });
  doc.setFillColor(...rc); const bw2 = Math.min(w2 - 16, 52); doc.roundedRect(ox + (w2 - bw2) / 2, y + sysH * 0.42, bw2, sysH * 0.34, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(Math.min(18, sysH * 0.3)); doc.text((rec.overall || '–').toUpperCase(), ox + w2 / 2, y + sysH * 0.42 + sysH * 0.34 * 0.7, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.4); doc.setTextColor(190, 190, 190); doc.text('of Legionella exposure', ox + w2 / 2, y + sysH * 0.92, { align: 'center' });
  y += sysH + GAP;

  /* temperatures */
  table('WATER TEMPERATURES  ·  keep hot water hot, cold water cold', [
    { h: 'Check', w: 50 }, { h: 'Where measured', w: 50 }, { h: 'Requirement', w: 30, a: 'c' }, { h: 'Reading', w: 22, a: 'c' }, { h: 'Result', w: 20, a: 'c' }
  ], LEG.temps(rec).map(t => [{ t: t.label, b: 1 }, t.where || '–', t.req, { t: t.n === null ? '–' : t.n + '°C', b: 1 }, pf(t.pass)]));

  /* checks */
  const rows = [];
  [['Cold tank', LEG.tankList(rec)], ['Cylinder', LEG.cylList(rec)], ['Risk areas', LEG.riskList(rec)]].forEach(([area, list]) =>
    list.forEach((c, i) => rows.push([{ t: i === 0 ? area : '', b: 1, keep: 1 }, c.q, yn(rec[c.k])])));
  if (!LEG.hasTank(rec)) rows.unshift([{ t: 'Cold tank', b: 1 }, 'No cold water tank – cold water is mains fed.', { t: 'N/A', c: GREY }]);
  if (!LEG.hasCyl(rec)) rows.splice(LEG.hasTank(rec) ? LEG.tankList(rec).length : 1, 0, [{ t: 'Cylinder', b: 1 }, 'No hot water cylinder – hot water is heated instantaneously (no stored hot water).', { t: 'N/A', c: GREY }]);
  table('SYSTEM CHECKS', [{ h: 'Area', w: 24 }, { h: 'Check', w: 148 }, { h: 'Satisfactory?', w: 22, a: 'c' }], rows);

  /* risks / defects */
  if (defs.length) {
    table('RISKS / DEFECTS AND RECOMMENDATIONS', [
      { h: 'No.', w: 7, a: 'c' }, { h: 'Risk / defect identified', w: 70 }, { h: 'Recommendation', w: 85 }, { h: 'Priority', w: 24, a: 'c' }
    ], defs.map((d, i) => [{ t: String(i + 1), b: 1 }, d.text, d.action, { t: d.cls, b: 1, c: d.cls === 'Action required' ? RED : AMBER }]));
  } else {
    table('RISKS / DEFECTS AND RECOMMENDATIONS', [{ h: 'Result', w: 1 }], [['No risks or defects identified.']]);
  }

  /* notes */
  const notes = [{ t: rec.notes || 'None.', fs: 7.6 }];
  const nh = box('', 0, CW, 0, notes, 0, true); ensure(nh + 2); box('ENGINEER NOTES', M, CW, y, notes, nh); y += nh + GAP;

  /* sign-off */
  const sh = Math.round(30 * Math.max(P, 0.8) * 10) / 10 + 2; ensure(sh + 1);
  const sw = (CW - 2 * g3) / 3, sigH = sh - 17;
  const sigBox = (x, title, sigImg, lines, noOne) => {
    bar(title, x, sw, y); doc.setDrawColor(...LINE); doc.rect(x, y + BAR, sw, sh - BAR);
    if (sigImg) doc.addImage(sigImg, 'PNG', x + 3, y + BAR + 1.2, 50, sigH * 0.95, undefined, 'FAST');
    if (noOne) { doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(...GREY); doc.text('No-one present at time of visit', x + sw / 2, y + BAR + sigH / 2 + 1, { align: 'center' }); }
    const ly = y + BAR + sigH + 1.5; doc.setDrawColor(...LINE); doc.line(x + 3, ly, x + sw - 3, ly);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...GREY); doc.text('Signature', x + 3, ly + 2.6);
    doc.setFontSize(7.6); doc.setTextColor(...INK); lines.forEach((t, i) => doc.text(t, x + 3, ly + 6 + i * 3.4));
  };
  sigBox(M, 'ENGINEER', rec.engineerSig, ['Engineer: ' + (s.engineerName || blank), 'Date: ' + ukd(rec.inspectionDate)]);
  const here = rec.customerPresent === 'Yes' && rec.customerSig;
  sigBox(M + sw + g3, 'CLIENT', here ? rec.customerSig : null, ['Client: ' + (here ? (rec.customerName || rec.customer.name) : rec.customer.name), 'Date: ' + ukd(rec.inspectionDate)], !here);
  const nx = M + 2 * (sw + g3);
  doc.setFillColor(12, 12, 12); doc.rect(nx, y, sw, sh, 'F'); doc.setFillColor(...GOLD); doc.rect(nx, y, sw, 0.8, 'F');
  doc.setTextColor(...GOLD); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.text('NEXT ASSESSMENT REQUIRED BY', nx + sw / 2, y + sh * 0.3, { align: 'center' });
  doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.text(ukd(rec.renewal), nx + sw / 2, y + sh * 0.64, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); doc.setTextColor(190, 190, 190);
  doc.text('Review sooner if the system changes.', nx + sw / 2, y + sh * 0.86, { align: 'center' });
  return doc;
}
