-- Application pipeline status for recruiter workflow.
-- Apply after 0004_user_roles.sql.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS status TEXT;

UPDATE applications
SET status = COALESCE(NULLIF(trim(status), ''), 'applied');

ALTER TABLE applications
  ALTER COLUMN status SET DEFAULT 'applied';

ALTER TABLE applications
  ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'applications_status_chk'
  ) THEN
    ALTER TABLE applications
      ADD CONSTRAINT applications_status_chk
      CHECK (status IN ('applied', 'viewed', 'interviewing', 'rejected', 'hired'));
  END IF;
END $$;
