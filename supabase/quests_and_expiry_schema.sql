-- Eco-Pet: quests in the database + coupon validity and monthly limits.
-- Run AFTER the other schema files: Supabase -> SQL Editor -> paste -> Run. Safe to re-run.
--
--   * quests: title, reward, place, radius and the photo the quest asks for now live in a table
--     (edit them in Supabase -> Table Editor, no code change or deploy needed)
--   * coupons: every coupon gets an expiry date, and a vendor can cap how many are given out per month

-- ============================================================================ quests
create table if not exists public.quests (
  id text primary key,
  type text not null,
  title_en text not null,
  title_vi text not null,
  description_en text not null default '',
  description_vi text not null default '',
  destination text not null,
  lat double precision not null,
  lng double precision not null,
  radius_m int not null check (radius_m between 20 and 5000),
  reward_coins int not null check (reward_coins between 1 and 500),
  required_object text check (required_object in ('reusable water bottle', 'reusable utensils', 'bus or bus ticket')),
  required_scene text check (required_scene in ('floating market', 'traditional market', 'hiking trail', 'nature landmark')),
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.quests enable row level security;
drop policy if exists "quests_read_all" on public.quests;
create policy "quests_read_all" on public.quests for select using (true);

insert into public.quests
  (id, type, title_en, title_vi, description_en, description_vi, destination, lat, lng, radius_m, reward_coins, required_object, required_scene, sort)
values
  ('q1', 'floating_market', 'Shop at the floating market', 'Mua sắm ở chợ nổi', 'Buy something from a boat vendor and take a photo of the market scene.', 'Mua một món từ tiểu thương trên ghe và chụp ảnh khung cảnh chợ.', 'Cai Rang Floating Market', 10.0035, 105.7479, 300, 50, null, 'floating market', 1),
  ('q2', 'traditional_market', 'Explore a traditional market', 'Khám phá chợ truyền thống', 'Shop at a traditional market and support small local businesses.', 'Mua sắm ở chợ truyền thống và ủng hộ các tiểu thương địa phương.', 'Can Tho', 10.0452, 105.7469, 200, 30, null, 'traditional market', 2),
  ('q3', 'hiking', 'Hike a nature trail', 'Đi bộ đường mòn thiên nhiên', 'Walk a hiking trail and take a photo of the path.', 'Đi bộ trên một cung đường mòn và chụp ảnh con đường.', 'Tra Su', 10.5833, 105.0667, 400, 45, null, 'hiking trail', 3),
  ('q4', 'nature', 'Visit a nature landmark', 'Tham quan danh thắng thiên nhiên', 'Take a photo of a natural landmark around Ben Tre.', 'Chụp ảnh một danh thắng thiên nhiên quanh Bến Tre.', 'Ben Tre', 10.2434, 106.3756, 300, 40, null, 'nature landmark', 4),
  ('q5', 'bus', 'Take the bus, not a taxi', 'Đi xe buýt thay vì taxi', 'Ride a public bus and take a photo of the bus or your ticket.', 'Đi xe buýt công cộng và chụp ảnh xe hoặc vé của bạn.', 'Can Tho', 10.0341, 105.7722, 250, 35, 'bus or bus ticket', null, 5),
  ('q6', 'reusable_bottle', 'Bring your own water bottle', 'Mang theo bình nước cá nhân', 'Take a photo of your refillable water bottle while traveling.', 'Chụp ảnh bình nước dùng lại của bạn trong chuyến đi.', 'Can Tho', 10.0299, 105.7685, 500, 20, 'reusable water bottle', null, 6),
  ('q7', 'reusable_utensils', 'Bring your own utensils', 'Mang theo dụng cụ ăn uống cá nhân', 'Use your own utensils when eating out.', 'Dùng dụng cụ ăn uống của riêng bạn khi đi ăn ngoài.', 'Vinh Long', 10.2537, 105.9722, 500, 20, 'reusable utensils', null, 7),
  ('q8', 'redeem_coupon', 'Redeem a coupon at a partner shop', 'Dùng phiếu giảm giá tại cửa hàng đối tác', 'Use a coupon by scanning its QR code at a partner shop. Completes automatically when the coupon is used.', 'Dùng phiếu giảm giá bằng cách quét mã QR tại cửa hàng đối tác. Tự hoàn thành khi phiếu được sử dụng.', 'Can Tho', 10.0371, 105.7882, 200, 25, null, null, 8)
on conflict (id) do nothing;

-- ============================================================================ coupon validity + limits
-- valid_days: how long a coupon stays usable after a traveler gets it.
-- monthly_cap: most coupons of this kind handed out per Vietnam calendar month (null = unlimited).
alter table public.coupon_offers add column if not exists valid_days int not null default 30 check (valid_days between 1 and 365);
alter table public.coupon_offers add column if not exists monthly_cap int check (monthly_cap is null or monthly_cap >= 1);

alter table public.coupons_issued add column if not exists expires_at timestamptz;
update public.coupons_issued ci
  set expires_at = ci.issued_at + make_interval(days => coalesce((select o.valid_days from public.coupon_offers o where o.id = ci.coupon_id), 30))
  where ci.expires_at is null;

-- How many of each coupon were handed out this month. Aggregated counts only (no personal data),
-- so everyone may read it: the app shows "left this month". Runs with the owner's rights on purpose.
create or replace view public.offer_usage as
  select coupon_id as offer_id, count(*)::int as issued_this_month
  from public.coupons_issued
  where issued_at >= date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh'
  group by coupon_id;
grant select on public.offer_usage to anon, authenticated, service_role;

-- Trade coins for a coupon. Price, expiry and the monthly cap all come from coupon_offers.
create or replace function public.buy_coupon(p_user uuid, p_coupon text, p_uid text)
returns int language plpgsql security definer set search_path = public as $$
declare
  o public.coupon_offers;
  bal int;
  used int;
  m_start timestamptz := date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh';
begin
  select * into o from public.coupon_offers where id = p_coupon and active;
  if not found then
    raise exception 'coupon_unavailable';
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

-- The new-user gift: once per account; the server draws a random coupon that is active and not sold out.
create or replace function public.claim_welcome(p_user uuid, p_uid text)
returns text language plpgsql security definer set search_path = public as $$
declare
  o public.coupon_offers;
  m_start timestamptz := date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh';
begin
  insert into public.wallets (user_id) values (p_user) on conflict (user_id) do nothing;
  update public.wallets set welcome_claimed = true, updated_at = now()
    where user_id = p_user and not welcome_claimed;
  if not found then
    raise exception 'already_claimed';
  end if;
  select * into o from public.coupon_offers c
    where c.active
      and (c.monthly_cap is null
           or (select count(*) from public.coupons_issued i where i.coupon_id = c.id and i.issued_at >= m_start) < c.monthly_cap)
    order by random() limit 1;
  if not found then
    raise exception 'no_coupons';
  end if;
  insert into public.coupons_issued (uid, user_id, coupon_id, vendor_id, discount_pct, source, expires_at)
    values (p_uid, p_user, o.id, o.vendor_id, o.discount_pct, 'welcome', now() + make_interval(days => o.valid_days));
  return o.id;
end $$;

revoke all on function public.buy_coupon(uuid, text, text) from public, anon, authenticated;
revoke all on function public.claim_welcome(uuid, text) from public, anon, authenticated;
grant execute on function public.buy_coupon(uuid, text, text) to service_role;
grant execute on function public.claim_welcome(uuid, text) to service_role;
