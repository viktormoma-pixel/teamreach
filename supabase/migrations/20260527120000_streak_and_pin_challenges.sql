-- Streak challenges (check off days) + optional PIN gate.
-- Purely additive: existing numeric challenges keep challenge_type='numeric'
-- and pin_hash NULL, so nothing about their behavior changes.

create extension if not exists pgcrypto with schema extensions;

alter table public.challenges
  add column if not exists challenge_type text not null default 'numeric'
    check (challenge_type in ('numeric', 'streak')),
  add column if not exists pin_hash text;

-- Per-user day check-offs for streak challenges.
create table if not exists public.day_checks (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  checked_date date not null,
  created_at timestamptz not null default now(),
  unique (challenge_id, user_id, checked_date)
);

create index if not exists day_checks_challenge_user_idx
  on public.day_checks (challenge_id, user_id);

alter table public.day_checks enable row level security;

-- Mirror progress_entries policies: readable by all authenticated, writable own rows.
drop policy if exists "Day checks readable by authenticated" on public.day_checks;
create policy "Day checks readable by authenticated"
  on public.day_checks for select
  to authenticated
  using (true);

drop policy if exists "Users add own day checks" on public.day_checks;
create policy "Users add own day checks"
  on public.day_checks for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own day checks" on public.day_checks;
create policy "Users delete own day checks"
  on public.day_checks for delete
  to authenticated
  using (auth.uid() = user_id);

-- Admin sets/clears a challenge PIN. Hashing happens server-side so the
-- plaintext PIN never lives in the row. Pass NULL/'' to clear.
create or replace function public.set_challenge_pin(_challenge_id uuid, _pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'permission denied: admin role required'
      using errcode = 'insufficient_privilege';
  end if;

  update public.challenges
  set pin_hash = case
        when _pin is null or btrim(_pin) = '' then null
        else encode(digest(_pin, 'sha256'), 'hex')
      end
  where id = _challenge_id;

  if not found then
    raise exception 'challenge not found' using errcode = 'no_data_found';
  end if;
end;
$$;

revoke execute on function public.set_challenge_pin(uuid, text) from public, anon;
grant execute on function public.set_challenge_pin(uuid, text) to authenticated;

-- Any authenticated user can verify a PIN to join. Returns true when the
-- challenge has no PIN (open) or the provided PIN matches the stored hash.
create or replace function public.verify_challenge_pin(_challenge_id uuid, _pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored text;
begin
  select pin_hash into stored from public.challenges where id = _challenge_id;
  if stored is null then
    return true;
  end if;
  return stored = encode(digest(coalesce(_pin, ''), 'sha256'), 'hex');
end;
$$;

revoke execute on function public.verify_challenge_pin(uuid, text) from public, anon;
grant execute on function public.verify_challenge_pin(uuid, text) to authenticated;
