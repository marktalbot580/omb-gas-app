/* Boiler manual search. The manuals are NOT held in this app: the buttons open boilermanuals.com in a new tab,
   at the maker's page (and, when we know the GC number, jumping to that model's row). */
const MN_SITE = 'https://boilermanuals.com';
const MN_BRANDS = [['Alpha', 'alpha'], ['Ariston', 'ariston'], ['Baxi', 'baxi'], ['Biasi', 'biasi'], ['Ferroli', 'ferroli'], ['Glow-worm', 'glow-worm'], ['Grant', 'grant'], ['Ideal', 'ideal'], ['Intergas', 'intergas'], ['Main', 'main'], ['Potterton', 'potterton'], ['Remeha', 'remeha'], ['Saunier Duval', 'saunier-duval'], ['Sime', 'sime'], ['Vaillant', 'vaillant'], ['Viessmann', 'viessmann'], ['Vokera', 'vokera'], ['Warmflow', 'warmflow'], ['Worcester Bosch', 'worcester-bosch']];
const mnSlug = make => { const n = String(make || '').toLowerCase().replace(/[^a-z]/g, ''); const b = MN_BRANDS.find(x => x[0].toLowerCase().replace(/[^a-z]/g, '') === n); return b ? b[1] : ''; };
function mnState() { return ui.mn || (ui.mn = { make: '', q: '' }); }
function mnUrl(slug, gc) { return `${MN_SITE}/brands/${slug}.html${gc ? '#:~:text=' + encodeURIComponent(gc) : ''}`; }
function mnResults() {
  const s = mnState(), slug = mnSlug(s.make), q = s.q.trim().toLowerCase();
  if (!slug) return '<p class="muted small">Pick the make above.</p>';
  const list = (typeof BT !== 'undefined' ? BT.BUILTIN : []).filter(b => mnSlug(b.make) === slug && (!q || (b.name + ' ' + (b.t_gc || '')).toLowerCase().includes(q)));
  const btn = `<a class="btn gold block" style="text-align:center;text-decoration:none;margin-top:10px" href="${mnUrl(slug)}" target="_blank" rel="noopener">Open all ${esc(s.make)} manuals</a>`;
  const rows = list.slice(0, 25).map(b => `<a class="item" style="display:block;text-decoration:none;color:inherit" href="${mnUrl(slug, b.t_gc)}" target="_blank" rel="noopener"><b>${esc(b.name)}</b>${b.t_gc ? `<div class="small muted">GC ${esc(b.t_gc)}</div>` : ''}<div class="small">Find the manual</div></a>`).join('');
  return (rows ? `<div style="margin-top:10px">${rows}</div>${list.length > 25 ? '<p class="small muted">Showing the first 25. Type more of the model or the GC number.</p>' : ''}` : (q ? '<p class="muted small">No match in our list. Use the button below and search the page for your model.</p>' : '')) + btn;
}
function mnView() {
  const s = mnState();
  return `<h1>Boiler manuals</h1>
    <p class="small muted" style="margin-top:0">Pick the make, type the model or GC number, and tap to find the manual. Manuals come from <b>boilermanuals.com</b>, which is a separate website. It opens in a new tab and we don't host or check the manuals.</p>
    <div class="card">
      <div class="f"><span>Make</span><select data-mn="make"><option value="">Choose a make</option>${MN_BRANDS.map(b => `<option ${b[0] === s.make ? 'selected' : ''}>${esc(b[0])}</option>`).join('')}</select></div>
      <div class="f"><span>Model or GC number</span><input class="search" data-mn="q" type="search" value="${esc(s.q)}" placeholder="e.g. Greenstar 8000 or 47-800-56" autocomplete="off"></div>
      <div id="mnRes">${mnResults()}</div>
    </div>
    <p class="small muted">Manuals courtesy of boilermanuals.com.</p>`;
}
document.addEventListener('input', e => { const t = e.target; if (!t.dataset || !t.dataset.mn || ui.view !== 'tools') return; const s = mnState(); if (t.dataset.mn === 'q') { s.q = t.value; const el = document.getElementById('mnRes'); if (el) el.innerHTML = mnResults(); } });
document.addEventListener('change', e => { const t = e.target; if (!t.dataset || t.dataset.mn !== 'make' || ui.view !== 'tools') return; mnState().make = t.value; const el = document.getElementById('mnRes'); if (el) el.innerHTML = mnResults(); });
