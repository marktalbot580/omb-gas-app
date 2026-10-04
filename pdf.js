/* Landlord Gas Safety Record – landscape A4 */
'use strict';

/* the business's own logo (uploaded in Settings), or a neutral initials tile until they add one */
async function getLogo() { return settings.logo || placeholderLogo(settings.businessName); }


/* Try progressively tighter layouts until the record fits on a single A4 page. */
let _gs;
async function getGasSafe() {   // bundled Gas Safe logo (used unless a different one is uploaded in Settings)
  if (_gs) return _gs;
  const blob = await (await fetch('gassafe.png')).blob();
  const url = await new Promise(res => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(blob); });
  const ar = await new Promise(res => { const i = new Image(); i.onload = () => res(i.width / i.height); i.src = url; });
  return (_gs = { url, ar });
}

async function buildPdf(rec, s) {
  rec = await PH.resolveRec(rec);   // signatures are kept in the photo store
  if (rec.type === 'legionella') return buildLegPdf(rec, s);
  if (rec.type === 'aircon') return buildAcPdf(rec, s);
  if (rec.type === 'service') return buildSvcPdf(rec, s);
  if (rec.type === 'warning') return buildWarnPdf(rec, s);
  const gs = s.gasSafeLogo ? { url: s.gasSafeLogo, ar: s.gasSafeLogoAR || 1 } : await getGasSafe().catch(() => null);
  s = Object.assign({}, s, { _gs: gs });
  const levels = [{ f: 1, p: 1 }, { f: 0.93, p: 0.8 }, { f: 0.86, p: 0.62 }, { f: 0.8, p: 0.5 }, { f: 0.75, p: 0.4 }, { f: 0.7, p: 0.3 }];
  let doc;
  for (const lv of levels) { doc = await drawPdf(rec, s, lv); if (doc.getNumberOfPages() === 1) break; }
  await PH.addPages(doc, rec, true);
  // footers (after final page count is known)
  const W = 297, H = 210, M = 8, LINE = [190, 190, 190], GREY = [105, 105, 105];
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINE); doc.setLineWidth(0.25); doc.line(M, H - 11.5, W - M, H - 11.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...GREY);
    doc.text('PLEASE REFER TO ACCOMPANYING WARNING NOTICE(S) FOR FURTHER INFORMATION REGARDING ANY DEFECTS. FURTHER INFORMATION AND GUIDANCE REGARDING GAS SAFETY CERTIFICATES MAY BE FOUND AT WWW.GASSAFEREGISTER.CO.UK', W / 2, H - 8.2, { align: 'center' });
    doc.setFontSize(6.8);
    doc.text(`${s.businessName || ''}${s.gasSafeReg ? '  ·  Gas Safe Register No. ' + s.gasSafeReg : ''}`, M, H - 4.2);
    doc.text('Keep this record for at least 2 years.', W / 2, H - 4.2, { align: 'center' });
    doc.text(`${rec.ref}${pages > 1 ? `  ·  Page ${p} of ${pages}` : ''}`, W - M, H - 4.2, { align: 'right' });
  }
  doc.setProperties({ title: `Landlord Gas Safety Record ${rec.ref}`, subject: rec.jobAddress, author: s.businessName || 'Your business' });
  return doc.output('blob');
}

