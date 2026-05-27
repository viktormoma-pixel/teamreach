-- Never ship the PIN hash to clients (offline brute-force risk for short
-- numeric PINs). Expose a boolean instead and revoke column-level SELECT on
-- the hash. The verify_challenge_pin RPC (SECURITY DEFINER) still reads it.

alter table public.challenges
  add column if not exists pin_protected boolean
    generated always as (pin_hash is not null) stored;

revoke select (pin_hash) on public.challenges from authenticated, anon;
