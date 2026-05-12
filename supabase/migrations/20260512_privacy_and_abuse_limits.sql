-- Migration: privacy hardening + progress abuse limits
--
-- 1) Hide profiles.email from other authenticated users.
--    Row-level "using (true)" remains so participants/avatars stay visible,
--    but column-level SELECT on `email` is revoked from `authenticated`.
--    Users still see their own email via auth.users / supabase.auth.getUser().
--
-- 2) Tighten the per-entry amount cap and add a per-day per-(user, challenge)
--    cap so a single user cannot dominate the leaderboard with one huge entry
--    or by spamming thousands of entries.

-- ---------- 1. Email column privacy ----------------------------------------

-- Column-level revokes only take effect when table-level SELECT is absent.
-- Supabase grants full table-level SELECT to anon/authenticated by default,
-- so revoke that first, then re-grant SELECT only on non-email columns.
revoke select on public.profiles from anon, authenticated;

grant select
  (id, telegram_id, username, first_name, last_name,
   photo_url, language_code, created_at, updated_at)
  on public.profiles to authenticated;

-- ---------- 2. Anti-abuse on progress_entries ------------------------------

-- Lower the per-entry hard cap from 1_000_000 to a sane 10_000.
-- (Reps, minutes, pages — nothing legitimate exceeds this.)
alter table public.progress_entries
  drop constraint if exists progress_entries_amount_check;

alter table public.progress_entries
  add constraint progress_entries_amount_check
  check (amount > 0 and amount <= 10000);

-- Per-day per-(user, challenge) entry-count cap: max 50 entries.
-- Prevents brute-spam of leaderboard while still allowing legitimate
-- incremental logging throughout the day.
create or replace function public.enforce_progress_daily_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _count int;
begin
  select count(*) into _count
  from public.progress_entries
  where user_id = new.user_id
    and challenge_id = new.challenge_id
    and created_at >= date_trunc('day', now());

  if _count >= 50 then
    raise exception 'progress_daily_cap_exceeded'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_progress_daily_cap()
  from public, anon, authenticated;

drop trigger if exists trg_progress_daily_cap on public.progress_entries;
create trigger trg_progress_daily_cap
  before insert on public.progress_entries
  for each row execute function public.enforce_progress_daily_cap();

-- Per-day per-(user, challenge) total-amount cap: max 10_000 units.
-- Defense in depth: even if someone makes 50 entries of 200 each, that's
-- still 10_000 — anything beyond that is almost certainly abuse.
create or replace function public.enforce_progress_daily_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _sum int;
begin
  select coalesce(sum(amount), 0) into _sum
  from public.progress_entries
  where user_id = new.user_id
    and challenge_id = new.challenge_id
    and created_at >= date_trunc('day', now());

  if _sum + new.amount > 10000 then
    raise exception 'progress_daily_total_exceeded'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_progress_daily_total()
  from public, anon, authenticated;

drop trigger if exists trg_progress_daily_total on public.progress_entries;
create trigger trg_progress_daily_total
  before insert on public.progress_entries
  for each row execute function public.enforce_progress_daily_total();

-- Index to keep the daily-cap lookups cheap.
create index if not exists progress_entries_user_challenge_created_idx
  on public.progress_entries (user_id, challenge_id, created_at);
