import { index, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

/** Matches `database/migrations/0001_initial.sql` (unique constraint is expression-based in SQL only). */
export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerFirebaseUid: text("owner_firebase_uid").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vacancies = pgTable(
  "vacancies",
  {
    id: text("id").primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    companyNameDenorm: text("company_name_denorm").notNull(),
    jobTitle: text("job_title").notNull(),
    location: text("location").notNull(),
    salary: text("salary").notNull(),
    description: text("description").notNull(),
    requirements: text("requirements").notNull(),
    status: text("status").notNull().default("open"),
    postedByFirebaseUid: text("posted_by_firebase_uid").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    openCreatedIdx: index("vacancies_open_created_idx").on(t.status, t.createdAt, t.id),
    ownerIdx: index("vacancies_owner_idx").on(t.postedByFirebaseUid),
  }),
);

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

export const aiAuditEvents = pgTable(
  "ai_audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorFirebaseUid: text("actor_firebase_uid"),
    provider: text("provider").notNull(),
    model: text("model"),
    eventType: text("event_type").notNull(),
    payloadJson: jsonb("payload_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    createdIdx: index("ai_audit_created_idx").on(t.createdAt),
  }),
);
