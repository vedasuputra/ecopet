-- Eco-Pet: referral codes. Safe to re-run. Run it in the Supabase SQL editor (after economy_schema.sql and vendor_schema.sql).
--
-- Every traveler has ONE code (made the first time it is asked for). A new traveler can type a friend's code when signing up:
--   * the new traveler gets 20 bonus coins
--   * the friend whose code was used gets a new voucher (one of the three cheapest coupons, like the welcome gift), valid 7 days,
--     so it can still be used before they leave the Mekong Delta
-- A traveler can use only one code, never their own, and only once. Everything happens in one step on the server.

create table if not exists public.referral_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id bigint generated always as identity primary key,
  referrer_id uuid not null references auth.users (id) on delete cascade,
  referred_id uuid not null unique references auth.users (id) on delete cascade, -- one code per new traveler
  code text not null,
  bonus_coins int not null default 20,
  voucher_uid text,                  -- the coupon the referrer received
  created_at timestamptz not null default now()
);
create index if not exists referrals_referrer_idx on public.referrals (referrer_id, created_at desc);

-- Only the server (service role) reads and writes these two tables.
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;

-- a referral voucher is a coupon with its own source
alter table public.coupons_issued drop constraint if exists coupons_issued_source_check;
alter table public.coupons_issued add constraint coupons_issued_source_check check (source in ('coins', 'welcome', 'referral'));

-- The code of a traveler (made on the first call): 6 characters, no letters that look alike.
create or replace function public.get_referral_code(p_user uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  c text;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
begin
  select code into c from public.referral_codes where user_id = p_user;
  if found then
    return c;
  end if;
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    begin
      insert into public.referral_codes (user_id, code) values (p_user, c);
      return c;
    exception when unique_violation then
      -- the same code for another traveler (or a race on this traveler): look again
      select code into c from public.referral_codes where user_id = p_user;
      if found then
        return c;
      end if;
    end;
  end loop;
end $$;

-- Uses a code for a new traveler. Raises invalid_code, own_code or already_used. Returns the id of the coupon the friend received.
create or replace function public.apply_referral(p_user uuid, p_code text, p_voucher_uid text)
returns text language plpgsql security definer set search_path = public as $$
declare
  ref_user uuid;
  o public.coupon_offers;
begin
  select user_id into ref_user from public.referral_codes where code = upper(trim(p_code));
  if not found then
    raise exception 'invalid_code';
  end if;
  if ref_user = p_user then
    raise exception 'own_code';
  end if;
  begin
    insert into public.referrals (referrer_id, referred_id, code) values (ref_user, p_user, upper(trim(p_code)));
  exception when unique_violation then
    raise exception 'already_used';
  end;

  -- 20 coins for the new traveler (the ledger makes it happen once)
  perform public.apply_coins(p_user, 20, 'referral', 'joined-' || ref_user::text);

  -- a new voucher for the friend whose code was used: one of the three cheapest coupons
  select c.* into o from (
    select co.* from public.coupon_offers co
      join public.vendors v on v.id = co.vendor_id
      where co.active and v.plan_paid_until > now()
      order by co.cost_coins asc, co.id collate "C" asc
      limit 3
  ) c
  order by random() limit 1;
  if found then
    insert into public.coupons_issued (uid, user_id, coupon_id, vendor_id, discount_pct, source, expires_at)
      values (p_voucher_uid, ref_user, o.id, o.vendor_id, o.discount_pct, 'referral', now() + interval '7 days');
    update public.referrals set voucher_uid = p_voucher_uid where referred_id = p_user;
    return o.id;
  end if;
  return null;
end $$;

revoke all on function public.get_referral_code(uuid) from public, anon, authenticated;
revoke all on function public.apply_referral(uuid, text, text) from public, anon, authenticated;
grant execute on function public.get_referral_code(uuid) to service_role;
grant execute on function public.apply_referral(uuid, text, text) to service_role;
