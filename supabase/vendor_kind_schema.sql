-- Eco-Pet: an official category for every shop (what it sells). Safe to re-run. Run AFTER vendor_schema.sql.
--
-- kind is one of: food_drink, shopping, activity, other. The vendor picks it when registering (and can change it on
-- the Shop info page). It decides the colour and icon of a coupon, and lets the Home screen show a varied mix.

alter table public.vendors add column if not exists kind text;

-- shops that exist already: guess from the free-text type they wrote, then fix the demo shops by hand
update public.vendors set kind = case
  when category_en ~* '(food|drink|fruit|cafe|coffee|tea|restaurant|eatery|bakery|juice|snack|noodle|kitchen|beverage)' then 'food_drink'
  when category_en ~* '(souvenir|craft|gift|shop|store|market|fashion|clothes|boutique|handmade|goods)' then 'shopping'
  when category_en ~* '(bike|bicycle|rental|tour|boat|trip|guide|experience|activity|kayak|homestay)' then 'activity'
  else 'other'
end
where kind is null;

update public.vendors set kind = 'food_drink' where id in ('v1', 'v2', 'v3');
update public.vendors set kind = 'shopping' where id in ('v4', 'v5');
update public.vendors set kind = 'activity' where id = 'v6';

alter table public.vendors alter column kind set default 'other';
alter table public.vendors alter column kind set not null;
alter table public.vendors drop constraint if exists vendors_kind_check;
alter table public.vendors add constraint vendors_kind_check check (kind in ('food_drink', 'shopping', 'activity', 'other'));
