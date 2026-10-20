-- Eco-Pet: a coupon is valid for AT MOST 7 days after a traveler gets it (with coins or as the welcome gift). Safe to re-run.
-- Run AFTER vendor_hours_schema.sql and deal_type_schema.sql.
--
-- Vendors choose 1 to 7 days (7 by default). Coupons already given are cut to 7 days from the day they were issued, and the
-- welcome-gift coupons now get an expiry date too (the earlier version of claim_welcome did not set one).

update public.coupon_offers set valid_days = least(valid_days, 7);
alter table public.coupon_offers alter column valid_days set default 7;
alter table public.coupon_offers drop constraint if exists coupon_offers_valid_days_check;
alter table public.coupon_offers add constraint coupon_offers_valid_days_check check (valid_days between 1 and 7);

update public.coupons_issued
  set expires_at = least(coalesce(expires_at, issued_at + interval '7 days'), issued_at + interval '7 days')
  where status = 'unused';

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
    values (p_uid, p_user, o.id, o.vendor_id, o.discount_pct, 'coins', now() + make_interval(days => least(o.valid_days, 7)));
  return bal;
end $$;

revoke all on function public.buy_coupon(uuid, text, text) from public, anon, authenticated;
grant execute on function public.buy_coupon(uuid, text, text) to service_role;

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
  insert into public.coupons_issued (uid, user_id, coupon_id, vendor_id, discount_pct, source, expires_at)
    values (p_uid, p_user, o.id, o.vendor_id, o.discount_pct, 'welcome', now() + make_interval(days => least(o.valid_days, 7)));
  return o.id;
end $$;

revoke all on function public.claim_welcome(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_welcome(uuid, text) to service_role;
