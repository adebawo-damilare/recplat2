-- Company membership for recruiters (multi-user access to vacancies by company).
-- Apply after 0013_notification_delivery_log.sql.

CREATE TABLE IF NOT EXISTS company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  member_role TEXT NOT NULL DEFAULT 'recruiter',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT company_members_role_chk CHECK (member_role IN ('owner', 'admin', 'recruiter')),
  CONSTRAINT company_members_company_user_uidx UNIQUE (company_id, user_id)
);

CREATE INDEX IF NOT EXISTS company_members_user_idx ON company_members (user_id);
CREATE INDEX IF NOT EXISTS company_members_company_idx ON company_members (company_id);

-- Owners from legacy companies.owner_user_id (only when user row exists)
INSERT INTO company_members (company_id, user_id, member_role)
SELECT c.id, u.id, 'owner'
FROM companies c
INNER JOIN users u ON u.id::text = c.owner_user_id
ON CONFLICT (company_id, user_id) DO NOTHING;

-- Posters who created vacancies under a company (co-recruiter access)
INSERT INTO company_members (company_id, user_id, member_role)
SELECT DISTINCT v.company_id, u.id, 'recruiter'
FROM vacancies v
INNER JOIN users u ON u.id::text = v.posted_by_user_id
ON CONFLICT (company_id, user_id) DO NOTHING;
