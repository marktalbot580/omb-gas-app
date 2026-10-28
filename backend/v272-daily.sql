-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Adds the daily graphs to the owner's Admin page (last 30 days). Counts only:
-- no names, emails, addresses, customers or document contents ever leave the database.
create or replace function public.admin_daily() returns jsonb
language plpgsql security definer set search_path = public as $$
declare out jsonb;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'd', g.d::date, 'signups', coalesce(s.n, 0), 'active', coalesce(a.n, 0), 'saved', coalesce(v.n, 0)) order by g.d), '[]'::jsonb)
  into out
  from generate_series(current_date - 29, current_date, interval '1 day') as g(d)
  left join (select created_at::date as day, count(*) as n from auth.users group by 1) s on s.day = g.d::date
  left join (select server_at::date as day, count(distinct user_id) as n from public.docs group by 1) a on a.day = g.d::date
  left join (select server_at::date as day, count(*) as n from public.docs where kind in ('record','invoice') and not deleted group by 1) v on v.day = g.d::date;
  return out;
end $$;
revoke all on function public.admin_daily() from public, anon;
grant execute on function public.admin_daily() to authenticated;
