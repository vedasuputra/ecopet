-- Eco-Pet: a traveler can get at most 2 coupons per day (Vietnam calendar day). Safe to re-run.
-- Run AFTER quests_and_expiry_schema.sql.
--
-- Counts every coupon the account received today (bought with coins or the welcome gift). The check is made
-- inside the same database transaction as the purchase, so two taps at once cannot get past it, and the coins
-- are never taken when the limit is reached. To change the limit, change daily_limit below and run this again.

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
  select * into o from public.coupon_offers where id = p_coupon and active;
  if not found then
    raise exception 'coupon_unavailable';
  end if;

  -- one buyer at a time per account, so the daily count cannot be raced
  perform pg_advisory_xact_lock(hashtext('coupons-' || p_user::text));
  select count(*) into used from public.coupons_issued where user_id = p_user and issued_at >= d_start;
  if used >= daily_limit then
    raise exception 'daily_coupon_limit';
  end if;

  if o.monthly_cap is not null then
    perform pg_advisory_xact_lock(hashtext(o.id));      -- two buyers at once cannot overshoot the cap
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
