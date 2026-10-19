-- Eco-Pet schema. Paste into Supabase -> SQL Editor -> Run. Safe to re-run.

-- One row per user. `state` holds coins, quests, coupons, chat history, etc. (prototype shortcut).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Hashes of verified quest photos, to reject duplicates. Only the server (service_role key)
-- touches this table: RLS is on and there are deliberately no policies for normal users.
create table if not exists public.photo_hashes (
  hash text primary key,
  quest_id text not null,
  created_at timestamptz not null default now()
);

alter table public.photo_hashes enable row level security;
