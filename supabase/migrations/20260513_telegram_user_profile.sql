-- Allow Telegram-created users (email ends with @telegram.ommos.io or any
-- configured TELEGRAM_EMAIL_DOMAIN) to insert their own profile row.
-- Their email format is <telegram_id>@<domain>, so we expose the telegram_id
-- as a generated column for convenient lookups.

-- No schema changes are required beyond what already exists in profiles:
-- the table has (id, first_name, username, photo_url) which maps perfectly
-- to the user_metadata set by the auth-telegram edge function.

-- If you later need to query by telegram_id directly you can add:
-- CREATE INDEX idx_profiles_telegram_id
--   ON public.profiles ((raw_user_meta_data->>'telegram_id'))
--   WHERE raw_user_meta_data->>'telegram_id' IS NOT NULL;
-- (run against auth.users, not public.profiles)

-- Nothing to migrate today — the existing RLS policies on profiles already
-- allow any authenticated user to upsert their own row.
SELECT 1; -- no-op placeholder so Supabase migration runner does not error
