import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Unique (owner, lower(name)) is expression-based in SQL migrations only. */
export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
