-- Faults / suggestions / questions sent from the app (Settings > Send feedback).
-- Run once in Supabase: SQL Editor > New query > paste > Run.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('fault', 'suggestion', 'question')),
  message text not null check (char_length(message) between 1 and 4000),
  app_version text,
  device text,
  screen text,
  status text not null default 'new' check (status in ('new', 'fixing', 'done')),
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;

-- anyone signed in can send feedback (even if their subscription has ended); nobody can read it back except the admin functions below
drop policy if exists feedback_insert on public.feedback;
create policy feedback_insert on public.feedback for insert to authenticated with check (user_id = auth.uid());

create or replace function public.admin_feedback() returns table (id uuid, email text, kind text, message text, app_version text, device text, screen text, status text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query select f.id, u.email::text, f.kind, f.message, f.app_version, f.device, f.screen, f.status, f.created_at
    from public.feedback f left join auth.users u on u.id = f.user_id order by f.created_at desc limit 200;
end $$;

create or replace function public.admin_feedback_status(target uuid, val text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if val not in ('new', 'fixing', 'done') then raise exception 'bad status'; end if;
  update public.feedback set status = val where id = target;
end $$;

revoke all on function public.admin_feedback(), public.admin_feedback_status(uuid, text) from public, anon;
grant execute on function public.admin_feedback(), public.admin_feedback_status(uuid, text) to authenticated;
