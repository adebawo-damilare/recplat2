"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "../../src/lib/notificationsApi";
import { useTalentBridgeUser } from "../../src/lib/useTalentBridgeUser";

export default function NotificationsClientPage() {
  const router = useRouter();
  const { user, loading } = useTalentBridgeUser();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  const load = useCallback(async () => {
    setPageLoading(true);
    try {
      const data = await fetchMyNotifications();
      setItems(data.notifications);
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/sign-in");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const handleOpen = async (n: NotificationItem) => {
    if (!n.readAt) await markNotificationRead(n.id);
    await load();
    if (n.linkPath) router.push(n.linkPath);
  };

  if (loading || !user) {
    return (
      <div className="pt-24 min-h-screen bg-neutral-50/50 px-4 py-12">
        <div className="max-w-2xl mx-auto h-48 bg-white rounded-3xl border animate-pulse" />
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-neutral-50/50" data-testid="notifications-page">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl font-black text-neutral-900">Notifications</h1>
          {items.some((n) => !n.readAt) ? (
            <button
              type="button"
              onClick={() => void markAllNotificationsRead().then(load)}
              className="text-sm font-bold text-blue-600 hover:underline"
              data-testid="notifications-mark-all-read"
            >
              Mark all read
            </button>
          ) : null}
        </div>

        {pageLoading ? (
          <div className="h-40 bg-white rounded-3xl border animate-pulse" />
        ) : items.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center py-16" data-testid="notifications-empty">
            No notifications yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => void handleOpen(n)}
                  className={`w-full text-left p-5 rounded-2xl border transition-colors ${
                    n.readAt
                      ? "bg-white border-neutral-100"
                      : "bg-amber-50/60 border-amber-100"
                  }`}
                  data-testid={`notification-item-${n.id}`}
                >
                  <p className="font-bold text-neutral-900">{n.title}</p>
                  <p className="text-sm text-neutral-600 mt-1">{n.body}</p>
                  <p className="text-xs text-neutral-400 mt-2">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                  {n.linkPath ? (
                    <span className="text-xs font-bold text-blue-600 mt-2 inline-block">Open →</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}

        <Link href={user.role === "recruiter" ? "/dashboard/company" : "/dashboard/applications"} className="text-sm font-bold text-blue-600 mt-8 inline-block">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
