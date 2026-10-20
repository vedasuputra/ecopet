-- Eco-Pet: the welcome gift is one of the THREE CHEAPEST coupons (it used to be any coupon). Safe to re-run.
-- The app shows those three before the spin; the server draws one of them at random. Ties in price are broken by the id
-- (compared by character code, the same order the app uses), so the app and the server agree on which three they are.

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
  select c.* into o from (
    select co.* from public.coupon_offers co
      join public.vendors v on v.id = co.vendor_id
      where co.active and v.plan_paid_until > now()
      order by co.cost_coins asc, co.id collate "C" asc
      limit 3
  ) c
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
