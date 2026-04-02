-- Add last_login column to track when each user last signed in.

BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
        ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login timestamptz;
    END IF;
END
$$;

COMMIT;
