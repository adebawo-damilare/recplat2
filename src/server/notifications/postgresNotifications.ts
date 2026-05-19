import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { getDrizzleDb } from "../db/postgres";
import { notificationDeliveryLog, notifications } from "../schema";
import { deliverNotificationEmail } from "./emailDelivery";

export type NotificationDeliveryDto = {
  channel: string;
  status: string;
};

export type NotificationDto = {
  id: string;
  eventType: string;
  title: string;
  body: string;
  linkPath: string | null;
  readAt: string | null;
  createdAt: string;
  delivery?: NotificationDeliveryDto[];
};

export async function createNotification(input: {
  userId: string;
  eventType: string;
  title: string;
  body: string;
  linkPath?: string | null;
  payload?: unknown;
}): Promise<string | null> {
  const db = getDrizzleDb();
  const [row] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      eventType: input.eventType,
      title: input.title,
      body: input.body,
      linkPath: input.linkPath ?? null,
      payloadJson: input.payload ?? null,
    })
    .returning({ id: notifications.id });

  const notificationId = row?.id;
  if (notificationId) {
    await db.insert(notificationDeliveryLog).values({
      notificationId,
      channel: "in_app",
      status: "delivered",
      detail: null,
    });
    void deliverNotificationEmail({
      notificationId,
      userId: input.userId,
      title: input.title,
      body: input.body,
      linkPath: input.linkPath,
    }).catch(() => {
      /* ledger records failure/skipped */
    });
  }
  return notificationId ?? null;
}

function exposeDeliveryInApi(): boolean {
  return process.env.TALENTBRIDGE_E2E_EXPOSE_NOTIFICATION_DELIVERY === "1";
}

async function attachDelivery(
  items: NotificationDto[],
): Promise<NotificationDto[]> {
  if (!exposeDeliveryInApi() || items.length === 0) return items;

  const db = getDrizzleDb();
  const ids = items.map((n) => n.id);
  const deliveryRows = await db
    .select({
      notificationId: notificationDeliveryLog.notificationId,
      channel: notificationDeliveryLog.channel,
      status: notificationDeliveryLog.status,
    })
    .from(notificationDeliveryLog)
    .where(inArray(notificationDeliveryLog.notificationId, ids));

  const byNotification = new Map<string, NotificationDeliveryDto[]>();
  for (const row of deliveryRows) {
    const list = byNotification.get(row.notificationId) ?? [];
    list.push({ channel: row.channel, status: row.status });
    byNotification.set(row.notificationId, list);
  }

  return items.map((n) => ({
    ...n,
    delivery: byNotification.get(n.id) ?? [],
  }));
}

export async function listNotificationsForUser(
  userId: string,
  limit = 30,
  options?: { includeDelivery?: boolean },
): Promise<NotificationDto[]> {
  const db = getDrizzleDb();
  const cap = Math.max(1, Math.min(50, limit));
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(cap);

  const mapped = rows.map((r) => ({
    id: r.id,
    eventType: r.eventType,
    title: r.title,
    body: r.body,
    linkPath: r.linkPath,
    readAt: r.readAt ? r.readAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  if (options?.includeDelivery && exposeDeliveryInApi()) {
    return attachDelivery(mapped);
  }
  return mapped;
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const db = getDrizzleDb();
  const rows = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return Number(rows[0]?.value ?? 0);
}

export async function markNotificationRead(
  notificationId: string,
  userId: string,
): Promise<boolean> {
  const db = getDrizzleDb();
  const rows = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning({ id: notifications.id });
  return Boolean(rows[0]?.id);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const db = getDrizzleDb();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
