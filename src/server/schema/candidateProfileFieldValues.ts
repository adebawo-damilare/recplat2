import { pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { categoryFields } from "./categoryFields";
import { users } from "./users";

export const candidateProfileFieldValues = pgTable(
  "candidate_profile_field_values",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fieldId: uuid("field_id")
      .notNull()
      .references(() => categoryFields.id, { onDelete: "cascade" }),
    valueText: text("value_text").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.fieldId] }),
  }),
);
