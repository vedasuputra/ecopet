-- Eco-Pet: is the traveler domestic (from Vietnam) or international? Safe to re-run.
-- Chosen when signing up and saved here so it can be reported on. Domestic travelers are not asked how long they stay.

alter table public.profiles add column if not exists traveler_type text check (traveler_type in ('domestic', 'international'));

-- Each coupon remembers whether the traveler who got it is domestic or international, so a shop can see how many of
-- its customers are which (only these two counts: a shop never sees who the traveler is).
alter table public.coupons_issued add column if not exists traveler_type text;

create or replace function public.set_coupon_traveler_type() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select traveler_type into new.traveler_type from public.profiles where id = new.user_id;
  return new;
end $$;

drop trigger if exists coupons_issued_traveler_type on public.coupons_issued;
create trigger coupons_issued_traveler_type before insert on public.coupons_issued
  for each row execute function public.set_coupon_traveler_type();

-- coupons issued before this existed
update public.coupons_issued ci set traveler_type = p.traveler_type
  from public.profiles p where p.id = ci.user_id and ci.traveler_type is null and p.traveler_type is not null;
