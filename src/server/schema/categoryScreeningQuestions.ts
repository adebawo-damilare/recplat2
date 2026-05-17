import { boolean, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { categories } from "./categories";

export const categoryScreeningQuestions = pgTable(
  "category_screening_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    prompt: text("prompt").notNull(),
    responseType: text("response_type").notNull().default("textarea"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    categorySortUniq: unique("category_screening_questions_category_sort_uidx").on(
      t.categoryId,
      t.sortOrder,
    ),
  }),
);
