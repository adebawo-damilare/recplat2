-- Split candidate_profiles.full_name into first_name + last_name.
-- Apply after 0005_application_status.sql:
--   npm run db:apply:candidate-name-split

ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT '';
ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'candidate_profiles'
      AND column_name = 'full_name'
  ) THEN
    UPDATE candidate_profiles
    SET
      first_name = CASE
        WHEN trim(COALESCE(full_name, '')) = '' THEN ''
        ELSE split_part(trim(full_name), ' ', 1)
      END,
      last_name = CASE
        WHEN trim(COALESCE(full_name, '')) = '' THEN ''
        ELSE trim(regexp_replace(trim(full_name), '^[^\s]+\s*', ''))
      END;

    ALTER TABLE candidate_profiles DROP COLUMN full_name;
  END IF;
END $$;
