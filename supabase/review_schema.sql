-- Eco-Pet: verification log + manual review queue, general API rate limits, admin role.
-- Run AFTER the other schema files: Supabase -> SQL Editor -> paste -> Run. Safe to re-run.
--
--   * every quest photo check is logged (outcome, AI confidence, red flags, distance, fingerprints)
--   * when the AI is unsure (confidence 0.5-0.7) or the photo looks like another traveler's, the
--     attempt waits in a review queue; the photo is kept ONLY for that, and deleted once decided
--   * /api/verify and /api/itinerary get per-user and global limits that protect the free Gemini quota
--   * accounts can now have the role 'admin' (set it yourself in Table Editor -> accounts)

-- ============================================================================ admin role
alter table public.accounts drop constraint if exists accounts_role_check;
alter table public.accounts add constraint accounts_role_check check (role in ('user', 'vendor', 'admin'));

-- ============================================================================ verification log + review queue
-- Server writes only. A traveler may read their OWN rows (the app shows "under review"), and the
-- app only ever selects the small columns, never review_image.
create table if not exists public.verification_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  quest_id text not null,
  outcome text not null check (outcome in ('verified', 'rejected', 'review')),
  reason text not null,              -- verified | too_far | stale | duplicate | similar_photo | screenshot | suspicious | low_confidence | not_detected | ...
  confidence real,
  quest_met boolean,
  red_flags text[] not null default '{}',
  ai_reason text,
  distance_m int,                    -- how far from the quest spot (we do not keep the coordinates)
  photo_hash text,                   -- exact fingerprint (SHA-256)
  photo_phash text,                  -- perceptual fingerprint (16 hex chars), to spot re-photographed pictures
  review_image text,                 -- base64 JPEG, ONLY while outcome = 'review' and review_status = 'pending'
  review_status text check (review_status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists verif_quest_idx on public.verification_attempts (quest_id, created_at desc);
create index if not exists verif_user_idx on public.verification_attempts (user_id, created_at desc);
create index if not exists verif_pending_idx on public.verification_attempts (created_at) where review_status = 'pending';

alter table public.verification_attempts enable row level security;
drop policy if exists "verif_select_own" on public.verification_attempts;
create policy "verif_select_own" on public.verification_attempts for select using (user_id = auth.uid());

-- ============================================================================ general API rate limits
create table if not exists public.api_hits (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,                -- 'verify' | 'itinerary' | ...
  at timestamptz not null default now()
);
create index if not exists api_hits_user_idx on public.api_hits (user_id, kind, at desc);
create index if not exists api_hits_kind_idx on public.api_hits (kind, at desc);

-- Server only: RLS on and no policies.
alter table public.api_hits enable row level security;

-- Returns 'ok' (and records the call) or why it was refused: per_minute | per_day | global.
-- Days are Vietnam calendar days. Same idea as chat_hit, but for any kind of call.
create or replace function public.api_hit(p_user uuid, p_kind text, p_per_minute int, p_per_day int, p_global_per_day int)
returns text language plpgsql security definer set search_path = public as $$
declare
  m int;
  d int;
  g int;
  day_start timestamptz := date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh';
begin
  perform pg_advisory_xact_lock(hashtext(p_user::text || ':' || p_kind));
  delete from public.api_hits where at < now() - interval '3 days';

  select count(*) into m from public.api_hits where user_id = p_user and kind = p_kind and at > now() - interval '1 minute';
  if m >= p_per_minute then
    return 'per_minute';
  end if;

  select count(*) into d from public.api_hits where user_id = p_user and kind = p_kind and at >= day_start;
  if d >= p_per_day then
    return 'per_day';
  end if;

  select count(*) into g from public.api_hits where kind = p_kind and at >= day_start;
  if g >= p_global_per_day then
    return 'global';
  end if;

  insert into public.api_hits (user_id, kind) values (p_user, p_kind);
  return 'ok';
end $$;

revoke all on function public.api_hit(uuid, text, int, int, int) from public, anon, authenticated;
grant execute on function public.api_hit(uuid, text, int, int, int) to service_role;
