-- Category templates (synthesis-aligned MVP): talent lanes for vacancy classification.
-- Apply after 0001_initial.sql:
--   node scripts/db-apply.mjs database/migrations/0002_categories.sql

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO categories (slug, label, sort_order)
VALUES
  ('marketers', 'Marketers', 10),
  ('designers', 'Designers', 20),
  ('sales', 'Sales', 30)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS vacancies_open_category_idx
  ON vacancies (category_id)
  WHERE status = 'open' AND category_id IS NOT NULL;
