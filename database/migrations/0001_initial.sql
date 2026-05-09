-- TalentBridge Postgres slice: companies, vacancies, applications, AI audit.
-- Compatible with Neon, Supabase pooler, and vanilla Postgres.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_firebase_uid TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (owner_firebase_uid, lower(name))
);

CREATE TABLE IF NOT EXISTS vacancies (
  id TEXT PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  company_name_denorm TEXT NOT NULL,
  job_title TEXT NOT NULL,
  location TEXT NOT NULL,
  salary TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  posted_by_firebase_uid TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT vacancies_status_chk CHECK (status IN ('open', 'closed'))
);

CREATE INDEX IF NOT EXISTS vacancies_open_created_idx
  ON vacancies (status, created_at DESC, id DESC)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS vacancies_owner_idx ON vacancies (posted_by_firebase_uid);

CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id TEXT NOT NULL REFERENCES vacancies (id) ON DELETE CASCADE,
  candidate_firebase_uid TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vacancy_id, candidate_firebase_uid)
);

CREATE TABLE IF NOT EXISTS ai_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_firebase_uid TEXT,
  provider TEXT NOT NULL,
  model TEXT,
  event_type TEXT NOT NULL,
  payload_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_audit_created_idx ON ai_audit_events (created_at DESC);
