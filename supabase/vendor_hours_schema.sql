-- Eco-Pet: shop address and opening hours, and only paid-up vendors show to travelers. Safe to re-run.
-- Run AFTER coupon_limit_schema.sql.
--
-- open_hours is JSON like {"mon":["07:00","17:00"],"tue":["07:00","17:00"]}: a day that is missing means closed.
-- null means the shop has not said yet. Times are Vietnam time.

alter table public.vendors add column if not exists address text;
alter table public.vendors add column if not exists open_hours jsonb;

-- The made-up demo shops (v1-v6) get hours and a paid-up subscription for one year so the demo still shows them.
-- A real vendor who claims one of them starts unpaid (the server clears plan_paid_until when a business is claimed).
update public.vendors set address = 'Cai Rang Floating Market, Can Tho', open_hours = '{"mon":["05:00","12:00"],"tue":["05:00","12:00"],"wed":["05:00","12:00"],"thu":["05:00","12:00"],"fri":["05:00","12:00"],"sat":["05:00","12:00"],"sun":["05:00","12:00"]}' where id = 'v1' and address is null;
update public.vendors set address = 'Near Ninh Kieu Wharf, Can Tho', open_hours = '{"mon":["07:00","22:00"],"tue":["07:00","22:00"],"wed":["07:00","22:00"],"thu":["07:00","22:00"],"fri":["07:00","22:00"],"sat":["07:00","23:00"],"sun":["07:00","23:00"]}' where id = 'v2' and address is null;
update public.vendors set address = 'Near Ninh Kieu Wharf, Can Tho', open_hours = '{"mon":["10:00","21:00"],"tue":["10:00","21:00"],"wed":["10:00","21:00"],"thu":["10:00","21:00"],"fri":["10:00","21:00"],"sat":["10:00","21:00"],"sun":["10:00","21:00"]}' where id = 'v3' and address is null;
update public.vendors set address = 'Con Phung, Ben Tre', open_hours = '{"mon":["08:00","17:00"],"tue":["08:00","17:00"],"wed":["08:00","17:00"],"thu":["08:00","17:00"],"fri":["08:00","17:00"],"sat":["08:00","17:00"],"sun":["08:00","17:00"]}' where id = 'v4' and address is null;
update public.vendors set address = 'Near Ninh Kieu Wharf, Can Tho', open_hours = '{"mon":["09:00","18:00"],"tue":["09:00","18:00"],"wed":["09:00","18:00"],"thu":["09:00","18:00"],"fri":["09:00","18:00"],"sat":["09:00","18:00"]}' where id = 'v5' and address is null;
update public.vendors set address = 'Near Ninh Kieu Wharf, Can Tho', open_hours = '{"mon":["07:00","18:00"],"tue":["07:00","18:00"],"wed":["07:00","18:00"],"thu":["07:00","18:00"],"fri":["07:00","18:00"],"sat":["07:00","18:00"],"sun":["07:00","18:00"]}' where id = 'v6' and address is null;
update public.vendors set plan_paid_until = now() + interval '1 year', plan_started_at = coalesce(plan_started_at, now())
  where id in ('v1','v2','v3','v4','v5','v6') and owner_id is null and plan_paid_until is null;

-- A coupon can only be bought while its shop's subscription is paid up.
create or replace function public.buy_coupon(p_user uuid, p_coupon text, p_uid text)
returns int language plpgsql security definer set search_path = public as $$
declare
  daily_limit constant int := 2;
  o public.coupon_offers;
  bal int;
  used int;
  m_start timestamptz := date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh';
  d_start timestamptz := date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh';
begin
  select co.* into o from public.coupon_offers co
    join public.vendors v on v.id = co.vendor_id
    where co.id = p_coupon and co.active and v.plan_paid_until > now();
  if not found then
    raise exception 'coupon_unavailable';
  end if;

  perform pg_advisory_xact_lock(hashtext('coupons-' || p_user::text));
  select count(*) into used from public.coupons_issued where user_id = p_user and issued_at >= d_start;
  if used >= daily_limit then
    raise exception 'daily_coupon_limit';
  end if;

  if o.monthly_cap is not null then
    perform pg_advisory_xact_lock(hashtext(o.id));
    select count(*) into used from public.coupons_issued where coupon_id = o.id and issued_at >= m_start;
    if used >= o.monthly_cap then
      raise exception 'sold_out';
    end if;
  end if;
  bal := public.apply_coins(p_user, -o.cost_coins, 'coupon', p_uid);
  if bal = -1 then
    raise exception 'duplicate';
  end if;
  insert into public.coupons_issued (uid, user_id, coupon_id, vendor_id, discount_pct, source, expires_at)
    values (p_uid, p_user, o.id, o.vendor_id, o.discount_pct, 'coins', now() + make_interval(days => o.valid_days));
  return bal;
end $$;

revoke all on function public.buy_coupon(uuid, text, text) from public, anon, authenticated;
grant execute on function public.buy_coupon(uuid, text, text) to service_role;

-- The welcome gift is only drawn from coupons of shops whose subscription is paid up.
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
  select co.* into o from public.coupon_offers co
    join public.vendors v on v.id = co.vendor_id
    where co.active and v.plan_paid_until > now()
    order by random() limit 1;
  if not found then
    raise exception 'no_coupons';
  end if;
  insert into public.coupons_issued (uid, user_id, coupon_id, vendor_id, discount_pct, source)
    values (p_uid, p_user, o.id, o.vendor_id, o.discount_pct, 'welcome');
  return o.id;
end $$;

revoke all on function public.claim_welcome(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_welcome(uuid, text) to service_role;

-- If a shop's subscription lapses, a traveler who already bought one of its coupons with coins can get the coins
-- back (the coupon is removed). They can also just keep the coupon and wait for the shop to renew.
-- Refunds are only possible while the shop is NOT paid up, only for unused coupons bought with coins, and only
-- once (the coin ledger refuses a second refund of the same coupon). The amount is what the traveler paid.
create or replace function public.refund_coupon(p_user uuid, p_uid text)
returns int language plpgsql security definer set search_path = public as $$
declare
  r public.coupons_issued;
  paid int;
  bal int;
begin
  select * into r from public.coupons_issued
    where uid = p_uid and user_id = p_user and status = 'unused' and source = 'coins' for update;
  if not found then
    raise exception 'not_refundable';
  end if;
  perform 1 from public.vendors where id = r.vendor_id and plan_paid_until > now();
  if found then
    raise exception 'shop_active';
  end if;
  select -delta into paid from public.coin_ledger where user_id = p_user and reason = 'coupon' and ref = p_uid;
  if paid is null or paid <= 0 then
    raise exception 'not_refundable';
  end if;
  delete from public.coupons_issued where uid = p_uid;
  bal := public.apply_coins(p_user, paid, 'refund', p_uid);
  if bal = -1 then
    raise exception 'not_refundable';
  end if;
  return bal;
end $$;

revoke all on function public.refund_coupon(uuid, text) from public, anon, authenticated;
grant execute on function public.refund_coupon(uuid, text) to service_role;
