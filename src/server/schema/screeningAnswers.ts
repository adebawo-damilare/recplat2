import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { categoryScreeningQuestions } from "./categoryScreeningQuestions";
import { screeningInvitations } from "./screeningInvitations";

export const screeningAnswers = pgTable(
  "screening_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => screeningInvitations.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => categoryScreeningQuestions.id, { onDelete: "cascade" }),
    answerText: text("answer_text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    invitationQuestionUniq: unique().on(t.invitationId, t.questionId),
  }),
);
