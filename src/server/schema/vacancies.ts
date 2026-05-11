import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { companies } from "./companies";

export const vacancies = pgTable(
  "vacancies",
  {
    id: text("id").primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    companyNameDenorm: text("company_name_denorm").notNull(),
    jobTitle: text("job_title").notNull(),
    location: text("location").notNull(),
    salary: text("salary").notNull(),
    description: text("description").notNull(),
    requirements: text("requirements").notNull(),
    status: text("status").notNull().default("open"),
    postedByUserId: text("posted_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    openCreatedIdx: index("vacancies_open_created_idx").on(t.status, t.createdAt, t.id),
    ownerIdx: index("vacancies_owner_idx").on(t.postedByUserId),
    // Partial index vacancies_open_category_idx is created in migration 0002_categories.sql only.
  }),
);
