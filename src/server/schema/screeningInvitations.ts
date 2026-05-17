import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { applications } from "./applications";
import { vacancies } from "./vacancies";

export const screeningInvitations = pgTable(
  "screening_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .unique()
      .references(() => applications.id, { onDelete: "cascade" }),
    vacancyId: text("vacancy_id")
      .notNull()
      .references(() => vacancies.id, { onDelete: "cascade" }),
    candidateUserId: text("candidate_user_id").notNull(),
    invitedByUserId: text("invited_by_user_id").notNull(),
    status: text("status").notNull().default("pending"),
    invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
  (t) => ({
    candidateIdx: index("screening_invitations_candidate_idx").on(t.candidateUserId, t.invitedAt),
  }),
);
