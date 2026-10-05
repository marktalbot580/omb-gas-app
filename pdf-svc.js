/* Gas Boiler Service Record – portrait A4, same black & gold look as the other records.
   Layout follows the ServiceM8 template: appliance details, appliance checks, safety checks,
   operating checks, combustion readings, declarations, notes and sign-off. */
'use strict';

async function buildSvcPdf(rec, s) {
  const gs = s.gasSafeLogo ? { url: s.gasSafeLogo, ar: s.gasSafeLogoAR || 1 } : await getGasSafe().catch(() => null);
  s = Object.assign({}, s, { _gs: gs });
  const levels = [{ f: 1, p: 1 }, { f: 0.96, p: 0.85 }, { f: 0.92, p: 0.7 }, { f: 0.88, p: 0.55 }, { f: 0.84, p: 0.42 }, { f: 0.8, p: 0.3 }];
  let doc;
  for (const lv of levels) { doc = await drawSvcPdf(rec, s, lv); if (doc.getNumberOfPages() === 1) break; }
  await PH.addPages(doc, rec, false);
  const W = 210, H = 297, M = 8, LINE = [190, 190, 190], GREY = [105, 105, 105];
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINE); doc.setLineWidth(0.25); doc.line(M, H - 11.5, W - M, H - 11.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...GREY);
    doc.text('THIS RECORD DOCUMENTS THE SERVICE / REPAIR OF THE APPLIANCE NAMED ABOVE. FURTHER INFORMATION: WWW.GASSAFEREGISTER.CO.UK', W / 2, H - 8.2, { align: 'center' });
    doc.setFontSize(6.8);
    doc.text(`${s.businessName || ''}${s.gasSafeReg ? '  ·  Gas Safe No. ' + s.gasSafeReg : ''}`, M, H - 4.2);
    doc.text('Boilers should be serviced every 12 months.', W / 2, H - 4.2, { align: 'center' });
    doc.text(`${rec.ref}${pages > 1 ? `  ·  Page ${p} of ${pages}` : ''}`, W - M, H - 4.2, { align: 'right' });
  }
  doc.setProperties({ title: `Gas Boiler Service Record ${rec.ref}`, subject: rec.jobAddress, author: s.businessName || 'Your business' });
  return doc.output('blob');
}

