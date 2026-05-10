import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
