/* Accountant print – an ink-saving black & white statement of invoices, with each invoice's breakdown underneath.
   Optionally followed by the full-design invoices, all merged into one PDF.
   list = invoices to print, s = settings, o = { periodText, basisText, mode: 'compact' | 'summary' | 'full' } */
'use strict';

async function buildStatementPdf(list, s, o) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 12, CW = W - 2 * M, BOTTOM = H - 16;
  const INK = [20, 20, 20], GREY = [95, 95, 95], LINE = [170, 170, 170], FAINT = [215, 215, 215];
  const ukd = iso => (iso ? iso.split('-').reverse().join('/') : '');
  const ukdShort = iso => { const p = (iso || '').split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(2)}` : ''; };
  const sorted = [...list].sort((a, b) => (a.date + a.number).localeCompare(b.date + b.number, 'en', { numeric: true }));
  const rows = sorted.map(i => ({ i, T: invTotals(i) }));
  const sum = k => r2(rows.reduce((a, r) => a + r.T[k], 0));
  const net = sum('net'), vat = sum('vat'), gross = sum('total');
  const paidGross = r2(rows.filter(r => r.i.paid).reduce((a, r) => a + r.T.total, 0)), openGross = r2(gross - paidGross);
  let y = 0;

  const txt = (t, x, yy, fs, style, col, align) => { doc.setFont('helvetica', style || 'normal'); doc.setFontSize(fs); doc.setTextColor(...(col || INK)); doc.text(String(t), x, yy, align ? { align } : undefined); };
  const fit = (t, w, fs, style) => {   // one line only, with … when it is too long
    doc.setFont('helvetica', style || 'normal'); doc.setFontSize(fs);
    t = String(t ?? '').replace(/\s*\n\s*/g, ', ');
    if (doc.getTextWidth(t) <= w) return t;
    while (t.length > 1 && doc.getTextWidth(t + '…') > w) t = t.slice(0, -1);
    return t.trim() + '…';
  };
  const wrap = (t, w, fs, style) => { doc.setFont('helvetica', style || 'normal'); doc.setFontSize(fs); return String(t ?? '').split('\n').flatMap(l => doc.splitTextToSize(l || ' ', w)); };
  const hline = (yy, col, lw, x1, x2) => { doc.setDrawColor(...(col || LINE)); doc.setLineWidth(lw || 0.2); doc.line(x1 ?? M, yy, x2 ?? W - M, yy); };
  const newPage = () => { doc.addPage(); y = M + 2; };

  /* ---- heading ---- */
  const vatNo = (s.vatNumber || '').trim() || (rows.find(r => r.i.vatNumber) || { i: {} }).i.vatNumber || '';
  txt('INVOICE STATEMENT', M, y = 17, 17, 'bold');
  txt(s.businessName || 'Your business', M, y += 6.4, 10.5, 'bold');
  const addr = [addrLine(s.address || ''), s.gasSafeReg ? 'Gas Safe Register No: ' + s.gasSafeReg : '', vatNo ? 'VAT No: ' + vatNo : ''].filter(Boolean).join('   ·   ');
  if (addr) txt(fit(addr, CW, 8, 'normal'), M, y += 4.6, 8, 'normal', GREY);
  y += 3.4; hline(y, INK, 0.5); y += 5.2;
  const meta = [['Period', o.periodText], ['Invoices', o.basisText], ['Printed', ukd(todayISO())], ['Number of invoices', String(rows.length)]];
  meta.forEach(([a, b]) => { txt(a, M, y, 8.4, 'normal', GREY); txt(b, M + 38, y, 8.4, 'bold'); y += 4.6; });
  y += 2;

  /* ---- summary table ---- */
  const cols = [{ h: 'Invoice', w: 24 }, { h: 'Date', w: 20 }, { h: 'Customer', w: 46 }, { h: vat > 0 ? 'Net' : 'Amount', w: 24, a: 'r' }, { h: 'VAT', w: 20, a: 'r' }, { h: 'Total', w: 24, a: 'r' }, { h: 'Status', w: 28, a: 'r' }];
  const k = CW / cols.reduce((a, c) => a + c.w, 0); cols.forEach(c => (c.w *= k));
  const cx = i => M + cols.slice(0, i).reduce((a, c) => a + c.w, 0);
  const put = (i, t, yy, fs, style, col) => { const c = cols[i], right = c.a === 'r'; txt(t, right ? cx(i) + c.w : cx(i), yy, fs, style, col, right ? 'right' : 'left'); };
  const head = () => {
    cols.forEach((c, i) => put(i, c.h, y + 3.6, 7.6, 'bold'));
    y += 5.4; hline(y, INK, 0.4); y += 0.6;
  };
  const RH = 5.5;
  if (!rows.length) { txt('No invoices in this period.', M, y + 4, 9, 'normal', GREY); y += 10; }
  else {
    head();
    rows.forEach(({ i, T }) => {
      if (y + RH + 2 > BOTTOM) { newPage(); head(); }
      const st = i.paid ? 'Paid ' + ukdShort(i.paidDate) : invStatus(i) === 'overdue' ? 'Overdue' : 'Unpaid';
      put(0, i.number, y + 3.9, 8.2, 'bold'); put(1, ukd(i.date), y + 3.9, 8.2);
      txt(fit(i.customer.name || '–', cols[2].w - 2, 8.2), cx(2), y + 3.9, 8.2);
      put(3, money(T.net), y + 3.9, 8.2); put(4, T.rate > 0 ? money(T.vat) : '–', y + 3.9, 8.2); put(5, money(T.total), y + 3.9, 8.2, 'bold');
      put(6, st, y + 3.9, 8, 'normal', i.paid ? INK : GREY);
      y += RH; hline(y - 0.5, FAINT, 0.15);
    });
    if (y + 34 > BOTTOM) newPage();
    y += 0.8; hline(y, INK, 0.4); y += 4.6;
    put(2, 'TOTALS', y, 8.4, 'bold'); put(3, money(net), y, 8.4, 'bold'); put(4, money(vat), y, 8.4, 'bold'); put(5, money(gross), y, 8.4, 'bold');
    y += 3; hline(y, INK, 0.4); y += 8;

    /* VAT summary box */
    const bw = 88, bx = W - M - bw, lines = [['Total sales (excluding VAT)', money(net)], ['VAT charged', money(vat)], ['Total including VAT', money(gross)]];
    const extra = [['Of which paid', money(paidGross)], ['Of which not yet paid', money(openGross)]];
    const bh = 7 + (lines.length + extra.length) * 5.4 + 3;
    if (y + bh > BOTTOM) newPage();
    doc.setDrawColor(...INK); doc.setLineWidth(0.4); doc.rect(bx, y, bw, bh);
    let by = y + 5.6;
    txt('SUMMARY FOR THIS PERIOD', bx + 3, by, 7.6, 'bold'); by += 5.4;
    lines.forEach(([a, b], n) => { const last = n === lines.length - 1; txt(a, bx + 3, by, 8.6, last ? 'bold' : 'normal'); txt(b, bx + bw - 3, by, 8.6, 'bold', INK, 'right'); by += 5.4; });
    hline(by - 3.6, FAINT, 0.15, bx + 3, bx + bw - 3);
    extra.forEach(([a, b]) => { txt(a, bx + 3, by, 8, 'normal', GREY); txt(b, bx + bw - 3, by, 8, 'normal', GREY, 'right'); by += 5.4; });
    y += bh + 6;
  }

  /* ---- compact breakdown of every invoice ---- */
  if (o.mode === 'compact' && rows.length) {
    if (y + 30 > BOTTOM) newPage();
    txt('INVOICE BREAKDOWN', M, y + 3, 9.4, 'bold'); y += 5.4; hline(y, INK, 0.5); y += 4;
    const dX = M + 3, qX = M + 120, eX = M + 152, aX = M + CW;
    rows.forEach(({ i, T }) => {
      const prop = fit(addrLine(i.jobAddress || ''), CW - 40, 7.6, 'normal');
      const lines = (i.lines || []).map(l => { const q = numOf(l.q || 1); return { d: wrap(l.d || '–', qX - dX - 14, 8), q: String(q % 1 ? q : Math.round(q)), p: money(numOf(l.p)), a: money(r2(q * numOf(l.p))) }; });
      const tot = [];
      if (T.disc > 0 || T.rate > 0) tot.push('Subtotal ' + money(T.sub));
      if (T.disc > 0) tot.push('Discount -' + money(T.disc), 'Net ' + money(T.net));
      if (T.rate > 0) tot.push(`VAT (${T.rate % 1 ? T.rate : Math.round(T.rate)}%) ${money(T.vat)}`);
      const LH = 3.7;
      const h = 4.4 + (prop ? 3.9 : 0) + lines.reduce((a, l) => a + Math.max(1, l.d.length) * LH + 0.6, 0) + (tot.length ? 4 : 0) + 6.4;
      if (y + h > BOTTOM) newPage();
      const st = i.paid ? 'PAID ' + ukdShort(i.paidDate) : invStatus(i) === 'overdue' ? 'OVERDUE' : 'UNPAID';
      txt(i.number, M, y + 3, 9, 'bold'); txt(ukd(i.date), M + 24, y + 3, 8.4);
      txt(fit(i.customer.name || '–', 82, 8.4, 'bold'), M + 44, y + 3, 8.4, 'bold');
      txt(st, aX, y + 3, 7.8, 'bold', i.paid ? INK : GREY, 'right');
      y += 4.4;
      if (prop) { txt(prop, M, y + 2.6, 7.6, 'normal', GREY); y += 3.9; }
      lines.forEach(l => {
        l.d.forEach((t, n) => txt(t, dX, y + 2.8 + n * LH, 8));
        txt(l.q + ' x', qX, y + 2.8, 8, 'normal', GREY, 'right'); txt(l.p, eX, y + 2.8, 8, 'normal', GREY, 'right'); txt(l.a, aX, y + 2.8, 8, 'normal', INK, 'right');
        y += Math.max(1, l.d.length) * LH + 0.6;
      });
      if (tot.length) { txt(tot.join('     '), aX, y + 3, 7.8, 'normal', GREY, 'right'); y += 4; }
      txt('Invoice total', eX, y + 3.2, 8.4, 'bold', INK, 'right'); txt(money(T.total), aX, y + 3.2, 8.8, 'bold', INK, 'right');
      y += 5.2; hline(y, LINE, 0.2); y += 1.2;
    });
  }

  /* ---- footers on the statement pages ---- */
  const stmtPages = doc.getNumberOfPages();
  for (let p = 1; p <= stmtPages; p++) {
    doc.setPage(p); hline(H - 11.5, LINE, 0.25);
    txt(`${s.businessName || ''}  ·  Invoice statement  ·  ${o.periodText}`, M, H - 6.5, 6.8, 'normal', GREY);
    txt(`Page ${p} of ${stmtPages}`, W - M, H - 6.5, 6.8, 'normal', GREY, 'right');
  }

  /* ---- full invoices, merged after the statement ---- */
  if (o.mode === 'full') for (const { i } of rows) await buildInvPdf(i, s, { doc, addPage: true });

  doc.setProperties({ title: `Invoice statement ${o.periodText}`, subject: 'Invoices for accountant', author: s.businessName || 'Your business' });
  return doc.output('blob');
}