async function drawSvcPdf(rec, s, lv) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 8, CW = W - 2 * M, FOOT = 14, GAP = 2.2;
  const GOLD = [255, 242, 0], GOLD_L = [241, 241, 241], INK = [22, 22, 22], GREY = [105, 105, 105], LINE = [190, 190, 190];
  const GREEN = [22, 120, 70], RED = [190, 35, 30];
  const F = lv.f, P = lv.p;
  const logo = await getLogo();
  const ukd = iso => (iso ? iso.split('-').reverse().join('/') : '');
  const blank = '________________';
  let y = 0;

  const BAR = 5.2;
  function band(first) {
    const bh = first ? 26 : 12;
    doc.setFillColor(12, 12, 12); doc.rect(0, 0, W, bh, 'F');
    doc.setFillColor(...GOLD); doc.rect(0, bh, W, 0.8, 'F');
    if (first) {
      doc.addImage(logo, 'PNG', M, 4, 18, 18);
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(14.5);
      doc.text('GAS BOILER SERVICE RECORD', 29, 11);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.setTextColor(215, 215, 215);
      doc.splitTextToSize('Registered business / engineer details can be checked at www.gassaferegister.co.uk', 90).forEach((t, i) => doc.text(t, 29, 16 + i * 2.7));
      let vR = W - M;
      if (s._gs) {
        const th = 16, ar = s._gs.ar, iw = Math.min(th * ar, 36), ih = iw / ar, tw = iw + 4, tx = W - M - tw;
        doc.setFillColor(255, 255, 255); doc.roundedRect(tx, 5, tw, 16, 1.5, 1.5, 'F');
        doc.addImage(s._gs.url, 'PNG', tx + 2, 5 + (16 - Math.min(ih, 14)) / 2, iw * Math.min(1, 14 / ih), Math.min(ih, 14));
        vR = tx - 4;
      }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...GOLD);
      doc.text('RECORD NO.', vR, 8, { align: 'right' }); doc.text('DATE OF SERVICE', vR, 17, { align: 'right' });
      doc.setFontSize(10); doc.setTextColor(255, 255, 255);
      doc.text(rec.ref, vR, 13, { align: 'right' }); doc.text(ukd(rec.inspectionDate), vR, 22, { align: 'right' });
      y = bh + 3;
    } else {
      doc.setTextColor(...GOLD); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.text('GAS BOILER SERVICE RECORD (continued)', M, 8);
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
  const dot = (v, key) => ({ t: '', keep: 1, dot: v === key ? (key === 'PASS' ? GREEN : key === 'FAIL' ? RED : GREY) : null });
  const chkRow = (label, v, detail) => [{ t: label, b: 1 }, dot(v, 'PASS'), dot(v, 'FAIL'), dot(v, 'NA'), { t: detail || '', keep: 1, c: RED }];
  const pfCell = (v) => v === 'PASS' ? { t: 'PASS', b: 1, c: GREEN } : v === 'FAIL' ? { t: 'FAIL', b: 1, c: RED } : { t: v || '–', c: GREY };
  const ynCol = v => v === 'YES' ? GREEN : v === 'NO' ? RED : INK;


  /* red FAIL – DO NOT USE stamp, drawn straight under the header when the record has failed */
  function stampBar(h) {
    doc.setFillColor(...RED); doc.rect(M, y, CW, h, 'F');
    doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.5); doc.rect(M + 1.2, y + 1.2, CW - 2.4, h - 2.4);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.setFontSize(h > 14 ? 28 : 24); doc.text('FAIL – DO NOT USE', M + CW / 2, y + h / 2 + (h > 14 ? 3.6 : 3.1), { align: 'center', charSpace: 1.2 });
    doc.setLineWidth(0.25); y += h + GAP;
  }

  /* ================= LAYOUT ================= */
  band(true);
  if (WARN.stamp(rec)) stampBar(15);
  const g3 = 3, bw = (CW - 2 * g3) / 3;
  const biz = [{ t: s.businessName || 'Your business', b: 1, fs: 8.6 }];
  if (s.address) biz.push({ t: s.address.replace(/\n/g, ', ') });
  biz.push({ t: 'Tel: ' + (s.phone || blank) });
  if (s.email) biz.push({ t: s.email });
  biz.push({ t: 'Gas Safe Register No: ' + (s.gasSafeReg || blank), b: 1 });
  const site = [{ t: rec.customer.name, b: 1, fs: 8.6 }, { t: (rec.jobAddress || '').replace(/\n/g, ', ') }];
  if (rec.customer.phone) site.push({ t: 'Tel: ' + rec.customer.phone });
  const cli = [{ t: rec.customer.name, b: 1, fs: 8.6 }, { t: (rec.customer.billing || rec.jobAddress || '').replace(/\n/g, ', ') }];
  if (rec.customer.email) cli.push({ t: rec.customer.email });
  const T = ['REGISTERED BUSINESS DETAILS', 'INSTALLATION DETAILS', 'CLIENT DETAILS'], D = [biz, site, cli];
  const bh = Math.max(...D.map((d, i) => box(T[i], 0, bw, 0, d, 0, true)));
  D.forEach((d, i) => box(T[i], M + i * (bw + g3), bw, y, d, bh));
  y += bh + GAP;

  /* appliance details */
  table('APPLIANCE DETAILS', [
    { h: 'Location', w: 40 }, { h: 'Make', w: 40 }, { h: 'Model', w: 50 }, { h: 'System type', w: 34 }, { h: 'GC number', w: 30 }
  ], [[SVC.locText(rec), SVC.makeText(rec), rec.model, SVC.sysText(rec), rec.gc]]);
  table('', [
    { h: 'Serial number', w: 60 }, { h: 'Reason for visit', w: 40 }, { h: 'Flue type', w: 50 }, { h: 'Boiler age', w: 44 }
  ], [[rec.serial, rec.reason, rec.flue, rec.age]]);

  const colsChk = [{ h: 'Check', w: 56 }, { h: 'PASS', w: 12, a: 'c' }, { h: 'FAIL', w: 12, a: 'c' }, { h: 'N/A', w: 12, a: 'c' }, { h: 'Failure details', w: 102 }];
  table('APPLIANCE CHECKS', colsChk, SVC.APP.map(c => chkRow(c.label, rec.chk[c.k], rec.chk[c.k] === 'FAIL' ? rec.fault[c.k] : '')));

  const tight = rec.tightDone === 'YES' ? rec.tightResult : (rec.tightDone === 'N/A' ? 'NA' : '');
  const tightDetail = rec.tightDone === 'YES' ? tightText(rec.tightStart, rec.tightEnd, rec.tightMins) : rec.tightDone === 'N/A' ? '' : rec.tightDone ? 'Not performed – ' + rec.tightDone : '';
  table('SAFETY CHECKS', colsChk, [
    ...SVC.SAFE.map(c => chkRow(c.label, rec.chk[c.k], rec.chk[c.k] === 'FAIL' ? rec.fault[c.k] : '')),
    (() => { const r = chkRow('Gas tightness test', tight, tightDetail); r[4] = { t: tightDetail, keep: 1, c: GREY }; return r; })()
  ]);

  const res = (taken, result) => taken === 'YES' ? pfCell(result) : { t: taken === 'N/A' ? 'N/A' : taken === 'NO' ? 'Not taken' : '–', c: GREY };
  const opRows = [
    [{ t: 'Operating pressure', b: 1 }, res(rec.bpTaken, rec.bpResult), rec.bpTaken === 'YES' ? 'mbar: ' + rec.bpValue : ''],
    ...(/worcester/i.test(SVC.makeText(rec)) ? [[{ t: 'Fan pressure', b: 1 }, res(rec.fpTaken, rec.fpResult), rec.fpTaken === 'YES' ? 'mbar: ' + fanFmt(rec.fpValue) : '']] : []),
    [{ t: 'Gas rate', b: 1 }, res(rec.grTaken, rec.grResult), rec.grTaken === 'YES' ? 'kW: ' + rec.grValue : ''],
    [{ t: 'Flue gas analysis', b: 1 }, rec.fgDone === 'YES' ? pfCell(rec.fgResult) : { t: rec.fgDone === 'NO' ? 'Not performed' : '–', c: GREY }, rec.fgDone === 'YES' ? 'See results below in combustion analyser readings' : '']
  ];
  table('OPERATING CHECKS', [{ h: 'Check', w: 56 }, { h: 'Result', w: 36, a: 'c' }, { h: 'Test result', w: 102 }], opRows);

  if (rec.fgDone === 'YES') {
    table('COMBUSTION ANALYSER READINGS', [
      { h: 'CO (ppm) – min / low', w: 32, a: 'c' }, { h: 'CO2 (%) – min / low', w: 32, a: 'c' }, { h: 'Ratio – min / low', w: 32, a: 'c' },
      { h: 'CO (ppm) – max / high', w: 33, a: 'c' }, { h: 'CO2 (%) – max / high', w: 33, a: 'c' }, { h: 'Ratio – max / high', w: 32, a: 'c' }
    ], [[rec.fgCoMin, rec.fgCo2Min, rec.fgRatioMin, rec.fgCoMax, rec.fgCo2Max, rec.fgRatioMax].map(v => ({ t: v, a: 'c' }))]);
  }

  /* key to the abbreviations used above */
  {
    const worc = /worcester/i.test(SVC.makeText(rec)) && rec.fpTaken === 'YES';
    const keyTxt = 'KEY:  GC = Gas Council number   ·   mbar = millibar (pressure)   ·   kW = kilowatts (heat input / gas rate)' + (worc ? '   ·   Fan pressure = Worcester Bosch fan pressure reading (mbar)' : '') + (rec.fgDone === 'YES' ? '   ·   CO = carbon monoxide   ·   CO2 = carbon dioxide   ·   Ratio = CO/CO2 ratio' : '') + '   ·   N/A = not applicable';
    const fsK = 6 * F, kl = wrap(keyTxt, CW, fsK, 'italic');
    ensure(kl.length * lh(fsK) + 2);
    doc.setFont('helvetica', 'italic'); doc.setFontSize(fsK); doc.setTextColor(...GREY);
    kl.forEach((t, n) => doc.text(t, M, y + 1.9 + n * lh(fsK)));
    y += kl.length * lh(fsK) + 2.2;
  }

  /* declarations + notes */
  function kvBox(title, x, w, yy, pairs, minH, dry) {
    const pad = 2.2, fs = 7.6 * F, vw = w * 0.22, kw = w - vw - 2 * pad - 2;
    const rows = pairs.map(([k, v, c]) => ({ k: wrap(k, kw, fs, 'normal'), v: wrap(v || '–', vw, fs, 'bold'), c }));
    const rh = r => Math.max(r.k.length, r.v.length) * lh(fs) * 1.1 + 1 * P;
    const h = Math.max(minH || 0, BAR + pad * 2 + rows.reduce((a, r) => a + rh(r), 0));
    if (dry) return h;
    bar(title, x, w, yy); doc.setDrawColor(...LINE); doc.rect(x, yy + BAR, w, h - BAR);
    let ty = yy + BAR + pad + 2;
    rows.forEach(r => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(fs); doc.setTextColor(...INK);
      r.k.forEach((t, i) => doc.text(t, x + pad, ty + i * lh(fs) * 1.1));
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...(r.c || INK));
      r.v.forEach((t, i) => doc.text(t, x + w - pad, ty + i * lh(fs) * 1.1, { align: 'right' }));
      ty += rh(r); doc.setDrawColor(232, 232, 232); doc.line(x + pad, ty - 1.9 * P - 0.1, x + w - pad, ty - 1.9 * P - 0.1);
    });
    return h;
  }
  const decl = [
    ['Complies with manufacturer’s instructions', rec.manufacturer, ynCol(rec.manufacturer)],
    ['Appliance safe to use', rec.safe, ynCol(rec.safe)],
    ['Warning notice issued', rec.warning, rec.warning === 'YES' ? RED : INK],
    ['System filter present', rec.filterPresent, INK],
    ...(rec.filterPresent === 'YES' ? [['System filter cleaned', rec.filterCleaned, INK]] : [])
  ];
  const w1 = 96, w2 = CW - w1 - g3;
  const notes = [{ t: rec.notes || 'None.', fs: 7.6 }];
  const bh2 = Math.max(kvBox('', 0, w1, 0, decl, 0, true), box('', 0, w2, 0, notes, 0, true));
  ensure(bh2 + 3);
  kvBox('DECLARATIONS', M, w1, y, decl, bh2);
  box('ENGINEER NOTES', M + w1 + g3, w2, y, notes, bh2);
  y += bh2 + GAP;

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
  sigBox(M, 'ENGINEER', rec.engineerSig, ['Engineer: ' + (s.engineerName || blank), 'Gas Safe ID: ' + (s.gasSafeId || blank), 'Date: ' + ukd(rec.inspectionDate)]);
  const here = rec.customerPresent === 'Yes' && rec.customerSig;
  sigBox(M + sw + g3, 'CLIENT', here ? rec.customerSig : null, ['Client: ' + (here ? (rec.customerName || rec.customer.name) : rec.customer.name), 'Date: ' + ukd(rec.inspectionDate)], !here);
  const nx = M + 2 * (sw + g3);
  doc.setFillColor(12, 12, 12); doc.rect(nx, y, sw, sh, 'F'); doc.setFillColor(...GOLD); doc.rect(nx, y, sw, 0.8, 'F');
  doc.setTextColor(...GOLD); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.text('NEXT SERVICE DUE BY', nx + sw / 2, y + sh * 0.3, { align: 'center' });
  doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.text(ukd(rec.renewal), nx + sw / 2, y + sh * 0.64, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); doc.setTextColor(190, 190, 190);
  doc.text('Boilers should be serviced every 12 months.', nx + sw / 2, y + sh * 0.86, { align: 'center' });
  return doc;
}
