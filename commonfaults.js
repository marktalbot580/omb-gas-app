/* Saved defect wording: tap a wording under a defect box instead of typing it again. Saving a wording also keeps its classification
   and the action taken, so one tap can fill all three. The list lives in Settings (settings.commonFaults) and starts with a few usual ones. */
'use strict';
const CF = (() => {
  const DEFAULTS = [
    { t: 'No carbon monoxide alarm fitted', c: 'NCS', a: 'Customer advised to fit a CO alarm' },
    { t: 'Ventilation inadequate for the appliance', c: 'AR', a: 'Customer advised' },
    { t: 'Flue terminal obstructed or incorrectly positioned', c: 'AR', a: 'Customer advised' },
    { t: 'Gas supply pipework not bonded', c: 'NCS', a: 'Customer advised' }
  ];
  const list = () => Array.isArray(settings.commonFaults) ? settings.commonFaults : DEFAULTS;
  const keep = arr => { settings.commonFaults = arr; settings.updated = Date.now(); saveSettings(); };
  const base = p => (/\.text$/.test(p) && typeOf(ui.rec) === 'gas' ? p.slice(0, -5) : '');   // classification and action are only saved and filled for gas safety records (other forms use different scales)
  const short = s => (s.length > 34 ? s.slice(0, 32) + '…' : s);
  function chips(path) {
    const cur = String(getP(ui.rec, path) || '').trim(), L = list(), have = L.some(x => x.t.toLowerCase() === cur.toLowerCase());
    if (!L.length && !cur) return '';
    return `<div class="chips" style="margin:-4px 0 12px">${L.map((x, i) => `<button type="button" class="chip ${x.t === cur ? 'on' : ''}" data-act="cfUse" data-path="${esc(path)}" data-i="${i}">${esc(short(x.t))}</button>`).join('')}${cur && !have ? `<button type="button" class="chip" style="border-style:dashed" data-act="cfSave" data-path="${esc(path)}">+ Save this wording</button>` : ''}</div>`;
  }
  function settingsHtml() {
    const L = list();
    return `<p class="small muted" style="margin-top:0">These appear as buttons under each defect box, so you can fill in a usual defect with one tap. Tap “+ Save this wording” under a defect to add one, or add it here.</p>
      ${L.map((x, i) => `<div class="row sp" style="gap:8px;margin-bottom:8px;align-items:flex-start"><div style="min-width:0"><b>${esc(x.t)}</b>${x.c || x.a ? `<div class="small muted">${esc([x.c, x.a].filter(Boolean).join(' · '))}</div>` : ''}</div><button type="button" class="btn ghost" style="min-height:36px;padding:0 10px" data-act="cfRm" data-i="${i}">Remove</button></div>`).join('') || '<p class="small muted">Nothing saved yet.</p>'}
      <label class="f"><span>Add a wording</span><input id="cfNew" type="text" placeholder="e.g. Gas meter box damaged"></label>
      <button type="button" class="btn block" data-act="cfAdd">Add to the list</button>
      ${settings.commonFaults ? '<button type="button" class="btn block ghost" style="margin-top:8px" data-act="cfReset">Put the usual ones back</button>' : ''}`;
  }
  const again = () => { const y = window.scrollY; render(); window.scrollTo(0, y); };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b || !/^cf[A-Z]/.test(b.dataset.act)) return;
    e.stopImmediatePropagation();
    const a = b.dataset.act, r = ui.rec;
    if (CLOUD.locked() && a !== 'cfReset') { lockedMsg(); return; }
    if (a === 'cfUse' && r) {
      const x = list()[+b.dataset.i]; if (!x) return; const p = b.dataset.path, bs = base(p);
      setP(r, p, x.t);
      if (bs) { if (x.c && !getP(r, bs + '.cls')) setP(r, bs + '.cls', x.c); if (x.a && !getP(r, bs + '.action')) setP(r, bs + '.action', x.a); }
      ui.pdf = null; persistRec(r); again();
    } else if (a === 'cfSave' && r) {
      const p = b.dataset.path, bs = base(p), t = String(getP(r, p) || '').trim(); if (!t) return;
      keep([...list(), { t, c: bs ? getP(r, bs + '.cls') || '' : '', a: bs ? getP(r, bs + '.action') || '' : '' }]); toast('Wording saved'); again();
    } else if (a === 'cfRm') { const L = [...list()]; L.splice(+b.dataset.i, 1); keep(L); again(); }
    else if (a === 'cfAdd') { const i = document.getElementById('cfNew'), t = i ? i.value.trim() : ''; if (!t) { toast('Type the wording first'); return; } keep([...list(), { t, c: '', a: '' }]); again(); }
    else if (a === 'cfReset') { delete settings.commonFaults; settings.updated = Date.now(); saveSettings(); again(); }
  }, true);
  return { list, chips, settingsHtml, DEFAULTS };
})();
