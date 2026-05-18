import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { notifications } from "./notifications";

export const notificationDeliveryLog = pgTable(
  "notification_delivery_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    notificationId: uuid("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    status: text("status").notNull(),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    notificationIdx: index("notification_delivery_log_notification_idx").on(
      t.notificationId,
      t.createdAt,
    ),
  }),
);
