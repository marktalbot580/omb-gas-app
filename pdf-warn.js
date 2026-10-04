/* Danger / Do Not Use Warning Notice – portrait A4, same black & gold look as the other records.
   Wording follows the ServiceM8 "Danger Do Not Use Warning Notice" template. */
'use strict';

async function buildWarnPdf(rec, s) {
  const gs = s.gasSafeLogo ? { url: s.gasSafeLogo, ar: s.gasSafeLogoAR || 1 } : await getGasSafe().catch(() => null);
  s = Object.assign({}, s, { _gs: gs });
  const levels = [{ f: 1, p: 1 }, { f: 0.95, p: 0.85 }, { f: 0.9, p: 0.7 }, { f: 0.85, p: 0.55 }, { f: 0.8, p: 0.4 }, { f: 0.75, p: 0.3 }];
  let doc;
  for (const lv of levels) { doc = await drawWarnPdf(rec, s, lv); if (doc.getNumberOfPages() === 1) break; }
  await PH.addPages(doc, rec, false);
  const W = 210, H = 297, M = 8, LINE = [190, 190, 190], GREY = [105, 105, 105];
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINE); doc.setLineWidth(0.25); doc.line(M, H - 11.5, W - M, H - 11.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...GREY);
    doc.text('DO NOT USE THE APPLIANCE / INSTALLATION NAMED ABOVE UNTIL THE SITUATION HAS BEEN RESOLVED. FURTHER INFORMATION: WWW.GASSAFEREGISTER.CO.UK', W / 2, H - 8.2, { align: 'center' });
    doc.setFontSize(6.8);
    doc.text(`${s.businessName || ''}${s.gasSafeReg ? '  ·  Gas Safe No. ' + s.gasSafeReg : ''}`, M, H - 4.2);
    doc.text(`${rec.ref}${pages > 1 ? `  ·  Page ${p} of ${pages}` : ''}`, W - M, H - 4.2, { align: 'right' });
  }
  doc.setProperties({ title: `Danger Do Not Use Warning Notice ${rec.ref}`, subject: rec.jobAddress, author: s.businessName || 'Your business' });
  return doc.output('blob');
}

