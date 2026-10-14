/* The PDF maker (jsPDF and the pdf-*.js files, about half of everything the app downloads) is not needed to show the first
   screen, so it loads just after the app has opened, or the moment a PDF is asked for. Each builder below is a stand-in that
   waits for the real one to arrive, then runs it. */
const OMB_PDF_FILES = ['lib/jspdf.umd.min.js', 'pdf.js', 'pdf-leg.js', 'pdf-svc.js', 'pdf-ac.js', 'pdf-oil.js', 'pdf-comm.js', 'pdf-quote.js', 'pdf-warn.js', 'pdf-stmt.js', 'pdf-tools.js'];
let ombPdfP = null;
function ombPdfLoad() {
  if (ombPdfP) return ombPdfP;
  ombPdfP = new Promise((ok, no) => {
    let left = OMB_PDF_FILES.length;
    OMB_PDF_FILES.forEach(src => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = () => { if (!--left) ok(); }; s.onerror = () => { ombPdfP = null; no(new Error('Could not load ' + src + '. Check your signal and try again.')); }; document.body.appendChild(s); });
  });
  return ombPdfP;
}
['getLogo', 'getGasSafe', 'buildPdf', 'buildLegPdf', 'buildSvcPdf', 'buildAcPdf', 'buildOilPdf', 'buildTankPdf', 'buildOFormPdf', 'buildComPdf', 'buildQuotePdf', 'buildGeneralQuotePdf', 'buildWarnPdf', 'buildStatementPdf', 'buildToolsPdf'].forEach(n => {
  const stub = async (...a) => { await ombPdfLoad(); const f = window[n]; if (f === stub) throw new Error('PDF maker did not load'); return f(...a); };
  window[n] = stub;
});
window.addEventListener('load', () => setTimeout(() => { ombPdfLoad().catch(() => { }); }, 1200));
