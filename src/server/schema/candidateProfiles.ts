import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const candidateProfiles = pgTable("candidate_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  emailSnapshot: text("email_snapshot").notNull(),
  headline: text("headline").notNull(),
  summary: text("summary").notNull(),
  skills: text("skills").notNull(),
  experience: text("experience").notNull(),
  portfolioUrl: text("portfolio_url"),
  portfolioContent: text("portfolio_content"),
  primaryTalentLaneSlug: text("primary_talent_lane_slug"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
