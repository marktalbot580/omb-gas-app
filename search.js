/* One search box for everything: customers, addresses, certificates, quotes and invoices. Opened from the magnifying glass at the top. */
(function () {
  const norm = s => String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ');
  const digits = s => String(s || '').replace(/\D/g, '');
  const e = s => (typeof esc === 'function' ? esc(s) : String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  const first = a => String(a || '').split('\n')[0];
  function hit(hay, q, qd) { const h = norm(hay); return q.split(' ').every(w => h.includes(w)) || h.replace(/\s/g, '').includes(q.replace(/\s/g, '')) || (qd.length >= 4 && digits(hay).includes(qd)); }
  window.omnSearch = function (raw) {
    const q = norm(raw).trim(), qd = digits(raw);
    if (q.length < 2) return { customers: [], jobs: [], invoices: [] };
    const cs = (typeof customers !== 'undefined' ? customers : []).filter(c => hit([c.name, c.phone, c.email, c.billing, ...(c.properties || [])].join(' '), q, qd)).slice(0, 8);
    const js = (typeof records !== 'undefined' ? records : []).filter(r => hit([r.ref, r.customer && r.customer.name, r.jobAddress, r.title].join(' '), q, qd)).sort((a, b) => String(b.inspectionDate || '').localeCompare(String(a.inspectionDate || ''))).slice(0, 8);
    const is = (typeof invoices !== 'undefined' ? invoices : []).filter(i => hit([i.number, i.customer && i.customer.name, i.jobAddress].join(' '), q, qd)).slice(0, 8);
    return { customers: cs, jobs: js, invoices: is };
  };
  function body(res) {
    const row = (act, id, t, s) => `<button type="button" class="item" data-act="${act}" data-id="${e(id)}"><div class="t">${e(t)}</div><div class="s">${e(s)}</div></button>`;
    const sec = (h, l) => (l.length ? `<div class="lab">${h}</div>` + l.join('') : '');
    const out = sec('Customers', res.customers.map(c => row('editCust', c.id, c.name || 'No name', [c.phone, first((c.properties || [])[0] || c.billing)].filter(Boolean).join(' · '))))
      + sec('Jobs and quotes', res.jobs.map(r => row('openRec', r.id, (r.customer && r.customer.name) || 'No customer', [r.ref, first(r.jobAddress)].filter(Boolean).join(' · '))))
      + sec('Invoices', res.invoices.map(i => row('openInv', i.id, (i.customer && i.customer.name) || 'No customer', [i.number, first(i.jobAddress)].filter(Boolean).join(' · '))));
    return out;
  }
  function open() {
    const old = document.getElementById('searchSheet'); if (old) old.remove();
    const d = document.createElement('div'); d.id = 'searchSheet'; d.className = 'sheetbg';
    d.innerHTML = `<div class="sheet" role="dialog" aria-label="Search" style="min-height:60vh"><div class="grab"></div><h2>Search</h2>
      <input class="search" id="srchIn" placeholder="Name, phone, address, certificate or invoice number" autocomplete="off" autocapitalize="none" enterkeyhint="search">
      <div id="srchOut"><p class="small muted">Start typing. This searches your customers, their addresses, every certificate and quote, and your invoices.</p></div>
      <button type="button" class="btn block" id="srchX" style="margin-top:10px">Close</button></div>`;
    document.body.appendChild(d);
    const inp = d.querySelector('#srchIn'), out = d.querySelector('#srchOut');
    inp.addEventListener('input', () => { const r = window.omnSearch(inp.value), h = body(r); out.innerHTML = inp.value.trim().length < 2 ? '<p class="small muted">Keep typing…</p>' : (h || '<div class="empty">Nothing found. Check the spelling, or try just part of the name or the postcode.</div>'); });
    d.addEventListener('click', ev => { if (ev.target === d || ev.target.id === 'srchX' || ev.target.closest('[data-act]')) setTimeout(() => d.remove(), 0); });
    setTimeout(() => inp.focus(), 50);
  }
  document.addEventListener('click', ev => { if (ev.target.closest && ev.target.closest('#searchBtn')) open(); });
})();