async function drawPdf(rec, s, lv) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297, H = 210, M = 8, CW = W - 2 * M, FOOT = 14, GAP = 2.6;
  const GOLD = [255, 242, 0], GOLD_L = [241, 241, 241], INK = [22, 22, 22], GREY = [105, 105, 105], LINE = [190, 190, 190];
  const GREEN = [22, 120, 70], RED = [190, 35, 30];
  const F = lv.f, P = lv.p;
  const logo = await getLogo();
  const ukd = iso => (iso ? iso.split('-').reverse().join('/') : '');
  const n = Math.max(1, Math.min(4, +rec.applianceCount || 1));
  const apps = rec.appliances.slice(0, n);
  const defs = rec.defects.slice(0, +rec.defectCount || 0);
  const blank = '________________';
  let y = 0;

  const BAR = 5.2;
  function band(first) {
    const bh = first ? 22 : 12;
    doc.setFillColor(12, 12, 12); doc.rect(0, 0, W, bh, 'F');
    doc.setFillColor(...GOLD); doc.rect(0, bh, W, 0.8, 'F');
    if (first) {
      doc.addImage(logo, 'PNG', M, 2, 18, 18);
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(14.5);
      doc.text('LANDLORD / HOME OWNER GAS SAFETY RECORD', 30, 9);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.setTextColor(215, 215, 215);
      const intro = 'This record can be used to document the outcome of checks and tests required by The Gas Safety (Installation and Use) Regulations. Some of the outcomes are as a result of visual inspection only and are recorded where appropriate. Unless specifically recorded, no detailed inspection of the flue lining, construction or integrity has been performed. Registered Business / engineer details can be checked at www.gassaferegister.co.uk';
      doc.splitTextToSize(intro, 142).forEach((t, i) => doc.text(t, 30, 13.4 + i * 2.7));
      let vR = W - M;                            // right edge for the record number / date
      if (s._gs) {                               // Gas Safe logo on a white tile at the far right
        const th = 17, ar = s._gs.ar, iw = Math.min(th * ar, 44), ih = iw / ar, tw = iw + 4, tx = W - M - tw;
        doc.setFillColor(255, 255, 255); doc.roundedRect(tx, 2.5, tw, 17, 1.5, 1.5, 'F');
        doc.addImage(s._gs.url, 'PNG', tx + 2, 2.5 + (17 - Math.min(ih, 15)) / 2, iw * Math.min(1, 15 / ih), Math.min(ih, 15));
        vR = tx - 5;
      }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...GOLD);
      doc.text('RECORD NO.', vR - 36, 8, { align: 'right' }); doc.text('DATE OF INSPECTION', vR - 36, 15, { align: 'right' });
      doc.setFontSize(10.5); doc.setTextColor(255, 255, 255);
      doc.text(rec.ref, vR, 8, { align: 'right' }); doc.text(ukd(rec.inspectionDate), vR, 15, { align: 'right' });
      y = bh + 3.5;
    } else {
      doc.setTextColor(...GOLD); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.text('LANDLORD GAS SAFETY RECORD (continued)', M, 8);
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


  /* red FAIL – DO NOT USE stamp, drawn straight under the header when the record has failed */
  function stampBar(h) {
    doc.setFillColor(...RED); doc.rect(M, y, CW, h, 'F');
    doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.5); doc.rect(M + 1.2, y + 1.2, CW - 2.4, h - 2.4);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.setFontSize(h > 14 ? 28 : 24); doc.text('FAIL – DO NOT USE', M + CW / 2, y + h / 2 + (h > 14 ? 3.6 : 3.1), { align: 'center', charSpace: 1.2 });
    doc.setLineWidth(0.25); y += h + GAP;
  }

  /* text box (dry = measure only) */
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

  /* table */
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
      const cells = r.map((v, i) => { const o = typeof v === 'object' && v !== null ? v : { t: v }; return { ...o, lines: wrap(o.t === '' || o.t == null ? '–' : o.t, cols[i].w - 2 * padX, fsB, o.b ? 'bold' : 'normal') }; });
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
  const res = v => (v === 'Pass' || v === 'PASS' || v === 'Yes') ? { t: v, b: 1, c: GREEN } : (v === 'Fail' || v === 'FAIL' || v === 'No') ? { t: v, b: 1, c: RED } : { t: v };
  const safe = v => v === 'Yes' ? { t: 'YES', b: 1, c: GREEN } : v === 'No' ? { t: 'NO', b: 1, c: RED } : { t: v };

  /* ================= LAYOUT ================= */
  band(true);
  if (WARN.stamp(rec)) stampBar(12);
  const g3 = 3, bw = (CW - 2 * g3) / 3;
  const biz = [{ t: s.businessName || 'Your business', b: 1, fs: 8.6 }];
  if (s.address) biz.push({ t: s.address.replace(/\n/g, ', ') });
  biz.push({ t: 'Tel: ' + (s.phone || blank) + (s.email ? '   ' + s.email : '') });
  biz.push({ t: 'Gas Safe Register No: ' + (s.gasSafeReg || blank), b: 1 });
  const site = [{ t: rec.customer.name, b: 1, fs: 8.6 }, { t: (rec.jobAddress || '').replace(/\n/g, ', ') }];
  if (rec.customer.phone) site.push({ t: 'Tel: ' + rec.customer.phone });
  const cli = [{ t: rec.customer.name, b: 1, fs: 8.6 }, { t: (rec.customer.billing || rec.jobAddress || '').replace(/\n/g, ', ') }];
  if (rec.customer.email) cli.push({ t: rec.customer.email });
  const T = ['REGISTERED BUSINESS DETAILS', 'INSTALLATION DETAILS (PROPERTY INSPECTED)', 'CLIENT DETAILS'], D = [biz, site, cli];
  const bh = Math.max(...D.map((d, i) => box(T[i], 0, bw, 0, d, 0, true)));
  D.forEach((d, i) => box(T[i], M + i * (bw + g3), bw, y, d, bh));
  y += bh + GAP;

  const loc = a => (a.location === 'Other' ? a.locationOther : a.location);
  const fanOf = a => (/worcester/i.test(a.manufacturer) && a.fanPress ? fanFmt(a.fanPress) : '');
  const showFan = apps.some(a => fanOf(a));     // Worcester Bosch fan pressure gets its own column, only when one was recorded
  const cols = [
    { h: 'No.', w: 6, a: 'c' }, { h: 'Location', w: 20 }, { h: 'Type', w: 20 }, { h: 'Manufacturer', w: 33 }, { h: 'Model / GC no.', w: 37 },
    { h: 'Owner', w: 16 }, { h: 'Flue type', w: 17 }, { h: 'Serviced', w: 13, a: 'c' },
    { h: 'OP (mbar)', w: 13, a: 'c' }, { h: 'HI (kW)', w: 12, a: 'c' }, ...(showFan ? [{ h: 'Fan pressure (mbar)', w: 15, a: 'c' }] : []), { h: 'Vent.', w: 12, a: 'c' }, { h: 'Flue visual', w: 14, a: 'c' },
    { h: 'Flue op.', w: 12, a: 'c' }, { h: 'Safety devices', w: 16, a: 'c' }, { h: 'Safe to use', w: 14, a: 'c' }
  ];
  table('APPLIANCE DETAILS AND INSPECTION', cols, apps.map((a, i) => [{ t: String(i + 1), b: 1 }, loc(a), typeText(a), a.manufacturer, a.model + (a.gc ? '\nGC: ' + a.gc : ''), a.ownership, a.flue, a.serviced,
    a.op, a.hi, ...(showFan ? [fanOf(a)] : []), res(a.vent), res(a.terminal), res(a.flueOp), res(a.safety), safe(a.safe)]));
  /* key to the abbreviations used in the table above */
  {
    const keyTxt = 'KEY:  OP = operating pressure at the appliance (mbar)   ·   HI = heat input / gas rate (kW)' + (showFan ? '   ·   Fan pressure = Worcester Bosch fan pressure reading (mbar)' : '') + '   ·   Vent. = ventilation   ·   Flue op. = flue operation checks   ·   NA = not applicable';
    const fsK = 6 * F, kl = wrap(keyTxt, CW, fsK, 'italic');
    ensure(kl.length * lh(fsK) + 2);
    doc.setFont('helvetica', 'italic'); doc.setFontSize(fsK); doc.setTextColor(...GREY);
    kl.forEach((t, n) => doc.text(t, M, y + 1.9 + n * lh(fsK)));
    y += kl.length * lh(fsK) + 2.2;
  }

  table('COMBUSTION ANALYSER READINGS', [
    { h: 'No.', w: 6, a: 'c' }, { h: 'CO (ppm) min', w: 20, a: 'c' }, { h: 'CO2 (%) min', w: 20, a: 'c' }, { h: 'Ratio min', w: 20, a: 'c' },
    { h: 'CO (ppm) max', w: 20, a: 'c' }, { h: 'CO2 (%) max', w: 20, a: 'c' }, { h: 'Ratio max', w: 20, a: 'c' }
  ], apps.map((a, i) => [{ t: String(i + 1), b: 1 }, a.coMin, a.co2Min, a.ratioMin, a.coMax, a.co2Max, a.ratioMax]));

  if (defs.length) {
    table('DEFECTS IDENTIFIED   ·   ID = Immediately Dangerous    AR = At Risk    NCS = Not to Current Standards', [
      { h: 'No.', w: 6, a: 'c' }, { h: 'Defect identified', w: 110 }, { h: 'Remedial action taken', w: 110 }, { h: 'Classification', w: 22, a: 'c' }
    ], defs.map((d, i) => [{ t: String(i + 1), b: 1 }, d.text, d.action, { t: d.cls, b: 1, c: d.cls === 'ID' ? RED : INK }]));
  } else {
    table('DEFECTS IDENTIFIED', [{ h: 'Result', w: 1 }], [['No defects identified.']]);
  }

  /* checks / alarms / notes */
  function kvBox(title, x, w, yy, pairs, minH, dry) {
    const pad = 2.2, fs = 7.6 * F, vw = w * 0.36, kw = w - vw - 2 * pad - 2;
    const rows = pairs.map(([k, v]) => ({ k: wrap(k, kw, fs, 'normal'), v: wrap(v || '–', vw, fs, 'bold'), val: v }));
    const rh = r => Math.max(r.k.length, r.v.length) * lh(fs) * 1.1 + 1 * P;
    const h = Math.max(minH || 0, BAR + pad * 2 + rows.reduce((a, r) => a + rh(r), 0));
    if (dry) return h;
    bar(title, x, w, yy); doc.setDrawColor(...LINE); doc.rect(x, yy + BAR, w, h - BAR);
    let ty = yy + BAR + pad + 2;
    rows.forEach(r => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(fs); doc.setTextColor(...INK);
      r.k.forEach((t, i) => doc.text(t, x + pad, ty + i * lh(fs) * 1.1));
      const c = res(r.val); doc.setFont('helvetica', 'bold'); doc.setTextColor(...(c.c || INK));
      r.v.forEach((t, i) => doc.text(t, x + w - pad, ty + i * lh(fs) * 1.1, { align: 'right' }));
      ty += rh(r); doc.setDrawColor(232, 232, 232); doc.line(x + pad, ty - 1.9 * P - 0.1, x + w - pad, ty - 1.9 * P - 0.1);
    });
    return h;
  }
  const tight = rec.tightness + (rec.tightnessResult ? ' – ' + rec.tightnessResult : '');
  const checks = [['Installation pipework visual', rec.installPipe], ['Supply pipework visual', rec.supplyPipe], ['Protective equipotential bonding', rec.bonding],
    ['ECV access', rec.ecv], ['Tightness test', tight], ['No. of appliances tested', String(n)]];
  const alarms = [['CO alarm – approved alarm fitted', rec.coAlarm], ...(rec.coAlarm === 'Yes' ? [['CO alarm test', rec.coAlarmTest]] : []),
    ['Smoke alarm present', rec.smokeAlarm], ...(rec.smokeAlarm === 'Yes' ? [['Smoke alarm test', rec.smokeAlarmTest]] : [])];
  const w1 = 112, w2 = 76, w3 = CW - w1 - w2 - 2 * g3;
  const notes = [{ t: rec.notes || 'None.', fs: 7.6 }];
  const bh2 = Math.max(kvBox('', 0, w1, 0, checks, 0, true), kvBox('', 0, w2, 0, alarms, 0, true), box('', 0, w3, 0, notes, 0, true));
  ensure(bh2 + 4);
  kvBox('GAS INSTALLATION CHECKS', M, w1, y, checks, bh2);
  kvBox('ALARMS', M + w1 + g3, w2, y, alarms, bh2);
  box('ENGINEER NOTES', M + w1 + w2 + 2 * g3, w3, y, notes, bh2);
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
  sigBox(M, 'ENGINEER', rec.engineerSig, ['Engineer: ' + (s.engineerName || blank), 'Gas Safe ID: ' + (s.gasSafeId || blank) + '    Date: ' + ukd(rec.inspectionDate)]);
  const here = rec.customerPresent === 'Yes' && rec.customerSig;
  sigBox(M + sw + g3, 'CLIENT', here ? rec.customerSig : null, ['Client: ' + (here ? (rec.customerName || rec.customer.name) : rec.customer.name), 'Date: ' + ukd(rec.inspectionDate)], !here);
  const nx = M + 2 * (sw + g3);
  doc.setFillColor(12, 12, 12); doc.rect(nx, y, sw, sh, 'F'); doc.setFillColor(...GOLD); doc.rect(nx, y, sw, 0.8, 'F');
  doc.setTextColor(...GOLD); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.text('NEXT SAFETY CHECK DUE BY', nx + sw / 2, y + sh * 0.3, { align: 'center' });
  doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.text(ukd(rec.renewal), nx + sw / 2, y + sh * 0.64, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); doc.setTextColor(190, 190, 190);
  doc.text('Gas appliances must be checked every 12 months.', nx + sw / 2, y + sh * 0.86, { align: 'center' });
  y += sh + 1.2;
  {
    const dt = 'This inspection is for gas safety purposes only, in accordance with the Gas Safety (Installation and Use) Regulations. Flues were visually inspected and checked for satisfactory evacuation of products of combustion. A detailed internal inspection of the flue integrity, construction and lining has not been carried out.';
    const fsD = 6 * F, dl = wrap(dt, CW, fsD, 'italic');
    ensure(dl.length * lh(fsD) + 2);
    doc.setFont('helvetica', 'italic'); doc.setFontSize(fsD); doc.setTextColor(...GREY);
    dl.forEach((t, n) => doc.text(t, M, y + 1.9 + n * lh(fsD)));
  }
  return doc;
}
