// Annual-check reminder emails.
//   POST ?action=run          daily (called by pg_cron): emails customers whose gas check / boiler service is coming up
//   POST ?action=test         signed-in engineer: sends a sample reminder to their own sign-in email
//   POST ?action=unsub&t=...  one-tap unsubscribe (from the email link or the mail app's own Unsubscribe button)
// Deploy with "Verify JWT" OFF (it checks the sign-in itself for "test"). Secret needed: RESEND_API_KEY.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FROM_ADDR = 'reminders@ombgas.com';
const SELF = 'https://klgscnjbjglwrdqucufg.supabase.co/functions/v1/reminders';
const SITE = 'https://ombgas.com';
const DEFAULT_TEXT = "Hi {name}, it's {business}. The annual {what} at {address} is due on {date}. Reply to let me know a good time to book it in. Thanks";
const PER_ENGINEER_DAILY = 40;
const WHAT: Record<string, string> = { gas: 'gas safety check', service: 'boiler service' };
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const okEmail = (s: unknown) => /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]{2,}$/.test(String(s ?? '').trim());
const ukToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
const dayDiff = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 864e5);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
const addrLine = (s: unknown) => String(s ?? '').split(/\r?\n/).map((x) => x.trim().replace(/^,+|,+$/g, '').trim()).filter(Boolean).join(', ');
const safeName = (s: unknown) => String(s ?? '').replace(/["<>\r\n\\]/g, '').trim().slice(0, 60);

function fill(tpl: string, v: { name: string; business: string; what: string; address: string; date: string }) {
  return tpl.replace(/\{name\}/g, v.name || 'there').replace(/\{business\}/g, v.business || 'your engineer')
    .replace(/\{what\}/g, v.what).replace(/\{address\}/g, v.address || 'your property').replace(/\{date\}/g, v.date);
}

function buildEmail(o: { settings: any; name: string; what: string; address: string; due: string; token: string; stage: string }) {
  const s = o.settings || {};
  const business = safeName(s.businessName) || 'Your gas engineer';
  const msg = fill(String(s.remText || '').trim() || DEFAULT_TEXT, { name: o.name, business, what: o.what, address: o.address, date: longDate(o.due) });
  const subject = o.stage === 'e14' ? `Reminder: your ${o.what} is due ${longDate(o.due)}` : `Your ${o.what} is coming up`;
  const unsub = `${SITE}/unsubscribe.html?t=${o.token}`;
  const contact = [s.phone && `Tel: ${s.phone}`, s.email && `Email: ${s.email}`].filter(Boolean).join('   ');
  const foot = `Sent by ${business}${contact ? ' (' + contact + ')' : ''} using OMB Gas Service. You are receiving this because ${business} carried out work for you. Do not want these reminders? Unsubscribe: ${unsub}`;
  const text = `${msg}\n\n${business}\n${contact}\n\n--\n${foot}`;
  const html = `<div style="font:16px/1.5 Arial,Helvetica,sans-serif;color:#15191c;max-width:560px"><p>${esc(msg).replace(/\n/g, '<br>')}</p><p style="margin-top:22px"><b>${esc(business)}</b><br>${esc(contact)}</p><hr style="border:0;border-top:1px solid #ddd;margin:26px 0 12px"><p style="font-size:12px;color:#666">Sent by ${esc(business)} using OMB Gas Service. You are receiving this because ${esc(business)} carried out work for you. <a href="${esc(unsub)}" style="color:#666">Unsubscribe</a></p></div>`;
  return { subject, text, html, business, unsub };
}

async function send(to: string, replyTo: string, e: { subject: string; text: string; html: string; business: string; unsub: string }, token: string) {
  const body: Record<string, unknown> = {
    from: `${e.business} <${FROM_ADDR}>`, to: [to], subject: e.subject, text: e.text, html: e.html,
    headers: { 'List-Unsubscribe': `<${SELF}?action=unsub&t=${token}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
  if (okEmail(replyTo)) body.reply_to = replyTo.trim();
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('Resend ' + r.status + ' ' + (await r.text()).slice(0, 200));
}

function hasAccess(s: any) {
  if (!s) return false;
  const now = Date.now();
  if (s.comped) return true;
  if (s.status === 'trialing') return Date.parse(s.trial_end) > now;
  if (s.status === 'active' || s.status === 'past_due') return (s.period_end ? Date.parse(s.period_end) : now + 864e5) > now - 3 * 864e5;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = new URL(req.url), action = url.searchParams.get('action');
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try {
    /* ---- unsubscribe ---- */
    if (action === 'unsub') {
      const t = url.searchParams.get('t') || '';
      if (!/^[0-9a-f-]{36}$/i.test(t)) return json({ error: 'Bad link' }, 400);
      const { data: row } = await sb.from('reminder_log').select('email, user_id').eq('token', t).maybeSingle();
      if (!row) return json({ error: 'This link is not valid any more' }, 404);
      await sb.from('reminder_suppress').upsert({ email: String(row.email).toLowerCase(), reason: 'unsubscribed' });
      return json({ ok: true });
    }

    /* ---- sample email to the signed-in engineer ---- */
    if (action === 'test') {
      const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
      const { data: u } = await sb.auth.getUser(token);
      if (!u?.user?.email) return json({ error: 'Not signed in' }, 401);
      const { data: st } = await sb.from('docs').select('data').eq('user_id', u.user.id).eq('kind', 'settings').eq('deleted', false).maybeSingle();
      const settings = st?.data || {};
      const due = new Date(Date.now() + 56 * 864e5).toISOString().slice(0, 10);
      const e = buildEmail({ settings, name: 'Mrs Jones', what: WHAT.gas, address: '7 Elm Close, Lincoln', due, token: '00000000-0000-0000-0000-000000000000', stage: 'e56' });
      await send(u.user.email, settings.email || '', { ...e, subject: '[Sample] ' + e.subject }, '00000000-0000-0000-0000-000000000000');
      return json({ ok: true, to: u.user.email });
    }

    /* ---- daily run ---- */
    if (action === 'run') {
      const { data: last } = await sb.from('reminder_runs').select('ran_at').order('ran_at', { ascending: false }).limit(1).maybeSingle();
      if (last && Date.now() - Date.parse(last.ran_at) < 20 * 3600e3) return json({ skipped: 'already ran today' });
      const { data: run } = await sb.from('reminder_runs').insert({ note: 'started' }).select('id').single();
      const cap = parseInt(Deno.env.get('REMINDER_RUN_CAP') || '90', 10) || 90;
      const today = ukToday();
      let sent = 0, failed = 0;

      const { data: setDocs } = await sb.from('docs').select('user_id, data').eq('kind', 'settings').eq('deleted', false).eq('data->>remAuto', 'on');
      for (const sd of setDocs || []) {
        if (sent >= cap) break;
        const uid = sd.user_id as string, settings = sd.data || {};
        const { data: sub } = await sb.from('subscriptions').select('status, trial_end, period_end, comped').eq('user_id', uid).maybeSingle();
        if (!hasAccess(sub)) continue;
        if (!okEmail(settings.email)) continue;   // replies need somewhere to go
        const windowDays = Math.min(120, Math.max(14, parseInt(String(settings.remDays || '56'), 10) || 56));
        const [{ data: custs }, { data: recs }, { data: logs }] = await Promise.all([
          sb.from('docs').select('id, data').eq('user_id', uid).eq('kind', 'customer').eq('deleted', false),
          sb.from('docs').select('id, data').eq('user_id', uid).eq('kind', 'record').eq('deleted', false),
          sb.from('reminder_log').select('record_id, stage, sent_at').eq('user_id', uid),
        ]);
        const cmap = new Map((custs || []).map((c: any) => [c.id, c.data]));
        const did = new Set((logs || []).map((l: any) => l.record_id + '|' + l.stage));
        const sentToday = (logs || []).filter((l: any) => Date.now() - Date.parse(l.sent_at) < 864e5).length;
        let budget = Math.max(0, PER_ENGINEER_DAILY - sentToday);

        // newest completed gas check / service per customer + property
        const best = new Map<string, any>();
        for (const r of recs || []) {
          const d = r.data || {}, t = d.type || 'gas';
          if ((t !== 'gas' && t !== 'service') || d.status !== 'complete' || !/^\d{4}-\d{2}-\d{2}$/.test(String(d.renewal || ''))) continue;
          const who = d.customerId || norm(d.customer?.name), key = [who, norm(d.jobAddress), t].join('|');
          const cur = best.get(key);
          if (!cur || String(d.inspectionDate) > String(cur.d.inspectionDate) || (d.inspectionDate === cur.d.inspectionDate && (d.updated || 0) > (cur.d.updated || 0))) best.set(key, { id: r.id, d, t });
        }
        for (const { id, d, t } of best.values()) {
          if (sent >= cap || budget <= 0) break;
          const cu: any = cmap.get(d.customerId) || {};
          if (cu.noRemind) continue;
          if (['booked', 'skip', 'stop'].includes(cu.remSt?.[id] || d.remState)) continue;
          const to = String(cu.email || d.customer?.email || '').trim();
          if (!okEmail(to)) continue;
          const days = dayDiff(d.renewal, today);
          let stage = '';
          if (days <= 14 && days >= -30) stage = 'e14';
          else if (days > 14 && days <= windowDays) stage = 'e56';
          if (!stage || did.has(id + '|' + stage)) continue;
          if (stage === 'e56' && did.has(id + '|e14')) continue;
          const { data: sup } = await sb.from('reminder_suppress').select('email').eq('email', to.toLowerCase()).maybeSingle();
          if (sup) continue;
          // write the log row first: if sending then fails we undo it, and a crash can never cause a double send
          const { data: lg, error: le } = await sb.from('reminder_log').insert({ user_id: uid, record_id: id, stage, email: to }).select('token').single();
          if (le || !lg) continue;
          try {
            const e = buildEmail({ settings, name: cu.name || d.customer?.name || '', what: WHAT[t], address: addrLine(d.jobAddress), due: d.renewal, token: lg.token, stage });
            await send(to, settings.email || '', e, lg.token);
            sent++; budget--;
          } catch (err) {
            failed++;
            await sb.from('reminder_log').delete().eq('user_id', uid).eq('record_id', id).eq('stage', stage);
            console.error('send failed', String((err as Error).message));
          }
        }
      }
      await sb.from('reminder_runs').update({ sent, note: `done, ${failed} failed` }).eq('id', run!.id);
      return json({ ok: true, sent, failed });
    }
    return json({ error: 'Unknown action' }, 400);
  } catch (e) { return json({ error: String((e as Error).message || e) }, 500); }
});
