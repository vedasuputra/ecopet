-- Eco-Pet: is the traveler domestic (from Vietnam) or international? Safe to re-run.
-- Chosen when signing up and saved here so it can be reported on. Domestic travelers are not asked how long they stay.

alter table public.profiles add column if not exists traveler_type text check (traveler_type in ('domestic', 'international'));
