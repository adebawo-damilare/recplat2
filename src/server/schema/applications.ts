import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { vacancies } from "./vacancies";

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vacancyId: text("vacancy_id")
      .notNull()
      .references(() => vacancies.id, { onDelete: "cascade" }),
    candidateFirebaseUid: text("candidate_firebase_uid").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqVacancyCandidate: unique().on(t.vacancyId, t.candidateFirebaseUid),
  }),
);
