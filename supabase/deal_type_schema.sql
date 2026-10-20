-- Eco-Pet: a coupon can be more than "X% off". Safe to re-run. Run AFTER vendor_kind_schema.sql.
--
-- deal_type is one of:
--   percent   X% off          (deal_value is not used; discount_pct holds the percent, 1-90)
--   amount    a fixed amount off, in VND (deal_value holds it)
--   free      a free gift or item with a purchase
--   combo     a bundle deal (for example coffee + pastry)
-- For every type except percent, discount_pct is 0 (it is the only number the old code looked at).

alter table public.coupon_offers add column if not exists deal_type text not null default 'percent';
alter table public.coupon_offers add column if not exists deal_value int;
alter table public.coupon_offers drop constraint if exists coupon_offers_deal_type_check;
alter table public.coupon_offers add constraint coupon_offers_deal_type_check check (deal_type in ('percent', 'amount', 'free', 'combo'));

-- discount_pct may now be 0 (for the deals that are not a percentage)
alter table public.coupon_offers drop constraint if exists coupon_offers_discount_pct_check;
alter table public.coupon_offers add constraint coupon_offers_discount_pct_check check (discount_pct between 0 and 90);

-- every coupon a traveler gets remembers the deal, so the shop sees it when scanning and in its history
alter table public.coupons_issued add column if not exists deal_type text not null default 'percent';
alter table public.coupons_issued add column if not exists deal_value int;

create or replace function public.set_coupon_deal() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select deal_type, deal_value into new.deal_type, new.deal_value from public.coupon_offers where id = new.coupon_id;
  new.deal_type := coalesce(new.deal_type, 'percent');
  return new;
end $$;

drop trigger if exists coupons_issued_deal on public.coupons_issued;
create trigger coupons_issued_deal before insert on public.coupons_issued
  for each row execute function public.set_coupon_deal();
