-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Adds anonymous usage totals to the owner's Admin page. It returns counts only:
-- no names, emails, addresses, customers or document contents ever leave the database.
create or replace function public.admin_usage() returns jsonb
language plpgsql security definer set search_path = public as $$
declare out jsonb;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  select jsonb_build_object(
    'records',          count(*) filter (where kind = 'record'  and not deleted),
    'records_finished', count(*) filter (where kind = 'record'  and not deleted and data->>'status' = 'complete'),
    'invoices',         count(*) filter (where kind = 'invoice' and not deleted),
    'invoices_paid',    count(*) filter (where kind = 'invoice' and not deleted and data->>'paid' = 'true'),
    'customers',        count(*) filter (where kind = 'customer' and not deleted),
    'bookings',         count(*) filter (where kind = 'booking' and not deleted),
    'saved_7d',         count(*) filter (where kind in ('record','invoice') and server_at > now() - interval '7 days'),
    'saved_30d',        count(*) filter (where kind in ('record','invoice') and server_at > now() - interval '30 days'),
    'active_7d',        count(distinct user_id) filter (where server_at > now() - interval '7 days'),
    'active_30d',       count(distinct user_id) filter (where server_at > now() - interval '30 days'),
    'users_with_data',  count(distinct user_id)
  ) into out from public.docs;
  out := out || jsonb_build_object(
    'by_type', coalesce((select jsonb_object_agg(t, n) from (
        select coalesce(data->>'type', 'gas') as t, count(*) as n from public.docs
        where kind = 'record' and not deleted and data->>'status' = 'complete' group by 1) x), '{}'::jsonb),
    'size_groups', (select jsonb_build_object(
        'none_yet',  count(*) filter (where n = 0),
        'one_to_5',  count(*) filter (where n between 1 and 5),
        'six_to_20', count(*) filter (where n between 6 and 20),
        'over_20',   count(*) filter (where n > 20))
      from (select u.id, (select count(*) from public.docs d where d.user_id = u.id and d.kind in ('record','invoice') and not d.deleted) as n from auth.users u) z));
  return out;
end $$;
revoke all on function public.admin_usage() from public, anon;
grant execute on function public.admin_usage() to authenticated;
