-- Pipeline audit: status change history + recruiter notes (apply after 0015).
-- Keeps application updates auditable without a full ATS schema.

CREATE TABLE IF NOT EXISTS application_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS application_status_events_application_idx
  ON application_status_events (application_id, created_at DESC);

CREATE TABLE IF NOT EXISTS application_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT application_notes_body_len_chk CHECK (char_length(body) <= 4000)
);

CREATE INDEX IF NOT EXISTS application_notes_application_idx
  ON application_notes (application_id, created_at DESC);
