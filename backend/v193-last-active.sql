-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Adds "last active" (when a user's data last synced) to the owner page.
drop function if exists public.admin_overview();
create or replace function public.admin_overview() returns table (user_id uuid, email text, created_at timestamptz, last_sign_in timestamptz, confirmed boolean, status text, trial_end timestamptz, period_end timestamptz, comped boolean, last_active timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query select u.id, u.email::text, u.created_at, u.last_sign_in_at, (u.email_confirmed_at is not null), s.status, s.trial_end, s.period_end, coalesce(s.comped, false),
      (select max(d.server_at) from public.docs d where d.user_id = u.id)
    from auth.users u left join public.subscriptions s on s.user_id = u.id order by u.created_at desc;
end $$;
