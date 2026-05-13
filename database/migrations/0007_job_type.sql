-- Employment / work arrangement (distinct from free-text location).
ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS job_type text;

UPDATE vacancies SET job_type = 'full_time' WHERE job_type IS NULL;

ALTER TABLE vacancies ALTER COLUMN job_type SET NOT NULL;
ALTER TABLE vacancies ALTER COLUMN job_type SET DEFAULT 'full_time';

ALTER TABLE vacancies DROP CONSTRAINT IF EXISTS vacancies_job_type_check;
ALTER TABLE vacancies ADD CONSTRAINT vacancies_job_type_check
  CHECK (job_type IN ('full_time', 'hybrid', 'part_time', 'remote'));
