-- OMB Gas Service – automatic annual-check reminder emails. Paste into Supabase > SQL Editor > Run (safe to run again).
-- Needs the "reminders" Edge Function deployed first (see SETUP.md, section "Reminder emails").

-- Every reminder sent (also stops the same reminder being sent twice) and its one-tap unsubscribe token
create table if not exists public.reminder_log (
  user_id   uuid not null references auth.users(id) on delete cascade,
  record_id text not null,
  stage     text not null,                       -- 'e56' (about 8 weeks before) or 'e14' (about 2 weeks before / just overdue)
  email     text not null,
  token     uuid not null default gen_random_uuid(),
  sent_at   timestamptz not null default now(),
  primary key (user_id, record_id, stage)
);
create unique index if not exists reminder_log_token on public.reminder_log (token);
create index if not exists reminder_log_sent on public.reminder_log (user_id, sent_at);

-- Addresses that have unsubscribed: never emailed again, by any engineer
create table if not exists public.reminder_suppress (
  email text primary key,
  reason text not null default 'unsubscribed',
  created_at timestamptz not null default now()
);

-- One row per daily run (stops it running twice in a day)
create table if not exists public.reminder_runs (
  id bigserial primary key,
  ran_at timestamptz not null default now(),
  sent int not null default 0,
  note text
);

-- Only the server function (service role) touches these: no policies on purpose
alter table public.reminder_log enable row level security;
alter table public.reminder_suppress enable row level security;
alter table public.reminder_runs enable row level security;

-- Each engineer can read their own sent log (the app shows "Emailed automatically 12/10/2026" on the Annual checks due list)
drop policy if exists "own reminder log" on public.reminder_log;
create policy "own reminder log" on public.reminder_log for select to authenticated using (user_id = auth.uid());
grant select on public.reminder_log to authenticated;

-- Run the function every morning at 08:00 UTC (09:00 in summer, 08:00 in winter, UK time)
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.unschedule('omb-reminders') where exists (select 1 from cron.job where jobname = 'omb-reminders');
select cron.schedule('omb-reminders', '0 8 * * *', $$
  select net.http_post(
    url := 'https://klgscnjbjglwrdqucufg.supabase.co/functions/v1/reminders?action=run',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
$$);
