-- Eco-Pet economy schema. Run AFTER schema.sql and vendor_schema.sql:
-- Supabase -> SQL Editor -> paste -> Run. Safe to re-run.
--
-- Moves everything that has value out of the browser and onto the server:
--   * coins, completed quests and the welcome gift now live in tables only the server can write
--   * coupons are defined by the vendors themselves (coupon_offers), not hard-coded in the app
--   * vendor subscription payments are recorded (simulated checkout, no real money)

-- ============================================================================ vendors
alter table public.vendors add column if not exists plan_paid_until timestamptz;

-- ============================================================================ coupon offers
-- One row per coupon a vendor offers. Everyone can read them (travelers browse them in the app);
-- only the server writes them, after checking the caller owns the business.
create table if not exists public.coupon_offers (
  id text primary key,
  vendor_id text not null references public.vendors (id) on delete cascade,
  title_en text not null,
  title_vi text not null,
  discount_pct int not null check (discount_pct between 1 and 90),
  cost_coins int not null check (cost_coins between 1 and 1000),
  code text not null check (code ~ '^[A-Z0-9]{2,8}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (vendor_id, code)
);

alter table public.coupon_offers enable row level security;
drop policy if exists "offers_read_all" on public.coupon_offers;
create policy "offers_read_all" on public.coupon_offers for select using (true);

insert into public.coupon_offers (id, vendor_id, title_en, title_vi, discount_pct, cost_coins, code) values
  ('c1', 'v1', 'Fresh fruit discount',    'Giảm giá trái cây tươi', 10, 40, 'BT10'),
  ('c2', 'v2', 'Coffee discount',         'Giảm giá cà phê',        15, 50, 'SX15'),
  ('c3', 'v3', 'Banh xeo discount',       'Giảm giá bánh xèo',      20, 60, 'CL20'),
  ('c4', 'v4', 'Coconut candy discount',  'Giảm giá kẹo dừa',       10, 45, 'CB10'),
  ('c5', 'v5', 'Crafts discount',         'Giảm giá đồ thủ công',   25, 80, 'MC25'),
  ('c6', 'v6', 'Bike rental discount',    'Giảm giá thuê xe đạp',   20, 55, 'GB20')
on conflict (id) do nothing;

-- ============================================================================ wallet, ledger, quests
-- Only the server (service_role) writes these. Users can read their own rows.
create table if not exists public.wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  coins int not null default 0 check (coins >= 0),
  welcome_claimed boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.coin_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  delta int not null,
  reason text not null,   -- quest | ad | coupon | redeem_bonus | seed | dev
  ref text not null,      -- quest id, coupon uid, ... makes every award idempotent
  created_at timestamptz not null default now(),
  unique (user_id, reason, ref)
);
create index if not exists coin_ledger_user_idx on public.coin_ledger (user_id, created_at desc);

create table if not exists public.quest_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  quest_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, quest_id)
);

alter table public.wallets enable row level security;
alter table public.coin_ledger enable row level security;
alter table public.quest_progress enable row level security;

drop policy if exists "wallet_select_own" on public.wallets;
drop policy if exists "ledger_select_own" on public.coin_ledger;
drop policy if exists "quests_select_own" on public.quest_progress;
create policy "wallet_select_own" on public.wallets for select using (user_id = auth.uid());
create policy "ledger_select_own" on public.coin_ledger for select using (user_id = auth.uid());
create policy "quests_select_own" on public.quest_progress for select using (user_id = auth.uid());

-- Coupons are now created by the server (buy_coupon / claim_welcome), never by the browser.
drop policy if exists "issued_insert_own" on public.coupons_issued;

