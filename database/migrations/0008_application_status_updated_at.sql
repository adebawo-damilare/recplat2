-- Track when application pipeline status last changed (for candidate "last updated" copy).
-- Apply after 0005_application_status.sql.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;

UPDATE applications
SET status_updated_at = COALESCE(status_updated_at, created_at);

ALTER TABLE applications
  ALTER COLUMN status_updated_at SET DEFAULT NOW();

ALTER TABLE applications
  ALTER COLUMN status_updated_at SET NOT NULL;
