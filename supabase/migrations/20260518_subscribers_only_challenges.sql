-- Add subscribers_only flag to challenges.
-- When true, only users with subscription_tier = 'premium' are expected
-- to join the challenge. Enforcement is done client-side (paywall UI);
-- no RLS restriction is added so the card is still visible to all users.
ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS subscribers_only BOOLEAN NOT NULL DEFAULT FALSE;
