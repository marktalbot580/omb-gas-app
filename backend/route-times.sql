-- Drive times for the Route screen: a daily usage counter, so one phone (or one bug) cannot run up the Google bill.
-- Run once in the Supabase SQL editor.
create table if not exists public.route_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  n int not null default 0,
  primary key (user_id, day)
);
alter table public.route_usage enable row level security;   -- no policies: only the server function (service role) touches it

-- Adds one to today's count for this user and says how many the whole app has used today.
create or replace function public.route_use(p_user uuid) returns table(mine int, total int)
language plpgsql security definer set search_path = public as $$
begin
  insert into public.route_usage (user_id, day, n) values (p_user, current_date, 1)
    on conflict (user_id, day) do update set n = public.route_usage.n + 1;
  return query select (select n from public.route_usage where user_id = p_user and day = current_date),
                      (select coalesce(sum(n), 0)::int from public.route_usage where day = current_date);
end $$;
revoke all on function public.route_use(uuid) from public, anon, authenticated;
