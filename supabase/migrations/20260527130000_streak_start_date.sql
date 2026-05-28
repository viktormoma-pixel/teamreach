-- Streak challenges gain an explicit start date so the "check off days" grid
-- spans the admin-chosen window (starts_at .. deadline) instead of a fixed
-- trailing 14 days. Additive and nullable: numeric challenges and pre-existing
-- streaks leave it NULL and fall back to created_at on the client.

alter table public.challenges
  add column if not exists starts_at date;
