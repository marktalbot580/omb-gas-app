/* Sample data: two made-up customers and a completed-looking example of every form, so you can see how the forms and PDFs look.
   Everything added is flagged "sample" so it can be removed in one tap. Sample customers are set to no reminders. */
'use strict';
const SAMPLE = (() => {
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAABkCAYAAAA8AQ3AAAAFDklEQVR4nO3dW3LbOBBGYTiVJWg5Xr6Xoz04Dy6WVQwBgWSjr+d7nCgjokX87oY4ntYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADw6vH4/La+BgB+fFhfQM8+rJ7PL7fXCkDHH+sLAIBZLgPraBRkPATgLrAIJgA9rgIre1hlXx+wmqvA2ns+vz5eD9ujbvjH4/N7u/aoawA8cBNYWb8VJKAAOS4CK2tY9RBiwDXmgTWzeaOOhZGuFYjAPLD2snZX+3URZr81oBaYZRpYmUfB17X11lV5o+7DqnItMM8ssM6GVdSx8FWmQL6j9/lF/VyhxySwst+Yo+6q+mj4br3V6oFzXJxh0XnUcBRGR589oYUe9cC6c24VYSycObuq3mVttjoQWmu9PrgcnWpgZT5kvyvLDdXz7rMntNZ4rWGG4FILrOiFmjHTXc3+eSaznz2hJWcUTpFranaGdXXDeh0Lz4RV73We1iNl9txq9GcZ67JSr177vROxriqBxShY09mwGr0m4ubS1guh118icPQLBSLVdnlgVQirK91V7/WRbp6Rq2E1em2W2qww01WN/nmU4FoaWKsK4HUslBJ9TXfDavR3otdG2kxX1XP0Gu/1VT3Dors6lqkuUmE1+rveN5WWs11VT6QxcVlgVRgFJUX7SXdEOqxG/46I9ZF0tasaiRBcSwJLI6w8jIUS3VVmkjUhtH6MRkCp9/B8viUeWF4WFlHkLkv7h1TvfTOTGgFneD3fWn6GlbXz0OquPNwk72heY8XQunOwfpe3MVE0sLTPrTyMhdKiBfzq8eRIpdDS7KpGvASX2KKtDtktzpE03jPClxYWYeXp/VfyElRHLOsu0mFl/el2hIP2Hx7CImun5TmsWrM931pyhqVZ2IxjYWu+D+A9hNXofT3V6iyrs6orLMbE24EVYXSRYt1dediInsJq9P4eanWGxuMKq2gG163AqhRWFrzV0/OGihxa3kfAWRrPb10uiLebd3X3Y9ldefnB4OU6RrzdlyNZgurIqntF7AwrQ5HRFyGsWovTaWUOq9bWjYmXiuPx5l3ZAVmfXe2vQfs6InUtG6/XnD2oeqTu39Mdlsewai3vt4U9Wmv0uvHf8dhpVQ2r1oxGQusP3IKH7srqvaOG1cZTaEV6XGEVifXeOsOqVGwPNJ/Nih5WG+vQivy4wip31j4dWF5HwVfSY6GX7kpbtg1mFVqVR8BVpgIrQlhJ8xpWq7usbGG10Qwty9+ukN1UYFFk36Q2Xtaw2miEFl3VWtMj4VZw74WXGAu9dlcbrWvyuPa7VoUWXZWOU4fuFN4P6dGw0tgvHVp0VXrM/s/PXnnvrlao+LiKVGjRVelKGVhVHiKV6LKyn1uN3AktHlewkTKwrsrQXZ0JLTbctdBiBLRDYAV3dZMQVr9mQ4uDdXtpA+vsWBi5uzo7GhJW/3sXWnRVPvy1vgDoIqz6ns+vj319CCpf0nZYZ0TurjYzXRZh9d5MPaiZndSBNTMWZgirnnejYbb1SunVhbMqe6kDq5rRZqr0YKiE/X/ZQb18SP8hjDqorN3VzJcMmdaLOtJ3WFUeIj2DsEJU6QOrJ2t31dp4PdnWilrKBlZFhBWiK3MDV3ye5vH4/N6eLcq8TtRBh5UY33Ahm9KBxUYGYikTWIQTEF+ZwNojwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABM+AecCD4/d5cBXwAAAABJRU5ErkJggg==';
  const today = () => new Date().toISOString().slice(0, 10);
  const CUSTS = [
    { name: 'Sample: Jane Smith', phone: '07700 900123', email: 'jane.sample@example.com', billing: '12 Sample Road, Nottingham, NG1 1AA', properties: ['12 Sample Road, Nottingham, NG1 1AA'] },
    { name: 'Sample: Acme Lettings Ltd', phone: '01158 960000', email: 'office.sample@example.com', billing: '3 Example Street, Nottingham, NG2 2BB', properties: ['3 Example Street, Nottingham, NG2 2BB', '8 Demo Close, Nottingham, NG3 3CC'] }
  ];

  /* a sensible value for a missing box, judged from its field name and label */
  function textFor(path, label, el) {
    const k = (path + ' ' + label).toLowerCase();
    if (el.tagName === 'TEXTAREA') return 'Sample note: all checks completed and the customer was happy.';
    if (el.type === 'date') return today();
    if (/serial/.test(k)) return 'SN123456789';
    if (/model/.test(k)) return 'Sample 30C';
    if (/\bgc\b|gas council/.test(k)) return '47-123-45';
    if (/email/.test(k)) return 'sample@example.com';
    if (/phone|tel/.test(k)) return '07700 900123';
    if (/ppm|\bco\b/.test(k) && !/co2|co₂/.test(k)) return '8';
    if (/co2|co₂/.test(k)) return '9.1';
    if (/ratio/.test(k)) return '0.0009';
    if (/cold/.test(k) && /temp/.test(k)) return '14';
    if (/temp|flow|return|cylinder|tank|outlet/.test(k)) return /return/.test(k) ? '50' : '60';
    if (/press|mbar/.test(k)) return /working/.test(k) ? '18' : '20';
    if (/rate|input|kw|heat/.test(k) && (el.inputMode === 'decimal' || el.inputMode === 'numeric')) return '2.4';
    if (el.inputMode === 'decimal' || el.inputMode === 'numeric' || el.type === 'number') return '5';
    return 'Sample';
  }

  /* fill a record by letting the form itself say what is missing, until it validates */
  function fill(rec) {
    const keep = { view: ui.view, step: ui.step, rec: ui.rec, job: ui.job };
    ui.rec = rec; ui.job = null; ui.view = 'form';
    let guard = 0;
    for (; guard < 80; guard++) {
      const errs = validate(rec).filter(e => e.path);
      if (!errs.length) break;
      const e = errs[0];
      if (/Sig$/.test(e.path)) { setP(rec, e.path, PNG); continue; }
      ui.step = e.step; render();
      const f = document.querySelector('[data-f="' + e.path + '"]');
      if (!f) { setP(rec, e.path, 'Sample'); continue; }
      const btns = [...f.querySelectorAll('button[data-k="' + e.path + '"]')];
      if (btns.length) {
        const good = btns.find(b => /^(yes|pass|satisfactory|safe|na|n\/a|none|not required|fitted)$/i.test(b.dataset.v)) || btns[0];
        setP(rec, e.path, good.dataset.v); continue;
      }
      const el = f.querySelector('input,textarea');
      setP(rec, e.path, el ? textFor(e.path, (f.querySelector('span') || {}).textContent || '', el) : 'Sample');
    }
    ui.view = keep.view; ui.step = keep.step; ui.rec = keep.rec; ui.job = keep.job;
    return guard < 80;
  }

  function add() {
    if (customers.some(c => c.sample)) return 0;
    const made = CUSTS.map(c => ({ ...c, id: uid(), sample: true, noRemind: true, updated: Date.now() }));
    made.forEach(c => customers.unshift(c)); saveCustomers();
    const plan = [[0, 'gas'], [0, 'service'], [1, 'legionella'], [1, 'aircon'], [1, 'warning']];
    let n = 0;
    plan.forEach(([ci, type]) => {
      const c = made[ci], r = newRecord(c, type);
      r.jobAddress = c.properties[0]; r.sample = true;
      if (!r.engineerSig) r.engineerSig = '';
      fill(r); persistRec(r); n++;
    });
    syncAll();
    return n;
  }

  function remove() {
    const ids = records.filter(r => r.sample).map(r => r.id), cids = customers.filter(c => c.sample).map(c => c.id);
    ids.forEach(id => { const r = records.find(x => x.id === id); if (r) PH.dropAll(PH.recIds(r)); });
    const invs = (typeof invoices !== 'undefined' ? invoices : []).filter(i => (i.recordIds || []).some(x => ids.includes(x)));
    records = records.filter(r => !r.sample); saveRecords(); ids.forEach(id => deleteRemote('record', id));
    customers = customers.filter(c => !c.sample); saveCustomers(); cids.forEach(id => deleteRemote('customer', id));
    return ids.length + cids.length + invs.length * 0;
  }
  const has = () => customers.some(c => c.sample) || records.some(r => r.sample);
  return { add, remove, has };
})();
