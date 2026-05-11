-- Add explicit user role for server-side authorization checks.
-- Apply after 0003_users_auth.sql.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT;

UPDATE users
SET role = COALESCE(NULLIF(trim(role), ''), 'candidate');

ALTER TABLE users
  ALTER COLUMN role SET DEFAULT 'candidate';

ALTER TABLE users
  ALTER COLUMN role SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_role_chk'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_role_chk CHECK (role IN ('candidate', 'recruiter'));
  END IF;
END $$;
