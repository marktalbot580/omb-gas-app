/* OMB Gas Service – accounts, cloud sync and subscription gate (Supabase + Stripe).
   Plain fetch calls, no library. When config.js has no Supabase details the app runs
   in local-only mode exactly as before. */
'use strict';
const CLOUD = (() => {
  const cfg = window.OMB_CONFIG || {};
  const on = !!(cfg.url && cfg.key);
  const KS = 'omb_session', KB = 'omb_sub', KM = 'omb_synced', KP = 'omb_pull', KU = 'omb_up', KT = 'omb_tombs';
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { } }
  };
  /* "Remember this device": ticked keeps the login on this phone; unticked keeps it only until the app/browser is closed */
  const ss = {
    get(k, d) { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) { } }
  };
  const KID = 'omb_uid';
  let remember = true, session = ls.get(KS, null);
  if (!session) { session = ss.get(KS, null); if (session) remember = false; }
  let sub = ls.get(KB, null), recovering = false;
  function saveSession() { if (remember) { ls.set(KS, session); ss.del(KS); } else { ss.set(KS, session); ls.del(KS); } }
  const st = { busy: false, state: '', msg: '' };

  /* ---------- low level ---------- */
  async function refresh() {
    if (!session || !session.refresh_token) return null;
    const r = await fetch(cfg.url + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: cfg.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: session.refresh_token }) });
    if (r.status === 400 || r.status === 401) { signOutLocal(); return null; }
    if (!r.ok) throw new Error('offline');
    setSession(await r.json()); return session;
  }
  function setSession(j) {
    session = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600), user: j.user ? { id: j.user.id, email: j.user.email } : (session && session.user) };
    saveSession();
  }
  async function fresh() {
    if (!session) return null;
    if (session.expires_at - 60 < Date.now() / 1000) { try { await refresh(); } catch (e) { /* offline: keep going with what we have */ } }
    return session;
  }
  async function req(path, o = {}) {
    const s = o.auth === false ? null : await fresh();
    const h = Object.assign({ apikey: cfg.key }, o.headers || {});
    if (s) h.Authorization = 'Bearer ' + s.access_token; else if (/^eyJ/.test(cfg.key)) h.Authorization = 'Bearer ' + cfg.key;   // new-style publishable keys go in apikey only
    let body = o.body;
    if (body !== undefined && typeof body !== 'string') { h['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
    const r = await fetch(cfg.url + path, { method: o.method || 'GET', headers: h, body });
    const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = null; }
    if (!r.ok) throw Object.assign(new Error((j && (j.msg || j.message || j.error_description || j.error)) || 'Error ' + r.status), { status: r.status });
    return j;
  }
  /* remove this phone's copy so the next person to log in never sees it */
  function wipeLocal() {
    try { Object.keys(localStorage).filter(k => /^omb_/.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) { }
    try { indexedDB.deleteDatabase('omb_photos'); } catch (e) { }
    setTimeout(() => location.reload(), 400);
  }
  function signOutLocal() { session = null; sub = null; [KS, KB, KM, KP, KU, KT].forEach(ls.del); ss.del(KS); }
  /* a different person logging in on a phone that still holds someone else's records: clear them first, so they never mix */
  function userChanged() {
    const id = session && session.user && session.user.id; if (!id) return false;
    const last = ls.get(KID, null);
    if (last && last !== id) {
      try { Object.keys(localStorage).filter(k => /^omb_/.test(k) && k !== KS && k !== KID).forEach(k => localStorage.removeItem(k)); } catch (e) { }
      try { indexedDB.deleteDatabase('omb_photos'); } catch (e) { }
      ls.set(KID, id); saveSession(); setTimeout(() => location.reload(), 400); return true;
    }
    ls.set(KID, id); return false;
  }

  /* ---------- sign in / up ---------- */
  async function signUp(email, password) {
    const back = location.origin + location.pathname.replace(/[^/]*$/, '') + 'welcome.html';
    const j = await req('/auth/v1/signup?redirect_to=' + encodeURIComponent(back), { method: 'POST', auth: false, body: { email, password } });
    if (j && j.access_token) { setSession(j); return 'in'; }
    return 'confirm';
  }
  async function signIn(email, password) {
    const j = await req('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email, password } });
    setSession(j);
  }
  const recover = email => req('/auth/v1/recover', { method: 'POST', auth: false, body: { email, redirect_to: location.origin + location.pathname } });
  const setPassword = password => req('/auth/v1/user', { method: 'PUT', body: { password } });
  async function signOut() { try { await req('/auth/v1/logout', { method: 'POST' }); } catch (e) { } signOutLocal(); }

  /* a link from the confirmation / reset email lands here with the session in the URL hash */
  function takeHash() {
    const h = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (h.get('error_code') || h.get('error')) {      // e.g. the confirm link was already used
      note = /expired|invalid/i.test(h.get('error_description') || h.get('error_code') || '') ? 'That link has already been used or has expired. If you have already confirmed your email, just log in below.' : '';
      history.replaceState(null, '', location.pathname + location.search); return;
    }
    if (!h.get('access_token')) return;
    session = { access_token: h.get('access_token'), refresh_token: h.get('refresh_token'), expires_at: +h.get('expires_at') || Math.floor(Date.now() / 1000) + (+h.get('expires_in') || 3600), user: null };
    recovering = h.get('type') === 'recovery';
    history.replaceState(null, '', location.pathname + location.search);
    fresh().then(() => req('/auth/v1/user')).then(u => { session.user = { id: u.id, email: u.email }; saveSession(); }).catch(() => { });
  }

  /* ---------- subscription ---------- */
  async function loadSub() {
    try {
      const rows = await req('/rest/v1/subscriptions?select=status,trial_end,period_end&limit=1');
      if (rows && rows[0]) { sub = Object.assign({}, rows[0], { checked: Date.now() }); ls.set(KB, sub); }
      return true;
    } catch (e) { return false; }
  }
  function access() {
    if (!sub) return { ok: false, why: 'unknown' };
    const now = Date.now();
    if (sub.status === 'trialing') { const end = Date.parse(sub.trial_end); return end > now ? { ok: true, trial: true, days: Math.max(0, Math.ceil((end - now) / 864e5)) } : { ok: false, why: 'trial' }; }
    if (sub.status === 'active' || sub.status === 'past_due') {
      const end = sub.period_end ? Date.parse(sub.period_end) + 3 * 864e5 : now + 864e5;
      return end > now ? { ok: true, paid: true, pastDue: sub.status === 'past_due' } : { ok: false, why: 'lapsed' };
    }
    return { ok: false, why: 'canceled' };
  }
  const locked = () => on && !!session && !!sub && !access().ok;   // signed in but subscription over: read-only
  const stale = () => !sub || Date.now() - (sub.checked || 0) > 14 * 864e5;   // must have talked to the server within two weeks
  async function fn(name) {
    const j = await req('/functions/v1/' + name, { method: 'POST', body: { returnUrl: location.origin + location.pathname } });
    if (j && j.url) location.href = j.url; else throw new Error((j && j.error) || 'Could not open that page');
  }

  /* ---------- sync ---------- */
  const synced = ls.get(KM, {}), up = new Set(ls.get(KU, [])), tombs = ls.get(KT, []);
  const saveMeta = () => { ls.set(KM, synced); ls.set(KU, [...up]); ls.set(KT, tombs); };
  const key = (k, id) => k + ':' + id;
  function del(kind, id) { if (!on || !session) return; tombs.push({ kind, id, updated: Date.now() }); saveMeta(); }
  const settingsDoc = () => { const { syncUrl, syncToken, ...rest } = settings; return rest; };

  function localDocs() {
    const out = [];
    customers.forEach(c => { const d = { ...c }; delete d._dirty; out.push({ kind: 'customer', id: c.id, data: d, updated: c.updated || 0 }); });
    records.forEach(r => { const d = { ...r }; delete d._dirty; out.push({ kind: 'record', id: r.id, data: d, updated: r.updated || 0 }); });
    invoices.forEach(i => out.push({ kind: 'invoice', id: i.id, data: i, updated: i.updated || 0 }));
    if (settings.updated) out.push({ kind: 'settings', id: 'main', data: settingsDoc(), updated: settings.updated });
    return out;
  }
  function putIn(arr, id, obj) { const i = arr.findIndex(x => x.id === id); if (i < 0) arr.push(obj); else arr[i] = obj; }
  function applyRemote(d) {
    const k = key(d.kind, d.id);
    const find = a => a.find(x => x.id === d.id);
    if (d.kind === 'settings') {
      if ((d.updated || 0) > (settings.updated || 0)) { Object.assign(settings, d.data, { syncUrl: '', syncToken: '' }); LS.set('omb_settings', settings); }
    } else if (d.deleted) {
      if (d.kind === 'customer') customers = customers.filter(x => x.id !== d.id);
      if (d.kind === 'record') records = records.filter(x => x.id !== d.id);
      if (d.kind === 'invoice') invoices = invoices.filter(x => x.id !== d.id);
    } else {
      const arr = d.kind === 'customer' ? customers : d.kind === 'record' ? records : invoices, l = find(arr);
      if (l && synced[k] !== (l.updated || 0) && (l.updated || 0) > (d.updated || 0)) return;   // this phone has a newer unsynced edit: it wins and gets pushed
      putIn(arr, d.id, d.kind === 'record' ? { ...d.data, _dirty: false } : d.kind === 'customer' ? { ...d.data, _dirty: false } : d.data);
    }
    synced[k] = d.updated || 0;
  }

  async function pull() {
    let since = ls.get(KP, ''), n = 0;
    for (;;) {
      const q = '/rest/v1/docs?select=kind,id,data,updated,deleted,server_at&order=server_at.asc&limit=500' + (since ? '&server_at=gt.' + encodeURIComponent(since) : '');
      const rows = await req(q); if (!rows || !rows.length) break;
      rows.forEach(applyRemote); n += rows.length; since = rows[rows.length - 1].server_at; ls.set(KP, since);
      if (rows.length < 500) break;
    }
    if (n) { saveCustomers(); saveRecords(); saveInvoices(); }
    return n;
  }
  async function push() {
    const uid = session.user.id, rows = [];
    localDocs().forEach(d => { if (synced[key(d.kind, d.id)] !== d.updated) rows.push({ user_id: uid, kind: d.kind, id: d.id, data: d.data, updated: d.updated, deleted: false }); });
    tombs.forEach(t => rows.push({ user_id: uid, kind: t.kind, id: t.id, data: {}, updated: t.updated, deleted: true }));
    for (let i = 0; i < rows.length; i += 100) {
      await req('/rest/v1/docs?on_conflict=user_id,kind,id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: rows.slice(i, i + 100) });
    }
    rows.forEach(r => { if (r.deleted) delete synced[key(r.kind, r.id)]; else synced[key(r.kind, r.id)] = r.updated; });
    tombs.length = 0; saveMeta();
    return rows.length;
  }
  const filePath = id => `/storage/v1/object/files/${session.user.id}/${id}.json`;
  async function pushFiles() {
    for (const r of records) for (const id of PH.allIds(r)) {
      if (up.has(id)) continue;
      const p = await PH.get(id); if (!p) continue;
      await req(filePath(id), { method: 'POST', headers: { 'x-upsert': 'true' }, body: JSON.stringify({ data: p.data, w: p.w, h: p.h }) });
      up.add(id); saveMeta();
    }
  }
  async function pullFiles() {
    let got = 0;
    for (const r of records) for (const id of PH.allIds(r)) {
      if (await PH.get(id)) { up.add(id); continue; }
      try {
        const s = await fresh(), res = await fetch(cfg.url + filePath(id).replace('/object/', '/object/authenticated/'), { headers: { apikey: cfg.key, Authorization: 'Bearer ' + s.access_token } });
        if (!res.ok) continue; const p = await res.json(); await PH.put(id, p); up.add(id); got++;
      } catch (e) { /* try again next sync */ }
    }
    saveMeta(); return got;
  }

  async function sync(manual) {
    if (!on || !session || st.busy) return;
    st.busy = true; st.state = 'busy'; paint();
    try {
      await loadSub();
      const a = access();
      gate();
      const pulled = await pull(), pushed = a.ok ? await push() : 0;
      if (a.ok) await pushFiles(); const files = await pullFiles();
      st.state = 'ok'; st.msg = 'Synced ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (pulled || files) { applyBrand(); if (ui.view === 'home' || ui.view === 'customers' || ui.view === 'invoices' || ui.view === 'settings') render(); }
      if (manual) toast(pushed || pulled ? 'Synced' : 'Everything is up to date');
    } catch (e) {
      console.warn(e); st.state = 'error'; st.msg = (navigator.onLine === false ? 'Offline – will sync when you are back online' : 'Sync failed: ' + e.message);
    }
    st.busy = false; paint();
  }
  function paint() {
    const d = document.querySelector('#syncDot'); if (d) d.className = 'dot ' + (!on || !session ? '' : st.state === 'busy' ? 'busy' : st.state === 'error' ? 'err' : 'ok');
    const m = document.querySelector('#syncMsg'); if (m) m.textContent = st.msg || '';
  }

  /* ---------- the sign-in / paywall screen ---------- */
  let mode = 'in', note = '', err = '', working = false;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function gateEl() { let g = document.getElementById('gate'); if (!g) { g = document.createElement('div'); g.id = 'gate'; document.body.appendChild(g); g.addEventListener('click', onClick); g.addEventListener('submit', onSubmit); } return g; }
  function hideGate() { const g = document.getElementById('gate'); if (g) g.remove(); document.body.classList.remove('gated'); }
  function shell(inner) {
    const name = (typeof settings !== 'undefined' && settings.businessName) || 'OMB Gas Service';
    return `<div class="gate-in"><div class="gate-brand"><img src="${E(typeof settings !== 'undefined' && settings.logo ? settings.logo : 'icon-192.png')}" alt=""><h1>${E(name === '' ? 'OMB Gas Service' : name)}</h1><p>Gas Safe, Legionella and air-con records</p></div>${inner}</div>`;
  }
  function authHtml() {
    if (recovering) return shell(`<form class="gate-card" data-f="newpw"><h2>Choose a new password</h2><label>New password<input name="pw" type="password" minlength="8" autocomplete="new-password" required></label><button class="btn gold block" ${working ? 'disabled' : ''}>Save password</button>${err ? `<p class="gate-err">${E(err)}</p>` : ''}</form>`);
    if (mode === 'forgot') return shell(`<form class="gate-card" data-f="forgot"><h2>Reset your password</h2><label>Email<input name="email" type="email" autocomplete="email" required></label><button class="btn gold block" ${working ? 'disabled' : ''}>Send reset link</button><button type="button" class="link" data-g="mode-in">Back to log in</button>${note ? `<p class="gate-ok">${E(note)}</p>` : ''}${err ? `<p class="gate-err">${E(err)}</p>` : ''}</form>`);
    const up = mode === 'up';
    return shell(`<div class="gate-tabs"><button class="${up ? '' : 'on'}" data-g="mode-in">Log in</button><button class="${up ? 'on' : ''}" data-g="mode-up">Free ${+cfg.trialDays || 14}-day trial</button></div>
      <form class="gate-card" data-f="${up ? 'signup' : 'signin'}">
        <label>Email<input name="email" type="email" autocomplete="email" required></label>
        <label>Password<input name="pw" type="password" minlength="${up ? 8 : 1}" autocomplete="${up ? 'new-password' : 'current-password'}" required></label>
        ${up ? `<p class="gate-small">At least 8 characters. No card needed to start your free trial; after ${+cfg.trialDays || 14} days it is ${E(cfg.price || '£15/month')}.</p>` : ''}
        <label class="rem"><input type="checkbox" name="rem" ${remember ? 'checked' : ''}> <span>Remember this device</span></label>
        <button class="btn gold block" ${working ? 'disabled' : ''}>${working ? 'Please wait…' : up ? 'Start free trial' : 'Log in'}</button>
        ${up ? '' : '<button type="button" class="link" data-g="mode-forgot">Forgot your password?</button>'}
        ${note ? `<p class="gate-ok">${E(note)}</p>` : ''}${err ? `<p class="gate-err">${E(err)}</p>` : ''}
      </form>`);
  }
  function payHtml() {
    const a = access(), paid = new URLSearchParams(location.search).get('paid');
    const msg = a.why === 'trial' ? `Your free trial has ended.` : a.why === 'unknown' ? `We could not check your subscription. Connect to the internet and try again.` : `Your subscription is not active.`;
    return shell(`<div class="gate-card"><h2>${paid && a.why !== 'unknown' ? 'Confirming your payment…' : 'Subscribe to keep going'}</h2><p>${E(msg)} Your records are safe and will be waiting for you.</p>
      <p class="gate-price"><b>${E(cfg.price || '£15/month')}</b><br><span>Cancel any time</span></p>
      <button class="btn gold block" data-g="subscribe" ${working ? 'disabled' : ''}>${working ? 'Opening secure checkout…' : 'Subscribe'}</button>
      <button class="btn block ghost" data-g="recheck">I have already paid – check again</button>
      <button type="button" class="link" data-g="logout">Log out (${E(session && session.user ? session.user.email : '')})</button>
      ${err ? `<p class="gate-err">${E(err)}</p>` : ''}</div>`);
  }
  function gate() {
    if (!on) return false;
    let html = '';
    if (!session || recovering) html = authHtml();
    else if (!sub || (stale() && navigator.onLine === false)) html = payHtml();   // never checked yet, or not checked for two weeks while offline
    const was = document.body.classList.contains('locked'), now = locked();
    document.body.classList.toggle('locked', now);
    if (was !== now && typeof render === 'function') try { render(); } catch (e) {}
    if (!html) { hideGate(); return false; }
    const g = gateEl(); document.body.classList.add('gated');
    const keep = g.querySelector('input:focus'), vals = {}; g.querySelectorAll('input').forEach(i => vals[i.name] = i.value);
    g.innerHTML = html; g.querySelectorAll('input').forEach(i => { if (vals[i.name] && i.type !== 'password') i.value = vals[i.name]; });
    return true;
  }
  async function enter() {      // signed in: check the subscription, then open the app
    await loadSub();
    if (gate()) return;
    sync();
  }
  async function onSubmit(e) {
    e.preventDefault(); const f = e.target.dataset.f, fd = new FormData(e.target), email = (fd.get('email') || '').trim(), pw = fd.get('pw') || '';
    err = ''; note = ''; working = true; gate();
    try {
      if (f === 'signin' || f === 'signup') remember = fd.get('rem') === 'on';
      if (f === 'signin') { await signIn(email, pw); if (userChanged()) return; }
      else if (f === 'signup') { const r = await signUp(email, pw); if (r === 'confirm') { mode = 'in'; note = 'Check your email and tap the link to confirm, then log in here.'; working = false; gate(); return; } if (userChanged()) return; }
      else if (f === 'forgot') { await recover(email); note = 'If that email has an account, a reset link is on its way.'; working = false; gate(); return; }
      else if (f === 'newpw') { await setPassword(pw); recovering = false; }
      working = false; await enter();
    } catch (x) { working = false; err = /invalid login/i.test(x.message) ? 'That email or password is not right.' : x.message; gate(); }
  }
  async function onClick(e) {
    const b = e.target.closest('[data-g]'); if (!b) return; const a = b.dataset.g; err = ''; note = '';
    if (a === 'mode-in') { mode = 'in'; gate(); } else if (a === 'mode-up') { mode = 'up'; gate(); } else if (a === 'mode-forgot') { mode = 'forgot'; gate(); }
    else if (a === 'logout') { if (!confirm('Log out? The copy on this phone will be removed. Your records stay safe in your account.')) return; await signOut(); wipeLocal(); }
    else if (a === 'recheck') { working = true; gate(); const ok = await loadSub(); working = false; if (!ok) err = 'Could not reach the server.'; else if (!access().ok) err = 'No active subscription found yet. If you have just paid, wait a minute and try again.'; if (!gate()) sync(); }
    else if (a === 'subscribe') { working = true; gate(); try { await fn('checkout'); } catch (x) { working = false; err = x.message; gate(); } }
  }

  function start() {
    if (!on) return;
    takeHash();
    if (session) { gate(); enter(); } else gate();
    const paid = new URLSearchParams(location.search).get('paid');
    if (paid && session) { history.replaceState(null, '', location.pathname); let n = 0; const t = setInterval(async () => { await loadSub(); n++; if (access().ok || n > 12) { clearInterval(t); gate(); if (access().ok) sync(); } }, 2500); }
    window.addEventListener('online', () => { if (session) enter(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && session && Date.now() - (sync.last || 0) > 6e4) { sync.last = Date.now(); sync(); } });
  }

  return {
    on, cfg, st, start, sync, del, paint, gate, access, fn, locked,
    email: () => (session && session.user ? session.user.email : ''),
    signedIn: () => !!session,
    sub: () => sub,
    signOut: async wipe => { await signOut(); if (wipe) wipeLocal(); gate(); }
  };
})();
