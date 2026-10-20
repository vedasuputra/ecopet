-- Eco-Pet: customer service. A traveler reports a problem (a shop that was closed when they came to use a coupon, a coupon the
-- shop would not take, ...) and the team answers it from the admin page: coins back, more days on the coupon, or just an answer.
-- Safe to re-run. Run it in the Supabase SQL editor.

create table if not exists public.support_tickets (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('shop_closed', 'shop_refused', 'wrong_deal', 'coupon_problem', 'coins_problem', 'other')),
  coupon_uid text,            -- the coupon the report is about (the traveler's own copy)
  coupon_id text,
  vendor_id text,
  message text not null check (char_length(message) between 10 and 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'rejected')),
  resolution text check (resolution in ('refund', 'extend', 'none')),
  refunded_coins int,
  admin_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid
);
create index if not exists support_user_idx on public.support_tickets (user_id, created_at desc);
create index if not exists support_status_idx on public.support_tickets (status, created_at);

-- Nobody reads or writes this table from the app: only the server (service role) does, after checking who is asking.
alter table public.support_tickets enable row level security;

-- The team's answer to one report, in one step (so it can never be half done):
--   refund  the coupon was bought with coins and is still unused: the coins go back and the coupon is taken away
--   extend  the coupon is still unused: it gets 7 more days
--   none    no change to the coupon; the report is closed with the note
-- Returns the coins refunded (0 for the others).
create or replace function public.resolve_support_ticket(p_ticket bigint, p_admin uuid, p_resolution text, p_note text)
returns int language plpgsql security definer set search_path = public as $$
declare
  t public.support_tickets;
  r public.coupons_issued;
  paid int := 0;
  bal int;
begin
  select * into t from public.support_tickets where id = p_ticket and status = 'open' for update;
  if not found then
    raise exception 'not_open';
  end if;

  if p_resolution in ('refund', 'extend') then
    if t.coupon_uid is null then
      raise exception 'no_coupon';
    end if;
    select * into r from public.coupons_issued where uid = t.coupon_uid and user_id = t.user_id and status = 'unused' for update;
    if not found then
      raise exception 'not_refundable';
    end if;
  end if;

  if p_resolution = 'refund' then
    if r.source <> 'coins' then
      raise exception 'not_refundable';   -- a free (welcome) coupon cost no coins: extend it instead
    end if;
    select -delta into paid from public.coin_ledger where user_id = t.user_id and reason = 'coupon' and ref = t.coupon_uid;
    if paid is null or paid <= 0 then
      raise exception 'not_refundable';
    end if;
    delete from public.coupons_issued where uid = t.coupon_uid;
    bal := public.apply_coins(t.user_id, paid, 'refund', t.coupon_uid);
    if bal = -1 then
      raise exception 'not_refundable';
    end if;
  elsif p_resolution = 'extend' then
    update public.coupons_issued set expires_at = greatest(coalesce(expires_at, now()), now()) + interval '7 days' where uid = t.coupon_uid;
  end if;

  update public.support_tickets
    set status = case when p_resolution = 'none' then 'rejected' else 'resolved' end,
        resolution = p_resolution,
        refunded_coins = case when p_resolution = 'refund' then paid else null end,
        admin_note = nullif(left(coalesce(p_note, ''), 300), ''),
        resolved_at = now(),
        resolved_by = p_admin
    where id = p_ticket;
  return paid;
end $$;

revoke all on function public.resolve_support_ticket(bigint, uuid, text, text) from public, anon, authenticated;
grant execute on function public.resolve_support_ticket(bigint, uuid, text, text) to service_role;
