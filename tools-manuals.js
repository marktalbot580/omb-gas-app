/* Boiler manual search. The manuals are NOT held in this app: the buttons open boilermanuals.com in a new tab,
   at the maker's page (and, when we know the GC number, jumping to that model's row). */
const MN_SITE = 'https://boilermanuals.com';
const MN_BRANDS = [['Alpha', 'alpha'], ['Ariston', 'ariston'], ['Baxi', 'baxi'], ['Biasi', 'biasi'], ['Ferroli', 'ferroli'], ['Glow-worm', 'glow-worm'], ['Grant', 'grant'], ['Ideal', 'ideal'], ['Intergas', 'intergas'], ['Main', 'main'], ['Potterton', 'potterton'], ['Remeha', 'remeha'], ['Saunier Duval', 'saunier-duval'], ['Sime', 'sime'], ['Vaillant', 'vaillant'], ['Viessmann', 'viessmann'], ['Vokera', 'vokera'], ['Warmflow', 'warmflow'], ['Worcester Bosch', 'worcester-bosch']];
const mnSlug = make => { const n = String(make || '').toLowerCase().replace(/[^a-z]/g, ''); const b = MN_BRANDS.find(x => x[0].toLowerCase().replace(/[^a-z]/g, '') === n); return b ? b[1] : ''; };
function mnState() { return ui.mn || (ui.mn = { make: '', q: '' }); }
function mnUrl(slug, gc) { return `${MN_SITE}/brands/${slug}.html${gc ? '#:~:text=' + encodeURIComponent(gc) : ''}`; }
/* every boiler we know about, from both lists, so a GC number or model can be searched without picking the make first */
function mnAll() {
  const out = [], seen = new Set();
  const add = (make, name, gc) => { const k = make + '|' + name + '|' + gc; if (!seen.has(k)) { seen.add(k); out.push({ make, name, t_gc: gc || '' }); } };
  (typeof BT !== 'undefined' ? BT.BUILTIN : []).forEach(b => add(b.make, b.name, b.t_gc));
  (typeof BI_LIST !== 'undefined' ? BI_LIST : []).forEach(b => add(b.make, ((b.range || '') + ' ' + (b.model || '')).trim(), b.gc));
  return out;
}
function mnResults() {
  const s = mnState(), slug = mnSlug(s.make), q = s.q.trim().toLowerCase();
  if (!slug) {
    if (!q) return '<p class="muted small">Pick the make above, or type a model or GC number to search every make.</p>';
    const hits = mnAll().filter(b => mnSlug(b.make) && (b.make + ' ' + b.name + ' ' + b.t_gc).toLowerCase().includes(q));
    const rows = hits.slice(0, 25).map(b => `<a class="item" style="display:block;text-decoration:none;color:inherit" href="${mnUrl(mnSlug(b.make))}" data-gc="${esc(b.t_gc)}" target="_blank" rel="noopener"><b>${esc(b.make)} ${esc(b.name)}</b>${b.t_gc ? `<div class="small muted">GC ${esc(b.t_gc)}</div>` : ''}<div class="small">${b.t_gc ? 'Tap to copy the GC number and open the ' + esc(b.make) + ' manuals' : 'Tap to open the ' + esc(b.make) + ' manuals'}</div></a>`).join('');
    return rows ? `<div style="margin-top:10px">${rows}</div>${hits.length > 25 ? '<p class="small muted">Showing the first 25. Type more, or pick the make.</p>' : ''}` : `<p class="muted small">We don't have that one in our list. Tap the make to open its manuals, then paste or search for it there.</p><div class="chips">${MN_BRANDS.map(b => `<button type="button" class="chip" style="padding:10px 14px" data-mn-make="${esc(b[0])}">${esc(b[0])}</button>`).join('')}</div>`;
  }
  const list = mnAll().filter(b => mnSlug(b.make) === slug && (!q || (b.name + ' ' + (b.t_gc || '')).toLowerCase().includes(q)));
  const btn = `<a class="btn gold block" style="text-align:center;text-decoration:none;margin-top:10px" href="${mnUrl(slug)}" target="_blank" rel="noopener">Open all ${esc(s.make)} manuals</a>`;
  const rows = list.slice(0, 25).map(b => `<a class="item" style="display:block;text-decoration:none;color:inherit" href="${MN_SITE}" data-gc="${esc(b.t_gc || '')}" target="_blank" rel="noopener"><b>${esc(b.name)}</b>${b.t_gc ? `<div class="small muted">GC ${esc(b.t_gc)}</div>` : ''}<div class="small">${b.t_gc ? 'Tap to copy the GC number and open the site' : 'Tap to open the site'}</div></a>`).join('');
  return (rows ? `<div style="margin-top:10px">${rows}</div>${list.length > 25 ? '<p class="small muted">Showing the first 25. Type more of the model or the GC number.</p>' : ''}` : (q ? '<p class="muted small">No match in our list. Use the button below and search the page for your model.</p>' : '')) + btn;
}
function mnView() {
  const s = mnState();
  return `<h1>Boiler manuals</h1>
    <p class="small muted" style="margin-top:0">Pick the make and tap your boiler. The GC number is copied, so just paste it into the search bar on the website. Manuals come from <b>boilermanuals.com</b>, which is a separate website. It opens in a new tab and we don't host or check the manuals.</p>
    <div class="card">
      <div class="f"><span>Make</span><select data-mn="make"><option value="">Choose a make</option>${MN_BRANDS.map(b => `<option ${b[0] === s.make ? 'selected' : ''}>${esc(b[0])}</option>`).join('')}</select></div>
      <div class="f"><span>Model or GC number</span><input class="search" data-mn="q" type="search" value="${esc(s.q)}" placeholder="e.g. Greenstar 8000 or 47-800-56" autocomplete="off" enterkeyhint="search"></div>
      <button type="button" class="btn gold block" data-act="mnSearch">Search</button>
      <div id="mnRes">${mnResults()}</div>
    </div>
    <p class="small muted">Manuals courtesy of boilermanuals.com.</p>`;
}
document.addEventListener('input', e => { const t = e.target; if (!t.dataset || !t.dataset.mn || ui.view !== 'tools') return; const s = mnState(); if (t.dataset.mn === 'q') { s.q = t.value; const el = document.getElementById('mnRes'); if (el) el.innerHTML = mnResults(); } });
document.addEventListener('change', e => { const t = e.target; if (!t.dataset || t.dataset.mn !== 'make' || ui.view !== 'tools') return; mnState().make = t.value; const el = document.getElementById('mnRes'); if (el) el.innerHTML = mnResults(); });
function mnCopy(txt) {   // copy while the tap is still happening; the old way gets refused once the new tab takes over
  let ok = false;
  try { const t = document.createElement('textarea'); t.value = txt; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px'; document.body.appendChild(t); t.focus(); t.select(); t.setSelectionRange(0, txt.length); ok = document.execCommand('copy'); t.remove(); } catch (x) { }
  try { if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => { }); } catch (x) { }
  return ok;
}
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('#mnRes a[data-gc]'); if (!a || !a.dataset.gc) return;
  e.preventDefault();
  const gc = a.dataset.gc, ok = mnCopy(gc);
  toast(ok ? 'Copied ' + gc + '. Paste it into the search bar.' : 'GC number is ' + gc + '. Copy it from here.');
  setTimeout(() => { window.open(a.href, '_blank', 'noopener'); }, ok ? 600 : 2500);
});

document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-act="mnSearch"]'); if (!b) return; const i = document.querySelector('input[data-mn=q]'); if (i) { mnState().q = i.value; i.blur(); } const el = document.getElementById('mnRes'); if (el) { el.innerHTML = mnResults(); el.scrollIntoView({ block: 'nearest' }); } });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.mn === 'q') { e.preventDefault(); const b = document.querySelector('[data-act=mnSearch]'); if (b) b.click(); } });

document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-mn-make]'); if (!b) return; const sel = document.querySelector('select[data-mn=make]'); mnState().make = b.dataset.mnMake; if (sel) sel.value = b.dataset.mnMake; const el = document.getElementById('mnRes'); if (el) el.innerHTML = mnResults(); });
