/* Calculation report: the results of the Tools calculators on one tidy PDF, with the engineer's details at the top.
   sections = [{ title, items: [{ t: 'kv', rows: [[label, value]] } | { t: 'table', head: [], rows: [[]], w: [], a: [] } | { t: 'note', text }] }]
   prop = { name, addr }, s = settings */
'use strict';
async function buildToolsPdf(sections, prop, s) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 12, CW = W - 2 * M, BOTTOM = H - 18;
  const GOLD = [201, 162, 75], GOLD_T = [230, 199, 120], GOLD_L = [246, 242, 233], INK = [22, 22, 22], GREY = [105, 105, 105], LINE = [200, 200, 200];
  const logo = await getLogo().catch(() => null);
  const cl = t => String(t ?? '').replace(/³/g, '3').replace(/²/g, '2').replace(/Δ/g, 'd').replace(/[\u2018\u2019]/g, "'");
  const ukd = iso => (iso ? iso.split('-').reverse().join('/') : '');
  const txt = (t, x, y, fs, style, col, align) => { doc.setFont('helvetica', style || 'normal'); doc.setFontSize(fs); doc.setTextColor(...(col || INK)); doc.text(cl(t), x, y, align ? { align } : undefined); };
  const wrap = (t, w, fs, style) => { doc.setFont('helvetica', style || 'normal'); doc.setFontSize(fs); return cl(t).split('\n').flatMap(l => doc.splitTextToSize(l || ' ', w)); };
  let y = 0;

  /* header */
  doc.setFillColor(12, 12, 12); doc.rect(0, 0, W, 26, 'F'); doc.setFillColor(...GOLD); doc.rect(0, 26, W, 0.7, 'F');
  let tx = M; if (logo) { try { doc.addImage(logo, 'PNG', M, 3.5, 19, 19); tx = 36; } catch (e) { /* no logo */ } }
  txt('CALCULATION REPORT', tx, 13.5, 20, 'bold', [255, 255, 255]);
  txt(s.businessName || 'Your business', tx, 19.5, 8.5, 'normal', [215, 215, 215]);
  const reg = [s.gasSafeReg ? 'Gas Safe Register No: ' + s.gasSafeReg : '', s.phone || '', s.email || ''].filter(Boolean).join('   ·   ');
  if (reg) txt(reg, tx, 23.6, 7, 'normal', GOLD_T);
  y = 34;
  const meta = [['Customer', prop.name || ''], ['Property', String(prop.addr || '').replace(/\s*\n\s*/g, ', ')], ['Phone', prop.phone || ''], ['Email', prop.email || ''], ['Date', ukd(todayISO())]].filter(m => m[1]);
  meta.forEach(([a, b]) => { txt(a, M, y, 8.6, 'normal', GREY); wrap(b, CW - 30, 9.4, 'bold').forEach((ln, i) => { txt(ln, M + 28, y + i * 4.4, 9.4, 'bold'); }); y += Math.max(1, wrap(b, CW - 30, 9.4, 'bold').length) * 4.4 + 0.8; });
  y += 3;

  const need = h => { if (y + h > BOTTOM) { doc.addPage(); y = M + 2; } };
  sections.forEach(sec => {
    need(24);
    doc.setFillColor(...GOLD_L); doc.rect(M, y, CW, 7.4, 'F'); doc.setFillColor(...GOLD); doc.rect(M, y, 1.4, 7.4, 'F');
    txt(sec.title, M + 4, y + 5.1, 10.5, 'bold'); y += 11;
    sec.items.forEach(it => {
      if (it.t === 'kv') {
        it.rows.forEach(([a, b]) => {
          const lines = wrap(b, CW * 0.55, 9, it.bold && it.bold.includes(a) ? 'bold' : 'normal'), h = Math.max(1, lines.length) * 4.2 + 1.2;
          need(h); txt(a, M + 1, y + 3.4, 8.8, 'normal', GREY);
          lines.forEach((ln, i) => txt(ln, M + CW, y + 3.4 + i * 4.2, 9, it.bold && it.bold.includes(a) ? 'bold' : 'normal', INK, 'right'));
          doc.setDrawColor(...LINE); doc.setLineWidth(0.15); doc.line(M, y + h - 0.2, M + CW, y + h - 0.2); y += h;
        });
        y += 2;
      } else if (it.t === 'table') {
        const tw = it.w.reduce((p, c) => p + c, 0), k = CW / tw, w = it.w.map(c => c * k), xs = w.map((_, i) => M + w.slice(0, i).reduce((p, c) => p + c, 0));
        const cell = (c, i, yy, fs, st) => { const right = (it.a || [])[i] === 'r'; txt(c, right ? xs[i] + w[i] - 1 : xs[i] + 1, yy, fs, st, INK, right ? 'right' : 'left'); };
        const head = () => { need(14); it.head.forEach((c, i) => cell(c, i, y + 3.6, 7.8, 'bold')); y += 5; doc.setDrawColor(...INK); doc.setLineWidth(0.35); doc.line(M, y, M + CW, y); y += 0.8; };
        head();
        it.rows.forEach(r => {
          const cells = r.map((c, i) => wrap(c, w[i] - 2, 8.6, 'normal')), n = Math.max(...cells.map(c => c.length)), h = n * 4 + 1.6;
          if (y + h > BOTTOM) { doc.addPage(); y = M + 2; head(); }
          cells.forEach((c, i) => c.forEach((ln, j) => cell(ln, i, y + 3.5 + j * 4, 8.6, 'normal')));
          doc.setDrawColor(...LINE); doc.setLineWidth(0.15); doc.line(M, y + h - 0.2, M + CW, y + h - 0.2); y += h;
        });
        y += 3;
      } else if (it.t === 'note') {
        const lines = wrap(it.text, CW, 8.2, 'normal'); need(lines.length * 3.8 + 2);
        lines.forEach((ln, i) => txt(ln, M, y + 3 + i * 3.8, 8.2, 'normal', GREY)); y += lines.length * 3.8 + 3;
      }
    });
    y += 3;
  });

  /* footer on every page */
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p); doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.line(M, H - 14, W - M, H - 14);
    txt('Guide only. Check against the relevant standards (BS 6891, IGEM/UP/1B, manufacturer instructions) before relying on it. Not a certificate.', M, H - 10, 7, 'normal', GREY);
    txt(`Page ${p} of ${n}`, W - M, H - 10, 7, 'normal', GREY, 'right');
  }
  return doc.output('blob');
}
