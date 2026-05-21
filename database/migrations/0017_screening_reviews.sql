-- Recruiter scores for submitted screenings (per-question + optional overall note).
-- Apply after 0016_application_pipeline_audit.sql.

CREATE TABLE IF NOT EXISTS screening_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL UNIQUE REFERENCES screening_invitations (id) ON DELETE CASCADE,
  reviewer_user_id TEXT NOT NULL,
  overall_score SMALLINT,
  reviewer_note TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT screening_reviews_overall_score_chk
    CHECK (overall_score IS NULL OR (overall_score >= 1 AND overall_score <= 5))
);

CREATE INDEX IF NOT EXISTS screening_reviews_reviewer_idx
  ON screening_reviews (reviewer_user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS screening_review_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES screening_reviews (id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES category_screening_questions (id) ON DELETE CASCADE,
  score SMALLINT NOT NULL,
  question_note TEXT,
  CONSTRAINT screening_review_scores_score_chk CHECK (score >= 1 AND score <= 5),
  UNIQUE (review_id, question_id)
);

CREATE INDEX IF NOT EXISTS screening_review_scores_review_idx
  ON screening_review_scores (review_id);
