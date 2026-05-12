-- Postgres-native auth users + candidate profiles; rename *_firebase_uid → *_user_id.
-- Apply after database/migrations/0002_categories.sql:
--   node scripts/db-apply.mjs database/migrations/0003_users_auth.sql

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uidx ON users (lower(email));

CREATE TABLE IF NOT EXISTS candidate_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email_snapshot TEXT NOT NULL DEFAULT '',
  headline TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  skills TEXT NOT NULL DEFAULT '',
  experience TEXT NOT NULL DEFAULT '',
  portfolio_url TEXT,
  portfolio_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP INDEX IF EXISTS companies_owner_uid_name_lower_uidx;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'companies'
      AND column_name = 'owner_firebase_uid'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'companies'
      AND column_name = 'owner_user_id'
  ) THEN
    ALTER TABLE companies RENAME COLUMN owner_firebase_uid TO owner_user_id;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS companies_owner_user_name_lower_uidx
  ON companies (owner_user_id, (lower(name)));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'vacancies'
      AND column_name = 'posted_by_firebase_uid'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'vacancies'
      AND column_name = 'posted_by_user_id'
  ) THEN
    ALTER TABLE vacancies RENAME COLUMN posted_by_firebase_uid TO posted_by_user_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'applications'
      AND column_name = 'candidate_firebase_uid'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'applications'
      AND column_name = 'candidate_user_id'
  ) THEN
    ALTER TABLE applications RENAME COLUMN candidate_firebase_uid TO candidate_user_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'ai_audit_events'
      AND column_name = 'actor_firebase_uid'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'ai_audit_events'
      AND column_name = 'actor_user_id'
  ) THEN
    ALTER TABLE ai_audit_events RENAME COLUMN actor_firebase_uid TO actor_user_id;
  END IF;
END $$;
