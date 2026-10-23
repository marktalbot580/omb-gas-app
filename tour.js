/* First-time walkthrough: a short, skippable tour shown once to a brand-new account, and again whenever it is asked for from Settings. */
(function () {
  const STEPS = [
    ['Welcome', 'This one-minute tour shows you where things are. You can skip it at any time and bring it back from Settings.'],
    ['Start a job', 'On Today, tap New to start a gas safety check, boiler service, Legionella record, quote and more. Tick several at one property and each one gets its own PDF.'],
    ['Your day', 'Calendar is where you book jobs in. Tick Auto schedule and the app puts that day in order by drive time. Today shows your next job with Call, Navigate and Start the forms.'],
    ['Customers', 'Customers are saved for you as you complete forms, so you never type them twice. One customer can have many property addresses, which suits a letting agent.'],
    ['Quotes and invoices', 'Sales holds your quotes and invoices. Set your prices once at the top of Settings, then Money, and they are used on both.'],
    ['Search and settings', 'The magnifying glass at the top finds any customer, address, certificate or invoice. Start in Settings, then Business: add your business name, Gas Safe number and signature before your first job.']
  ];
  let i = 0, box = null;
  const done = () => { try { settings.tourDone = '1'; if (typeof saveSettings === 'function') saveSettings(); } catch (e) { } };
  function close(mark) { if (box) box.remove(); box = null; if (mark) done(); }
  function show() {
    if (!box) { box = document.createElement('div'); box.id = 'tourBox'; box.className = 'sheetbg'; document.body.appendChild(box); }
    const s = STEPS[i], last = i === STEPS.length - 1;
    box.innerHTML = `<div class="sheet" role="dialog" aria-label="Tour"><div class="grab"></div>
      <div class="small muted" style="margin-bottom:4px">${i + 1} of ${STEPS.length}</div>
      <h2 style="margin-top:0">${s[0]}</h2><p style="font-size:17px;line-height:1.5;margin:0 0 16px">${s[1]}</p>
      <button type="button" class="btn gold block" data-tour="next">${last ? 'Done' : 'Next'}</button>
      <div class="instrow" style="margin-top:8px">${i ? '<button type="button" class="btn ghost" data-tour="back">Back</button>' : ''}<button type="button" class="btn ghost" data-tour="skip">${last ? 'Close' : 'Skip the tour'}</button></div></div>`;
  }
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-tour],[data-act=tour]'); if (!t) return;
    if (t.dataset.act === 'tour') { i = 0; show(); return; }
    const k = t.dataset.tour;
    if (k === 'next') { if (i >= STEPS.length - 1) close(true); else { i++; show(); } }
    else if (k === 'back') { i = Math.max(0, i - 1); show(); }
    else if (k === 'skip') close(true);
  });
  /* once, for an account with no customers, records or invoices yet */
  let tries = 0;
  const timer = setInterval(() => {
    if (++tries > 40) { clearInterval(timer); return; }
    try {
      if (typeof settings === 'undefined' || typeof ui === 'undefined' || document.body.classList.contains('gated')) return;
      if (settings.tourDone) { clearInterval(timer); return; }
      if (ui.view !== 'home') return;
      clearInterval(timer);
      if (customers.length || records.length || invoices.length) { done(); return; }
      i = 0; show();
    } catch (e) { }
  }, 1500);
})();
