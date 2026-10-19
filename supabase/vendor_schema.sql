-- Eco-Pet vendor dashboard schema. Run AFTER schema.sql: Supabase -> SQL Editor -> paste -> Run.
-- Safe to re-run.

-- Business listings. Readable by everyone (they appear on the traveler map). Written only by the server.
create table if not exists public.vendors (
  id text primary key,
  name text not null,
  category_en text not null default '',
  category_vi text not null default '',
  lat double precision,
  lng double precision,
  plan text not null default 'monthly' check (plan in ('monthly', 'semester', 'annual')),
  plan_started_at timestamptz,
  owner_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.vendors enable row level security;
drop policy if exists "vendors_read_all" on public.vendors;
create policy "vendors_read_all" on public.vendors for select using (true);

insert into public.vendors (id, name, category_en, category_vi, lat, lng) values
  ('v1', 'Ba Tu Fruit Boat',      'Fruit & drinks', 'Trái cây & đồ uống', 10.0038, 105.7485),
  ('v2', 'Cafe Sen Xanh',         'Cafe',           'Quán cà phê',        10.0455, 105.7475),
  ('v3', 'Banh Xeo Co Lan',       'Food',           'Ẩm thực',            10.0442, 105.7461),
  ('v4', 'Coconut Candy Ben Tre', 'Souvenirs',      'Quà lưu niệm',       10.2438, 106.3761),
  ('v5', 'Mekong Craft Corner',   'Crafts',         'Đồ thủ công',        10.0345, 105.7728),
  ('v6', 'Green Bike Rental',     'Bike rental',    'Cho thuê xe đạp',    10.0372, 105.7879)
on conflict (id) do nothing;

-- Two kinds of account: 'user' (traveler) and 'vendor'. Everyone starts as 'user'.
-- The trigger ignores any role the client asks for during sign-up; only the server (service_role)
-- can promote an account to 'vendor', and only after a business listing is claimed.
create table if not exists public.accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'vendor')),
  vendor_id text references public.vendors (id),
  created_at timestamptz not null default now()
);

alter table public.accounts enable row level security;
drop policy if exists "accounts_select_own" on public.accounts;
create policy "accounts_select_own" on public.accounts for select using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.accounts (id, role) values (new.id, 'user') on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- accounts for users who signed up before this update
insert into public.accounts (id) select id from auth.users on conflict (id) do nothing;

-- Which business the signed-in vendor account belongs to (null for travelers).
create or replace function public.vendor_of() returns text
language sql stable security definer set search_path = public as $$
  select vendor_id from public.accounts where id = auth.uid() and role = 'vendor'
$$;

-- Every coupon a traveler gets, and what happened to it. Travelers may insert unused rows for
-- themselves; only the server marks a coupon redeemed. Vendors can read the rows of their own business.
create table if not exists public.coupons_issued (
  uid text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  coupon_id text not null,
  vendor_id text not null references public.vendors (id),
  discount_pct int not null,
  source text not null check (source in ('coins', 'welcome')),
  status text not null default 'unused' check (status in ('unused', 'used')),
  issued_at timestamptz not null default now(),
  redeemed_at timestamptz,
  amount_vnd int,
  commission_vnd int
);

create index if not exists coupons_issued_vendor_idx on public.coupons_issued (vendor_id, issued_at desc);
create index if not exists coupons_issued_user_idx on public.coupons_issued (user_id);

alter table public.coupons_issued enable row level security;
drop policy if exists "issued_select" on public.coupons_issued;
drop policy if exists "issued_insert_own" on public.coupons_issued;

create policy "issued_select" on public.coupons_issued
  for select using (user_id = auth.uid() or vendor_id = public.vendor_of());

create policy "issued_insert_own" on public.coupons_issued
  for insert with check (
    user_id = auth.uid() and status = 'unused'
    and redeemed_at is null and amount_vnd is null and commission_vnd is null
  );
