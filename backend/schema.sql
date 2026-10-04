-- OMB Gas Service – database setup. Paste into Supabase > SQL Editor > Run (safe to run again).

-- 1. One row per customer / record / invoice / settings document, private to its owner
create table if not exists public.docs (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind    text not null check (kind in ('customer','record','invoice','settings')),
  id      text not null,
  data    jsonb not null default '{}'::jsonb,
  updated bigint not null default 0,          -- client timestamp (ms) used to decide which edit is newer
  deleted boolean not null default false,
  server_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);
create index if not exists docs_server_at on public.docs (user_id, server_at);

-- 2. Subscription state (written only by the server, read by the owner)
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'trialing',     -- trialing | active | past_due | canceled
  trial_end timestamptz not null default (now() + interval '14 days'),
  period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  updated_at timestamptz not null default now()
);

-- 3. Every new sign-up starts a 14 day free trial, no card needed
create or replace function public.start_trial() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.subscriptions (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_signup_start_trial on auth.users;
create trigger on_signup_start_trial after insert on auth.users for each row execute function public.start_trial();

-- 4. Does this user currently have access? (trial running, or paid and in date)
create or replace function public.has_access() returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = auth.uid()
      and ( (s.status = 'trialing' and s.trial_end > now())
         or (s.status in ('active','past_due') and coalesce(s.period_end, now() + interval '1 day') > now() - interval '3 days') )
  );
$$;

-- 5. Row level security: people only ever see their own rows, and only write while they have access
alter table public.docs enable row level security;
alter table public.subscriptions enable row level security;
drop policy if exists docs_read   on public.docs;
drop policy if exists docs_insert on public.docs;
drop policy if exists docs_update on public.docs;
create policy docs_read   on public.docs for select using (user_id = auth.uid());
create policy docs_insert on public.docs for insert with check (user_id = auth.uid() and public.has_access());
create policy docs_update on public.docs for update using (user_id = auth.uid() and public.has_access()) with check (user_id = auth.uid());
drop policy if exists subs_read on public.subscriptions;
create policy subs_read on public.subscriptions for select using (user_id = auth.uid());

create or replace function public.touch_server_at() returns trigger language plpgsql as $$ begin new.server_at = now(); return new; end $$;
drop trigger if exists docs_touch on public.docs;
create trigger docs_touch before insert or update on public.docs for each row execute function public.touch_server_at();

-- 6. Private file store for photos and signatures (one folder per user)
insert into storage.buckets (id, name, public) values ('files','files', false) on conflict do nothing;
drop policy if exists files_read   on storage.objects;
drop policy if exists files_write  on storage.objects;
drop policy if exists files_update on storage.objects;
create policy files_read   on storage.objects for select using (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy files_write  on storage.objects for insert with check (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text and public.has_access());
create policy files_update on storage.objects for update using (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text and public.has_access());