-- Vendors can read offers of their own business even if inactive (offers are public anyway),
-- and their subscription payments.
create table if not exists public.vendor_payments (
  id bigint generated always as identity primary key,
  vendor_id text not null references public.vendors (id) on delete cascade,
  plan text not null check (plan in ('monthly', 'semester', 'annual')),
  amount_vnd int not null,
  discount_vnd int not null default 0,
  method text not null check (method in ('momo', 'vnpay', 'zalopay', 'card')),
  status text not null default 'paid' check (status in ('paid')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.vendor_payments enable row level security;
drop policy if exists "payments_select_own" on public.vendor_payments;
create policy "payments_select_own" on public.vendor_payments
  for select using (vendor_id = public.vendor_of());

-- ============================================================================ functions
-- All atomic, all callable ONLY with the service_role key (the /api functions).

-- Add (or subtract) coins and write the ledger line in one step.
--   returns the new balance, or -1 if this exact (user, reason, ref) was already applied.
--   raises 'insufficient_coins' (and changes nothing) if the balance would go below zero.
create or replace function public.apply_coins(p_user uuid, p_delta int, p_reason text, p_ref text)
returns int language plpgsql security definer set search_path = public as $$
declare bal int;
begin
  insert into public.wallets (user_id) values (p_user) on conflict (user_id) do nothing;
  begin
    insert into public.coin_ledger (user_id, delta, reason, ref) values (p_user, p_delta, p_reason, p_ref);
  exception when unique_violation then
    return -1;
  end;
  update public.wallets set coins = coins + p_delta, updated_at = now()
    where user_id = p_user and coins + p_delta >= 0
    returning coins into bal;
  if bal is null then
    raise exception 'insufficient_coins';
  end if;
  return bal;
end $$;

-- Rewarded-ad coins, at most p_limit per Vietnam calendar day. Returns the balance or -2 at the limit.
create or replace function public.claim_ad_reward(p_user uuid, p_amount int, p_limit int)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.wallets (user_id) values (p_user) on conflict (user_id) do nothing;
  perform 1 from public.wallets where user_id = p_user for update;   -- serialises concurrent claims
  select count(*) into n from public.coin_ledger
    where user_id = p_user and reason = 'ad'
      and (created_at at time zone 'Asia/Ho_Chi_Minh')::date = (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  if n >= p_limit then
    return -2;
  end if;
  return public.apply_coins(p_user, p_amount, 'ad', gen_random_uuid()::text);
end $$;

-- Mark a quest done (once per user) and pay its reward. Returns the balance, or -1 if already done.
create or replace function public.complete_quest(p_user uuid, p_quest text, p_reward int)
returns int language plpgsql security definer set search_path = public as $$
begin
  insert into public.quest_progress (user_id, quest_id) values (p_user, p_quest) on conflict do nothing;
  if not found then
    return -1;
  end if;
  return public.apply_coins(p_user, p_reward, 'quest', p_quest);
end $$;

-- Trade coins for a coupon. The PRICE comes from coupon_offers, not from the caller.
create or replace function public.buy_coupon(p_user uuid, p_coupon text, p_uid text)
returns int language plpgsql security definer set search_path = public as $$
declare o public.coupon_offers; bal int;
begin
  select * into o from public.coupon_offers where id = p_coupon and active;
  if not found then
    raise exception 'coupon_unavailable';
  end if;
  bal := public.apply_coins(p_user, -o.cost_coins, 'coupon', p_uid);
  if bal = -1 then
    raise exception 'duplicate';
  end if;
  insert into public.coupons_issued (uid, user_id, coupon_id, vendor_id, discount_pct, source)
    values (p_uid, p_user, o.id, o.vendor_id, o.discount_pct, 'coins');
  return bal;
end $$;

-- The new-user gift: once per account, and the SERVER draws the winning coupon at random.
create or replace function public.claim_welcome(p_user uuid, p_uid text)
returns text language plpgsql security definer set search_path = public as $$
declare o public.coupon_offers;
begin
  insert into public.wallets (user_id) values (p_user) on conflict (user_id) do nothing;
  update public.wallets set welcome_claimed = true, updated_at = now()
    where user_id = p_user and not welcome_claimed;
  if not found then
    raise exception 'already_claimed';
  end if;
  select * into o from public.coupon_offers where active order by random() limit 1;
  if not found then
    raise exception 'no_coupons';
  end if;
  insert into public.coupons_issued (uid, user_id, coupon_id, vendor_id, discount_pct, source)
    values (p_uid, p_user, o.id, o.vendor_id, o.discount_pct, 'welcome');
  return o.id;
end $$;

revoke all on function public.apply_coins(uuid, int, text, text) from public, anon, authenticated;
revoke all on function public.claim_ad_reward(uuid, int, int) from public, anon, authenticated;
revoke all on function public.complete_quest(uuid, text, int) from public, anon, authenticated;
revoke all on function public.buy_coupon(uuid, text, text) from public, anon, authenticated;
revoke all on function public.claim_welcome(uuid, text) from public, anon, authenticated;
grant execute on function public.apply_coins(uuid, int, text, text) to service_role;
grant execute on function public.claim_ad_reward(uuid, int, int) to service_role;
grant execute on function public.complete_quest(uuid, text, int) to service_role;
grant execute on function public.buy_coupon(uuid, text, text) to service_role;
grant execute on function public.claim_welcome(uuid, text) to service_role;