async function drawWarnPdf(rec, s, lv) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 8, CW = W - 2 * M, FOOT = 14, GAP = 2.2;
  const GOLD = [255, 242, 0], GOLD_L = [241, 241, 241], INK = [22, 22, 22], GREY = [105, 105, 105], LINE = [190, 190, 190];
  const RED = [190, 35, 30];
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
      doc.text('DANGER – DO NOT USE WARNING NOTICE', 29, 11);
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
      doc.text('NOTICE NO.', vR, 8, { align: 'right' }); doc.text('DATE OF NOTICE', vR, 17, { align: 'right' });
      doc.setFontSize(10); doc.setTextColor(255, 255, 255);
      doc.text(rec.ref, vR, 13, { align: 'right' }); doc.text(ukd(rec.inspectionDate), vR, 22, { align: 'right' });
      y = bh + 3;
    } else {
      doc.setTextColor(...GOLD); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.text('DANGER – DO NOT USE WARNING NOTICE (continued)', M, 8);
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
  const dotIf = c => ({ t: '', keep: 1, dot: c ? RED : null });

  /* ================= LAYOUT ================= */
  band(true);
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

  /* main warning */
  {
    const txt = 'WHERE AN INSTALLATION / APPLIANCE HAS BEEN CLASSIFIED AS IMMEDIATELY DANGEROUS OR AT RISK IT SHOULD NOT BE USED UNTIL THE SITUATION IS RESOLVED.';
    const fs = 9.4 * F, lines = wrap(txt, CW - 8, fs, 'bold'), h = lines.length * lh(fs) * 1.15 + 5 * P + 2;
    ensure(h + 1);
    doc.setFillColor(253, 236, 234); doc.setDrawColor(...RED); doc.setLineWidth(0.6); doc.rect(M, y, CW, h, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(fs); doc.setTextColor(...RED);
    lines.forEach((t, i) => doc.text(t, W / 2, y + 2.5 * P + 2.6 + i * lh(fs) * 1.15, { align: 'center' }));
    doc.setLineWidth(0.25);
    y += h + GAP;
  }

  /* faults */
  const n = Math.max(1, Math.min(4, +rec.faultCount || 1));
  const fl = (rec.faults || []).slice(0, n);
  table('APPLIANCES / INSTALLATIONS CLASSIFIED AS DANGEROUS OR AT RISK', [
    { h: 'Location', w: 22 }, { h: 'Type', w: 19 }, { h: 'Make', w: 20 }, { h: 'Model', w: 22 }, { h: 'Serial number', w: 22 },
    { h: 'ID', w: 7, a: 'c' }, { h: 'AR', w: 7, a: 'c' }, { h: 'RIDDOR II(1)', w: 12, a: 'c' }, { h: 'RIDDOR II(2)', w: 12, a: 'c' }, { h: 'Reason / notes', w: 56 }
  ], fl.map(f => [
    WARN.locText(f), f.type, f.make, f.model, f.serial,
    dotIf(f.cls === 'ID'), dotIf(f.cls === 'AR'), dotIf(f.riddor === 'YES' && /II\(1\)/.test(f.riddorType)), dotIf(f.riddor === 'YES' && /II\(2\)/.test(f.riddorType)),
    { t: f.notes, keep: 1 }
  ]));

  /* explanations */
  const ID_T = 'AN IMMEDIATELY DANGEROUS SITUATION CONSTITUTES A DANGER TO PERSONS OR PROPERTY. WITH YOUR PERMISSION, YOUR ENGINEER WILL DISCONNECT THE RELEVANT APPLIANCE OR INSTALLATION AND APPLY RELEVANT WARNING LABELS.';
  const AR_T = 'A SITUATION HAS BEEN FOUND THAT MAY ENDANGER PERSONS OR PROPERTY. WITH YOUR PERMISSION, YOUR ENGINEER WILL TURN OFF THE RELEVANT APPLIANCE OR INSTALLATION AND APPLY RELEVANT WARNING LABELS. IF TURNING OFF EITHER APPLIANCE OR INSTALLATION WILL NOT IMPROVE THE SITUATION THEN YOUR ENGINEER WILL EXPLAIN THE NEXT STEPS.';
  const RID_T = 'GAS SAFE REGISTERED ENGINEERS ARE REQUIRED BY LAW TO NOTIFY CERTAIN SITUATIONS TO THE HEALTH & SAFETY EXECUTIVE WITHIN 14 DAYS UNDER ‘RIDDOR’ REPORTING. PART II(1) IS REQUIRED FOR A GAS INCIDENT. PART II(2) IS REQUIRED WHEN A DANGEROUS FITTING OR SITUATION IS FOUND.';
  const REF_T = 'REGISTERED GAS INSTALLERS ARE REQUIRED BY LAW TO REPORT CASES WHERE THEY ARE REFUSED PERMISSION TO DISCONNECT AN IMMEDIATELY DANGEROUS GAS INSTALLATION TO THE EMERGENCY SERVICE PROVIDER. ALL GAS TRANSPORTERS OPERATE A GAS EMERGENCY SERVICE AND HAVE POWERS UNDER THE GAS SAFETY (RIGHTS OF ENTRY) REGULATIONS TO ENTER PROPERTIES AND DISCONNECT UNSAFE GAS APPLIANCES/INSTALLATIONS.';
  const w2 = (CW - g3) / 2, fsT = 6.9;
  const idL = [{ t: ID_T, fs: fsT }], arL = [{ t: AR_T, fs: fsT }];
  const bh2 = Math.max(box('', 0, w2, 0, idL, 0, true), box('', 0, w2, 0, arL, 0, true));
  ensure(bh2 + 2);
  box('ID – IMMEDIATELY DANGEROUS', M, w2, y, idL, bh2); box('AR – AT RISK', M + w2 + g3, w2, y, arL, bh2);
  y += bh2 + GAP;
  const ridL = [{ t: RID_T, fs: fsT }, { t: REF_T, fs: fsT }];
  const bh3 = box('', 0, CW, 0, ridL, 0, true); ensure(bh3 + 2);
  box('RIDDOR', M, CW, y, ridL, bh3); y += bh3 + GAP;

  /* declaration */
  const here = rec.customerPresent === 'Yes' && rec.customerSig;
  const decl = [
    { t: 'I CONFIRM I HAVE RECEIVED THIS WARNING/ADVICE NOTICE CONCERNING THE SAFETY OF THE GAS INSTALLATION. I UNDERSTAND THAT THE USE OF THE APPLIANCE/INSTALLATION, IN THE CASE OF AN ID/AR FAULT, COULD PRESENT A HAZARD AND COULD PLACE ME IN BREACH OF THE GAS SAFETY (INSTALLATION AND USE) REGULATIONS.', fs: fsT },
    { t: 'I CONFIRM THAT THE SITUATIONS RECORDED ABOVE HAVE BEEN IDENTIFIED AND BROUGHT TO THE ATTENTION OF THE GAS USER/RESPONSIBLE PERSON IN ACCORDANCE WITH THE GAS SAFETY (INSTALLATION AND USE) REGULATIONS.', fs: fsT }
  ];
  if (!here) decl.push({ t: 'GAS USER WAS NOT PRESENT AT THE TIME OF THE VISIT AND THE INSTALLATION HAS BEEN MADE SAFE WHERE POSSIBLE.', fs: fsT + 0.4, b: 1, c: RED });
  const bh4 = box('', 0, CW, 0, decl, 0, true); ensure(bh4 + 2);
  box('DECLARATION', M, CW, y, decl, bh4); y += bh4 + GAP;

  /* sign-off */
  const sh = Math.round(30 * Math.max(P, 0.8) * 10) / 10 + 6; ensure(sh + 1);
  const sw = (CW - g3) / 2, sigH = sh - 21;
  const sigBox = (x, title, sigImg, lines, noOne) => {
    bar(title, x, sw, y); doc.setDrawColor(...LINE); doc.rect(x, y + BAR, sw, sh - BAR);
    if (sigImg) doc.addImage(sigImg, 'PNG', x + 3, y + BAR + 1.2, 50, sigH * 0.95, undefined, 'FAST');
    if (noOne) { doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(...GREY); doc.text('No-one present at time of visit', x + sw / 2, y + BAR + sigH / 2 + 1, { align: 'center' }); }
    const ly = y + BAR + sigH + 1.5; doc.setDrawColor(...LINE); doc.line(x + 3, ly, x + sw - 3, ly);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...GREY); doc.text('Signature', x + 3, ly + 2.6);
    doc.setFontSize(7.6); doc.setTextColor(...INK); lines.forEach((t, i) => doc.text(t, x + 3, ly + 6 + i * 3.4));
  };
  sigBox(M, 'ENGINEER', rec.engineerSig, ['Engineer: ' + (s.engineerName || blank), 'Gas Safe ID: ' + (s.gasSafeId || blank), 'Date: ' + ukd(rec.inspectionDate)]);
  sigBox(M + sw + g3, 'CLIENT', here ? rec.customerSig : null, ['Client: ' + (here ? (rec.customerName || rec.customer.name) : rec.customer.name), 'Date: ' + ukd(rec.inspectionDate)], !here);
  return doc;
}
