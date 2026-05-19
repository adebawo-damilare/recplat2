-- Rename company team role "admin" → "manager" (avoids confusion with platform admin).
-- Apply after 0014_company_members.sql.

UPDATE company_members SET member_role = 'manager' WHERE member_role = 'admin';

ALTER TABLE company_members DROP CONSTRAINT IF EXISTS company_members_role_chk;

ALTER TABLE company_members
  ADD CONSTRAINT company_members_role_chk
  CHECK (member_role IN ('owner', 'manager', 'recruiter'));
