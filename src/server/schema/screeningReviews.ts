import { index, pgTable, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { screeningInvitations } from "./screeningInvitations";

export const screeningReviews = pgTable(
  "screening_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invitationId: uuid("invitation_id")
      .notNull()
      .unique()
      .references(() => screeningInvitations.id, { onDelete: "cascade" }),
    reviewerUserId: text("reviewer_user_id").notNull(),
    overallScore: smallint("overall_score"),
    reviewerNote: text("reviewer_note"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    reviewerIdx: index("screening_reviews_reviewer_idx").on(t.reviewerUserId, t.updatedAt),
  }),
);
