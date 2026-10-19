-- Eco-Pet chat limits. Run AFTER the other schema files: Supabase -> SQL Editor -> paste -> Run.
-- Safe to re-run.
--
-- /api/chat now requires a signed-in user and counts every message here, so nobody can burn the
-- free Gemini quota: a per-minute cap, a per-day cap per user, and a global daily cap.

create table if not exists public.chat_hits (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now()
);
create index if not exists chat_hits_user_idx on public.chat_hits (user_id, at desc);
create index if not exists chat_hits_at_idx on public.chat_hits (at desc);

-- Server only: RLS on and no policies, so browsers can neither read nor write it.
alter table public.chat_hits enable row level security;

-- Returns 'ok' (and records the message), or why it was refused:
--   per_minute | per_day | global.   Days are Vietnam calendar days.
create or replace function public.chat_hit(p_user uuid, p_per_minute int, p_per_day int, p_global_per_day int)
returns text language plpgsql security definer set search_path = public as $$
declare
  m int;
  d int;
  g int;
  day_start timestamptz := date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh';
begin
  perform pg_advisory_xact_lock(hashtext(p_user::text));          -- one request per user at a time
  delete from public.chat_hits where at < now() - interval '3 days'; -- housekeeping

  select count(*) into m from public.chat_hits where user_id = p_user and at > now() - interval '1 minute';
  if m >= p_per_minute then
    return 'per_minute';
  end if;

  select count(*) into d from public.chat_hits where user_id = p_user and at >= day_start;
  if d >= p_per_day then
    return 'per_day';
  end if;

  select count(*) into g from public.chat_hits where at >= day_start;
  if g >= p_global_per_day then
    return 'global';
  end if;

  insert into public.chat_hits (user_id) values (p_user);
  return 'ok';
end $$;

revoke all on function public.chat_hit(uuid, int, int, int) from public, anon, authenticated;
grant execute on function public.chat_hit(uuid, int, int, int) to service_role;
