-- Eco-Pet: a traveler can report that the AI rejected a photo by mistake. Safe to re-run.
-- Run AFTER review_schema.sql.
--
-- A report puts the rejected attempt into the SAME review queue the admin already uses (/admin):
-- the photo the traveler sent is kept only until an admin decides, then deleted, as for any review.
-- Approve = the traveler is paid; reject = they can try again.

alter table public.verification_attempts add column if not exists reported_by_user boolean not null default false;
alter table public.verification_attempts add column if not exists user_note text;
alter table public.verification_attempts add column if not exists reported_at timestamptz;
