-- Marketers-lane screening pilot: question templates, invitations, answers.
-- Apply after 0008_application_status_updated_at.sql.

CREATE TABLE IF NOT EXISTS category_screening_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  prompt TEXT NOT NULL,
  response_type TEXT NOT NULL DEFAULT 'textarea',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT category_screening_questions_response_type_chk
    CHECK (response_type IN ('text', 'textarea'))
);

CREATE UNIQUE INDEX IF NOT EXISTS category_screening_questions_category_sort_uidx
  ON category_screening_questions (category_id, sort_order);

CREATE TABLE IF NOT EXISTS screening_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL UNIQUE REFERENCES applications (id) ON DELETE CASCADE,
  vacancy_id TEXT NOT NULL REFERENCES vacancies (id) ON DELETE CASCADE,
  candidate_user_id TEXT NOT NULL,
  invited_by_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  CONSTRAINT screening_invitations_status_chk CHECK (status IN ('pending', 'submitted'))
);

CREATE INDEX IF NOT EXISTS screening_invitations_candidate_idx
  ON screening_invitations (candidate_user_id, invited_at DESC);

CREATE TABLE IF NOT EXISTS screening_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES screening_invitations (id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES category_screening_questions (id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (invitation_id, question_id)
);

INSERT INTO category_screening_questions (category_id, sort_order, prompt, response_type)
SELECT c.id, v.sort_order, v.prompt, 'textarea'
FROM categories c
CROSS JOIN (
  VALUES
    (
      10,
      'Describe a marketing campaign you led recently. What was the goal, channel mix, and how did you measure success?'
    ),
    (20, 'Which audiences or segments do you most enjoy working on, and why?'),
    (30, 'Share a link or short write-up of work you are proud of (campaign, landing page, content, etc.).'),
    (40, 'What tools do you use day-to-day for analytics, content, and collaboration?')
) AS v(sort_order, prompt)
WHERE c.slug = 'marketers'
  AND NOT EXISTS (
    SELECT 1
    FROM category_screening_questions q
    WHERE q.category_id = c.id
  );
