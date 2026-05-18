import { refreshTalentBridgeSession } from "./authBrowser";

export type NotificationItem = {
  id: string;
  eventType: string;
  title: string;
  body: string;
  linkPath: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function fetchMyNotifications(): Promise<{
  notifications: NotificationItem[];
  unreadCount: number;
}> {
  await refreshTalentBridgeSession();
  const res = await fetch("/api/notifications/mine", { credentials: "same-origin", cache: "no-store" });
  const raw = (await res.json().catch(() => ({}))) as {
    notifications?: NotificationItem[];
    unreadCount?: number;
  };
  if (!res.ok) return { notifications: [], unreadCount: 0 };
  return {
    notifications: Array.isArray(raw.notifications) ? raw.notifications : [],
    unreadCount: typeof raw.unreadCount === "number" ? raw.unreadCount : 0,
  };
}

export async function markAllNotificationsRead(): Promise<void> {
  await fetch("/api/notifications/read-all", {
    method: "POST",
    credentials: "same-origin",
  });
}

export async function markNotificationRead(id: string): Promise<void> {
  await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: "POST",
    credentials: "same-origin",
  });
}
