/* Address helpers shared by the app and every PDF.
   An address is stored as plain text, one line per row, with the postcode as the last line. */
'use strict';
const PC_RE = /(?:^|[,\s])([A-Za-z]{1,2}\d[A-Za-z\d]?)\s*(\d[A-Za-z]{2})\s*,?\s*$/;
const cleanLine = l => String(l ?? '').replace(/\s*,(\s*,)+/g, ',').replace(/^[\s,]+|[\s,]+$/g, '');
const addrLines = s => String(s ?? '').split(/\r?\n/).map(cleanLine).filter(Boolean);
/* one tidy line for a PDF or email: "12 High Street, Sturton by Stow, LN1 2AB" – no doubled commas, no stray ones */
const addrLine = s => addrLines(s).join(', ');
const addrFirst = s => addrLines(s)[0] || '';
const fmtPostcode = p => { const m = String(p ?? '').trim().match(/^([A-Za-z]{1,2}\d[A-Za-z\d]?)\s*(\d[A-Za-z]{2})$/); return m ? (m[1] + ' ' + m[2]).toUpperCase() : String(p ?? '').toUpperCase(); };
/* split a stored address into the address lines and the postcode (the postcode is the last thing on the last line) */
function splitAddr(s) {
  const lines = String(s ?? '').split(/\r?\n/);
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  if (!lines.length) return { addr: '', pc: '' };
  const last = lines[lines.length - 1], m = last.match(PC_RE);
  if (!m) return { addr: lines.join('\n'), pc: '' };
  const rest = last.slice(0, m.index + (m[0].startsWith(m[1]) ? 0 : 1)).replace(/[\s,]+$/, '');
  const head = lines.slice(0, -1); if (rest) head.push(rest);
  return { addr: head.join('\n'), pc: fmtPostcode(m[1] + m[2]) };
}
function joinAddr(addr, pc) {
  const a = String(addr ?? '').replace(/[\s]+$/, ''), p = String(pc ?? '').trim();
  return p ? (a ? a + '\n' + p : p) : a;
}
