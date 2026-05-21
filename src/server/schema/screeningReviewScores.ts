import { index, pgTable, smallint, text, uuid } from "drizzle-orm/pg-core";
import { categoryScreeningQuestions } from "./categoryScreeningQuestions";
import { screeningReviews } from "./screeningReviews";

export const screeningReviewScores = pgTable(
  "screening_review_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => screeningReviews.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => categoryScreeningQuestions.id, { onDelete: "cascade" }),
    score: smallint("score").notNull(),
    questionNote: text("question_note"),
  },
  (t) => ({
    reviewIdx: index("screening_review_scores_review_idx").on(t.reviewId),
  }),
);
