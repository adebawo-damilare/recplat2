-- Per-lane profile field templates + candidate values.
-- Apply after 0009_marketers_screening.sql.

CREATE TABLE IF NOT EXISTS category_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  field_type TEXT NOT NULL DEFAULT 'text',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT category_fields_field_type_chk CHECK (field_type IN ('text', 'textarea')),
  UNIQUE (category_id, field_key)
);

CREATE INDEX IF NOT EXISTS category_fields_category_sort_idx
  ON category_fields (category_id, sort_order);

CREATE TABLE IF NOT EXISTS candidate_profile_field_values (
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES category_fields (id) ON DELETE CASCADE,
  value_text TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, field_id)
);

ALTER TABLE candidate_profiles
  ADD COLUMN IF NOT EXISTS primary_talent_lane_slug TEXT;

-- Seed field definitions (idempotent per category + field_key).
INSERT INTO category_fields (category_id, field_key, label, sort_order, field_type)
SELECT c.id, v.field_key, v.label, v.sort_order, v.field_type
FROM categories c
CROSS JOIN (
  VALUES
    ('marketers', 'years_experience', 'Years in marketing', 10, 'text'),
    ('marketers', 'primary_channels', 'Primary channels', 20, 'textarea'),
    ('marketers', 'marketing_tools', 'Tools & platforms', 30, 'text'),
    ('designers', 'years_experience', 'Years in design', 10, 'text'),
    ('designers', 'design_tools', 'Design tools', 20, 'text'),
    ('designers', 'portfolio_focus', 'Portfolio focus', 30, 'textarea'),
    ('sales', 'years_experience', 'Years in sales', 10, 'text'),
    ('sales', 'sales_motion', 'Sales motion', 20, 'text'),
    ('sales', 'quota_highlight', 'Quota / attainment highlight', 30, 'textarea')
) AS v(slug, field_key, label, sort_order, field_type)
WHERE c.slug = v.slug
  AND NOT EXISTS (
    SELECT 1
    FROM category_fields f
    WHERE f.category_id = c.id AND f.field_key = v.field_key
  );
