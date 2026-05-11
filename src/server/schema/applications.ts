import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { vacancies } from "./vacancies";

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vacancyId: text("vacancy_id")
      .notNull()
      .references(() => vacancies.id, { onDelete: "cascade" }),
    candidateUserId: text("candidate_user_id").notNull(),
    status: text("status").notNull().default("applied"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqVacancyCandidate: unique().on(t.vacancyId, t.candidateUserId),
  }),
);
