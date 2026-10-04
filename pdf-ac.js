/* Air Conditioning Commissioning Report – portrait A4, same black & gold look as the other records.
   Layout follows the standard commissioning report: contractor / installation / client details,
   system information, refrigerant, notes and sign-off. */
'use strict';

async function buildAcPdf(rec, s) {
  const levels = [{ f: 1, p: 1 }, { f: 0.96, p: 0.85 }, { f: 0.92, p: 0.7 }, { f: 0.88, p: 0.55 }, { f: 0.84, p: 0.42 }, { f: 0.8, p: 0.3 }];
  let doc;
  for (const lv of levels) { doc = await drawAcPdf(rec, s, lv); if (doc.getNumberOfPages() === 1) break; }
  await PH.addPages(doc, rec, false);
  const W = 210, H = 297, M = 8, LINE = [190, 190, 190], GREY = [105, 105, 105];
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINE); doc.setLineWidth(0.25); doc.line(M, H - 11.5, W - M, H - 11.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...GREY);
    doc.text('THIS REPORT RECORDS THE INSTALLATION AND COMMISSIONING OF THE AIR CONDITIONING SYSTEM DESCRIBED ABOVE.', W / 2, H - 8.2, { align: 'center' });
    doc.setFontSize(6.8);
    doc.text(s.businessName || '', M, H - 4.2);
    doc.text('Keep this report with the equipment warranty and service records.', W / 2, H - 4.2, { align: 'center' });
    doc.text(`${rec.ref}${pages > 1 ? `  ·  Page ${p} of ${pages}` : ''}`, W - M, H - 4.2, { align: 'right' });
  }
  doc.setProperties({ title: `Air Conditioning Commissioning Report ${rec.ref}`, subject: rec.jobAddress, author: s.businessName || 'Your business' });
  return doc.output('blob');
}

async function drawAcPdf(rec, s, lv) {
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
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13.5);
      doc.text('AIR CONDITIONING COMMISSIONING REPORT', 29, 11);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.setTextColor(215, 215, 215);
      doc.splitTextToSize('Record of the installation, pressure test, evacuation and commissioning of the system.', 100).forEach((t, i) => doc.text(t, 29, 16 + i * 2.7));
      const vR = W - M;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...GOLD);
      doc.text('REPORT NO.', vR, 8, { align: 'right' }); doc.text('DATE COMMISSIONED', vR, 17, { align: 'right' });
      doc.setFontSize(10); doc.setTextColor(255, 255, 255);
      doc.text(rec.ref, vR, 13, { align: 'right' }); doc.text(ukd(rec.inspectionDate), vR, 22, { align: 'right' });
      y = bh + 3;
    } else {
      doc.setTextColor(...GOLD); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.text('AIR CONDITIONING COMMISSIONING REPORT (continued)', M, 8);
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

  /* ================= LAYOUT ================= */
  band(true);
  const g3 = 3, bw = (CW - 2 * g3) / 3;
  const biz = [{ t: s.businessName || 'Your business', b: 1, fs: 8.6 }];
  if (s.address) biz.push({ t: s.address.replace(/\n/g, ', ') });
  biz.push({ t: 'Tel: ' + (s.phone || blank) });
  if (s.email) biz.push({ t: s.email });
  const site = [{ t: rec.customer.name, b: 1, fs: 8.6 }, { t: (rec.jobAddress || '').replace(/\n/g, ', ') }];
  if (rec.customer.phone) site.push({ t: 'Tel: ' + rec.customer.phone });
  const cli = [{ t: rec.customer.name, b: 1, fs: 8.6 }, { t: (rec.customer.billing || rec.jobAddress || '').replace(/\n/g, ', ') }];
  if (rec.customer.phone) cli.push({ t: 'Tel: ' + rec.customer.phone });
  if (rec.customer.email) cli.push({ t: rec.customer.email });
  const T = ['CONTRACTOR DETAILS', 'INSTALLATION DETAILS', 'CLIENT DETAILS'], D = [biz, site, cli];
  const bh = Math.max(...D.map((d, i) => box(T[i], 0, bw, 0, d, 0, true)));
  D.forEach((d, i) => box(T[i], M + i * (bw + g3), bw, y, d, bh));
  y += bh + GAP;

  /* key / value tables, as on the standard commissioning report */
  const kv = (label, v) => [{ t: label, b: 1 }, v];
  const unit = (v, u) => (String(v ?? '').trim() ? v + ' ' + u : '');
  const cols2 = [{ h: 'Item', w: 70 }, { h: 'Details', w: 124 }];
  table('SYSTEM INFORMATION', cols2, [
    kv('Manufacturer', AC.makeText(rec)),
    kv('Indoor model', rec.indoorModel), kv('Indoor serial', rec.indoorSerial), kv('Indoor location', AC.inLocText(rec)),
    kv('Outdoor model', rec.outdoorModel), kv('Outdoor serial', rec.outdoorSerial), kv('Outdoor location', AC.outLocText(rec))
  ]);
  table('REFRIGERANT', cols2, [
    kv('System pressure tested to', unit(rec.pressure, 'bar')),
    kv('System held on vacuum', unit(rec.vacuum, 'hrs')),
    kv('System gas charge added', unit(rec.charge, 'g')),
    kv('Type of gas', AC.gasText(rec)),
    kv('Pipe length', unit(rec.pipeLen, 'm')),
    kv('Drain', pfCell(rec.drain)),
    kv('Temperature settings – air', rec.tempSet),
    kv('Electrical', pfCell(rec.electrical))
  ]);

  /* notes */
  const nl = [{ t: rec.notes || 'None.', fs: 7.6 }];
  const nh = Math.max(box('', 0, CW, 0, nl, 0, true), 22);
  ensure(nh + 3);
  box('NOTES', M, CW, y, nl, nh);
  y += nh + GAP;

  /* sign-off */
  const sh = Math.round(32 * Math.max(P, 0.8) * 10) / 10 + 2; ensure(sh + 1);
  const sw = (CW - g3) / 2, sigH = sh - 17;
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
  return doc;
}
