/* Boiler quotation as a proposal: a cover with a big title and a drawn boiler, the price up front, what is included,
   the priced lines, what happens next, acceptance and terms. Own layout, not the certificate look. */
'use strict';

async function buildQuotePdf(rec, s) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 16, CW = W - 2 * M;
  const GOLD = [201, 162, 75], DARK = [14, 16, 18], INK = [30, 32, 36], GREY = [110, 114, 120], LINE = [222, 224, 228], SOFT = [246, 244, 239];
  const logo = await getLogo();
  const ukd = iso => (iso ? iso.split('-').reverse().join('/') : '');
  const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const T = QUO.totals(rec, s), R = QUO.rows(rec), money = QUO.money;
  const first = String(rec.customer.name || '').trim().split(/\s+/)[0] || 'there';
  let y = 0, SC = 1;   // SC scales the text below the cover picture: 1.12 normal, 1.32 large
  const BIG = rec.textSize === 'Large' ? 1.26 : 1.12;

  const txt = (t, x, yy, o = {}) => { doc.setFont('helvetica', o.b ? 'bold' : o.i ? 'italic' : 'normal'); doc.setFontSize((o.fs || 9) * (o.raw ? 1 : SC)); doc.setTextColor(...(o.c || INK)); doc.text(String(t), x, yy, o.align ? { align: o.align } : undefined); };
  const wrap = (t, w, fs, b) => { doc.setFont('helvetica', b ? 'bold' : 'normal'); doc.setFontSize(fs * SC); return String(t ?? '').split('\n').flatMap(l => doc.splitTextToSize(l || ' ', w)); };
  const para = (t, x, yy, w, fs, o = {}) => { const lines = wrap(t, w, fs, o.b), lh = fs * SC * 0.43; lines.forEach((l, i) => txt(l, x, yy + i * lh, { ...o, fs })); return lines.length * lh; };
  const label = (t, x, yy, c, align) => { doc.setCharSpace(0.6); txt(t, x, yy, { b: 1, fs: 6.8, c: c || GOLD, align, raw: 1 }); doc.setCharSpace(0); };
  const heading = (small, big) => { ensure(24); label(small, M, y); txt(big, M, y + 8, { b: 1, fs: 18, c: DARK, raw: 1 }); doc.setFillColor(...GOLD); doc.rect(M, y + 11, 12, 0.9, 'F'); y += 20; };
  function ensure(h) { if (y + h > H - 18) newPage(); }
  function newPage() {
    doc.addPage(); doc.setFillColor(...DARK); doc.rect(0, 0, W, 11, 'F'); doc.setFillColor(...GOLD); doc.rect(0, 11, W, 0.7, 'F');
    txt('YOUR NEW BOILER PROPOSAL', M, 7.2, { b: 1, fs: 7.5, c: [255, 255, 255], raw: 1 }); txt(rec.ref, W - M, 7.2, { fs: 7.5, c: GOLD, align: 'right', raw: 1 }); y = 24;
  }

  /* ---------- cover ---------- */
  doc.setFillColor(...DARK); doc.rect(0, 0, W, 128, 'F');
  doc.setDrawColor(40, 44, 48); doc.setLineWidth(0.5); [60, 84, 108].forEach(r => doc.circle(160, 70, r / 2.4, 'S'));
  doc.setFillColor(255, 255, 255); doc.roundedRect(M, 14, 20, 20, 2, 2, 'F'); doc.addImage(logo, 'PNG', M + 1, 15, 18, 18);
  txt(s.businessName || '', M + 25, 22, { b: 1, fs: 11, c: [255, 255, 255] });
  txt([s.phone, s.email].filter(Boolean).join('   '), M + 25, 28, { fs: 8, c: [190, 194, 200] });
  doc.setFillColor(...GOLD); doc.rect(M, 54, 12, 1.2, 'F');
  txt('YOUR NEW', M, 70, { b: 1, fs: 31, c: [255, 255, 255] }); txt('BOILER', M, 85, { b: 1, fs: 31, c: [255, 255, 255] }); txt('PROPOSAL', M, 100, { b: 1, fs: 31, c: GOLD });
  doc.setCharSpace(0.7); txt('PERSONAL QUOTATION  ·  PREPARED FOR YOUR HOME', M, 114, { fs: 7.2, c: [190, 194, 200] }); doc.setCharSpace(0);
  /* a drawn boiler */
  { const bx = 134, by = 36, bw = 50, bh = 66;
    doc.setFillColor(255, 255, 255); doc.roundedRect(bx, by, bw, bh, 4, 4, 'F');
    doc.setFillColor(238, 240, 243); doc.roundedRect(bx + 3, by + 3, bw - 6, bh - 6, 3, 3, 'F');
    doc.setFillColor(...DARK); doc.roundedRect(bx + 8, by + 9, bw - 16, 20, 2, 2, 'F');
    doc.setFillColor(...GOLD); doc.circle(bx + 17, by + 19, 4.2, 'F'); doc.setFillColor(...DARK); doc.circle(bx + 17, by + 19, 2.4, 'F');
    txt('21°', bx + 28, by + 21.5, { b: 1, fs: 11, c: [255, 255, 255] });
    doc.setFillColor(...GOLD); doc.circle(bx + 14, by + 42, 4.5, 'F'); doc.setFillColor(238, 240, 243); doc.circle(bx + 14, by + 42, 3, 'F'); doc.setDrawColor(...GOLD); doc.setLineWidth(0.7); doc.line(bx + 14, by + 42, bx + 16, by + 40);
    doc.setFillColor(210, 214, 220); doc.roundedRect(bx + 26, by + 39, 16, 3, 1.5, 1.5, 'F'); doc.roundedRect(bx + 26, by + 45, 16, 3, 1.5, 1.5, 'F');
    doc.setFillColor(...GOLD); doc.circle(bx + 40, by + 56, 2, 'F');
    doc.setFillColor(180, 186, 194); [10, 22, 34, 40].forEach(dx => doc.rect(bx + dx, by + bh, 3.4, 8, 'F')); }

  /* warranty badge on the cover: a selling point, so it is big. Dark disc, gold double ring, like a seal */
  if (String(rec.warranty || '').trim()) {
    const cx = 181, cy = 99, R0 = 21, mt = String(rec.warranty).match(/(\d+)/), CREAM = [246, 243, 238], BG = [17, 24, 31];
    doc.setFillColor(...BG); doc.circle(cx, cy, R0 + 0.8, 'F');
    doc.setDrawColor(...GOLD); doc.setLineWidth(1); doc.circle(cx, cy, R0, 'S');
    doc.setDrawColor(112, 100, 80); doc.setLineWidth(0.3); doc.circle(cx, cy, R0 - 3.2, 'S');
    const ctr = (t, yy, o) => { doc.setFont('helvetica', o.b ? 'bold' : 'normal'); doc.setFontSize(o.fs); doc.setCharSpace(0); const cs = o.cs || 0, w = doc.getTextWidth(String(t)) + cs * (String(t).length - 1); doc.setCharSpace(cs); txt(t, cx - w / 2, yy, o); doc.setCharSpace(0); };
    ctr('MANUFACTURER', cy - 8.4, { b: 1, fs: 5.4, c: GOLD, cs: 0.55 });
    if (mt) {
      ctr(mt[1], cy + 4, { b: 1, fs: 33, c: CREAM });
      ctr('YEAR', cy + 8.6, { b: 1, fs: 6.8, c: CREAM, cs: 0.9 });
    } else {
      wrap(rec.warranty, 24, 11, true).slice(0, 2).forEach((l, i) => ctr(l, cy - 1 + i * 5, { b: 1, fs: 11, c: CREAM }));
    }
    doc.setFont('times', 'italic'); doc.setFontSize(10); doc.setTextColor(...GOLD); doc.text('warranty', cx, cy + 14.2, { align: 'center' });
  }

  /* ---------- prepared for ---------- */
  SC = BIG; y = 142;
  const c3 = CW / 3;
  label('PREPARED FOR', M, y); label('QUOTE REFERENCE', M + c3 + 4, y); label('YOUR ADVISOR', M + 2 * c3 + 8, y);
  txt(rec.customer.name || '', M, y + 6.5, { b: 1, fs: 11, c: DARK });
  { const h = para(rec.jobAddress || '', M, y + 5 + 6.5 * SC, c3 - 4, 8.2, { c: GREY }); }
  txt(rec.ref, M + c3 + 4, y + 6.5, { b: 1, fs: 11, c: DARK });
  txt('Date: ' + ukd(rec.inspectionDate), M + c3 + 4, y + 5 + 6.5 * SC, { fs: 8.2, c: GREY }); txt('Valid until: ' + ukd(addDays(rec.inspectionDate, 30)), M + c3 + 4, y + 5 + 11 * SC, { fs: 8.2, c: GREY });
  txt(s.engineerName || s.businessName || '', M + 2 * c3 + 8, y + 6.5, { b: 1, fs: 11, c: DARK });
  if (s.phone) txt(s.phone, M + 2 * c3 + 8, y + 5 + 6.5 * SC, { fs: 8.2, c: GREY });
  doc.setDrawColor(...LINE); doc.setLineWidth(0.3); doc.line(M, y + 14 + 12 * SC, W - M, y + 14 + 12 * SC);
  y += 24 + 12 * SC;
  txt('Dear ' + first + ',', M, y, { b: 1, fs: 10, c: DARK }); y += 4 + 2 * SC;
  y += para('Thank you for the chance to quote for your new boiler. We have set out exactly what is included, what it costs and what happens next, so there are no surprises. If you have any questions at all, please just ask.', M, y, CW, 9.2, { c: INK }) + 8;

  /* the price */
  { const ph = 34 + (SC - 1) * 14; doc.setFillColor(...DARK); doc.roundedRect(M, y, CW, ph, 3, 3, 'F'); doc.setFillColor(...GOLD); doc.roundedRect(M, y, 2.4, ph, 1, 1, 'F');
    label('YOUR INVESTMENT', M + 9, y + 10);
    txt('Fully installed' + (T.rate ? ', including VAT' : ', no VAT charged'), M + 9, y + 12 + 6 * SC, { fs: 8.6, c: [210, 214, 220] });
    if (T.rate) txt(money(T.sub) + ' + VAT ' + money(T.vat), M + 9, y + 12 + 13 * SC, { fs: 8.6, c: [160, 166, 174] });
    txt(money(T.total), W - M - 8, y + ph / 2 + 4, { b: 1, fs: 30, c: [255, 255, 255], align: 'right', raw: 1 });
    y += ph + 10; }

  newPage();
  /* ---------- the boiler ---------- */
  heading('YOUR NEW BOILER', [QUO.makeText(rec), rec.model].filter(Boolean).join(' ') || 'Your boiler');
  { const facts = [['TYPE', rec.kind ? rec.kind + ' boiler' : '–'], ['OUTPUT', rec.kw ? rec.kw + ' kW' : '–'], ['WARRANTY', rec.warranty || '–'], ['FLUE', rec.flueDesc || '–']];
    const fw = CW / 4, fl = Math.max(...facts.map(([, v]) => wrap(v, fw - 7, 9, true).length)), fh = 12 + fl * 9 * SC * 0.43; doc.setFillColor(...SOFT); doc.roundedRect(M, y - 4, CW, fh, 2, 2, 'F');
    facts.forEach(([l, v], i) => { const x = M + i * fw + 5; label(l, x, y + 2); para(v, x, y + 8, fw - 7, 9, { b: 1, c: DARK }); });
    y += fh + 6; }

  /* ---------- the price lines ---------- */
  { const need = 20 + 8 + R.reduce((a, r) => a + wrap(r.d, W - M - 70 - M - 12, 9, true).length * 4 * SC + 4, 0) + 34; ensure(need); }
  heading('YOUR QUOTATION', 'Your investment');
  { const xq = W - M - 70, xp = W - M - 36, xt = W - M;
    label('ITEM', M, y); label('QTY', xq, y); label('PRICE', xt - 27, y, null, 'right'); label('TOTAL', xt, y, null, 'right'); doc.setDrawColor(...GOLD); doc.setLineWidth(0.5); doc.line(M, y + 2, W - M, y + 2); y += 8;
    R.forEach(r => { const lines = wrap(r.d, xq - M - 12, 9, true), rh = lines.length * 4 * SC + 4; ensure(rh + 2);
      lines.forEach((l, i) => txt(l, M, y + i * 4 * SC, { b: 1, fs: 9, c: DARK })); txt(String(r.q), xq, y, { fs: 9, c: GREY }); txt(money(r.p), xt - 27, y, { fs: 9, c: GREY, align: 'right' }); txt(money(r.q * r.p), xt, y, { b: 1, fs: 9, c: DARK, align: 'right' });
      doc.setDrawColor(...LINE); doc.setLineWidth(0.25); doc.line(M, y + rh - 3, W - M, y + rh - 3); y += rh; });
    ensure(30); y += 3;
    const row = (l, v, b) => { txt(l, xp - 14, y, { fs: 9, c: GREY, b }); txt(v, xt, y, { fs: 9, c: DARK, b, align: 'right' }); y += 5 + SC; };
    row('Subtotal', money(T.sub)); if (T.rate) row('VAT at ' + T.rate + '%', money(T.vat));
    doc.setFillColor(...DARK); doc.roundedRect(xp - 18, y - 4.5, xt - xp + 18, 6 + 4 * SC, 2, 2, 'F'); txt('TOTAL', xp - 14, y + 0.8 + SC, { b: 1, fs: 9, c: GOLD }); txt(money(T.total), xt - 3, y + 0.8 + SC, { b: 1, fs: 11, c: [255, 255, 255], align: 'right' }); y += 10 + 6 * SC; }

  if (String(rec.homeNotes || '').trim()) {
    const h = wrap(rec.homeNotes, CW - 14, 9).length * 3.9 * SC + 14; ensure(h + 4);
    doc.setFillColor(...SOFT); doc.roundedRect(M, y, CW, h, 2, 2, 'F'); doc.setFillColor(...GOLD); doc.rect(M, y, 2, h, 'F');
    label('SPECIFIC TO YOUR HOME', M + 8, y + 6.5); para(rec.homeNotes, M + 8, y + 12.5, CW - 14, 9, { c: INK }); y += h + 8;
  }

  /* ---------- what happens next ---------- */
  ensure(60); heading('THE PROCESS', 'What happens next');
  { const st = [['Accept your quote', 'Reply to the email to say you would like to go ahead.'], ['Book your date', 'We will call you to arrange an installation date that suits you.'], ['Installation day', 'Most boiler swaps take one to two days.'], ['Handover', 'We show you how it all works and register your warranty.']];
    const sw = CW / 4; doc.setDrawColor(...GOLD); doc.setLineWidth(0.5); doc.line(M + 6, y + 4, M + 3 * sw + 6, y + 4);
    st.forEach(([t, d], i) => { const x = M + i * sw; doc.setFillColor(...DARK); doc.circle(x + 6, y + 4, 5, 'F'); txt(String(i + 1), x + 6, y + 5.8, { b: 1, fs: 10, c: GOLD, align: 'center' }); txt(t, x, y + 15, { b: 1, fs: 8.6, c: DARK }); para(d, x, y + 14 + 4 * SC, sw - 5, 7.8, { c: GREY }); });
    y += 24 + 4 * SC + Math.max(...st.map(([, d]) => wrap(d, sw - 5, 7.8).length)) * 7.8 * SC * 0.43; }

  /* ---------- what is included ---------- */
  ensure(92);
  heading('YOUR INSTALLATION', 'What is included');
  const inc = String(s.quoteIncluded || QUO.DEFAULT_INCLUDED).split('\n').map(x => x.trim()).filter(Boolean).map(l => { const i = l.indexOf(':'); return i > 0 && i < 40 ? [l.slice(0, i), l.slice(i + 1).trim()] : ['', l]; });
  const colW = (CW - 8) / 2;
  for (let i = 0; i < inc.length; i += 2) {
    const pair = [inc[i], inc[i + 1]].filter(Boolean);
    const hs = pair.map(([t, d]) => (t ? 3.6 + SC : 0) + wrap(d, colW - 8, 8.2).length * 8.2 * SC * 0.43 + 3);
    const rh = Math.max(...hs) + 0.5; ensure(rh);
    pair.forEach(([t, d], k) => { const x = M + k * (colW + 8); doc.setFillColor(...GOLD); doc.rect(x, y - 2.6, 2.6, 2.6, 'F'); let yy = y;
      if (t) { txt(t, x + 6, yy, { b: 1, fs: 9, c: DARK }); yy += 3.6 + SC; } para(d, x + 6, yy, colW - 8, 8.2, { c: GREY }); });
    y += rh;
  }
  y += 4;

  /* ---------- acceptance ---------- */
  ensure(40); heading('ACCEPTANCE', 'Ready to go ahead?');
  { const al = wrap('To accept this quotation, simply reply to the email we sent it with. We will then call you to arrange a date for the installation.', CW - 14, 9).length, ah = 14 + al * 9 * SC * 0.43 + 4 * SC; doc.setDrawColor(...GOLD); doc.setLineWidth(0.6); doc.roundedRect(M, y - 2, CW, ah, 3, 3, 'S');
    para('To accept this quotation, simply reply to the email we sent it with. We will then call you to arrange a date for the installation.', M + 7, y + 5, CW - 14, 9, { c: GREY });
    txt(rec.ref + '  ·  ' + money(T.total) + (T.rate ? ' inc. VAT' : ''), M + 7, y + 6 + al * 9 * SC * 0.43 + 4 * SC, { b: 1, fs: 8.5, c: DARK });
    y += ah + 8; }

  /* ---------- terms ---------- */
  const terms = String(s.quoteTerms || QUO.DEFAULT_TERMS).split('\n').map(x => x.trim()).filter(Boolean);
  if (terms.length) { const hh = terms.reduce((a, t) => a + wrap(t, CW, 7.6).length * 7.6 * SC * 0.43 + 1.6, 0); ensure(hh + 12);
    label('TERMS OF THIS QUOTATION', M, y); y += 5; terms.forEach(t => { y += para(t, M, y, CW, 7.6, { c: GREY }) + 1.6; }); }

  /* footer on every page */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p); doc.setDrawColor(...LINE); doc.setLineWidth(0.25); doc.line(M, H - 11.5, W - M, H - 11.5);
    txt(s.businessName || '', M, H - 6, { fs: 7, c: GREY, raw: 1 }); txt([s.phone, s.email].filter(Boolean).join('  ·  '), W / 2, H - 6, { fs: 7, c: GREY, align: 'center', raw: 1 });
    txt(rec.ref + '  ·  Page ' + p + ' of ' + pages, W - M, H - 6, { fs: 7, c: GREY, align: 'right', raw: 1 });
  }
  doc.setProperties({ title: 'Quotation ' + rec.ref, subject: rec.jobAddress, author: s.businessName || 'Your business' });
  return doc.output('blob');
}
