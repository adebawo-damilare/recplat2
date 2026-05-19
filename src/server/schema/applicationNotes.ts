import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { applications } from "./applications";
import { users } from "./users";

export const applicationNotes = pgTable(
  "application_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    applicationIdx: index("application_notes_application_idx").on(t.applicationId, t.createdAt),
  }),
);
