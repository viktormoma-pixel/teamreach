-- Migration: soft-delete for challenges
--
-- Admin "delete" previously did a hard DELETE that cascaded to participants
-- and progress_entries — a single misclick wiped every team's data. We now
-- mark challenges as archived; rows stay in the DB so we can restore.
--
-- Client reads filter out archived rows via RLS, so existing
-- `select * from challenges` calls keep working without app-side changes.

alter table public.challenges
  add column if not exists archived_at timestamptz;

create index if not exists challenges_active_idx
  on public.challenges (created_at desc)
  where archived_at is null;

-- Replace the readable-by-authenticated policy so archived rows are hidden
-- from regular reads. Admins can still see them via a dedicated view if/when
-- we build a restore UI.
drop policy if exists "Challenges readable by authenticated" on public.challenges;
create policy "Challenges readable by authenticated"
  on public.challenges for select to authenticated
  using (archived_at is null);

-- Admins update archived_at via the normal update policy — no new policy
-- needed. The existing "Admins update challenges" policy already grants this.
