"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { fetchMyNotifications } from "../../lib/notificationsApi";
import { useTalentBridgeUser } from "../../lib/useTalentBridgeUser";

export default function NotificationsNavLink() {
  const pathname = usePathname();
  const { user } = useTalentBridgeUser();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    void fetchMyNotifications().then((r) => setUnreadCount(r.unreadCount));
  }, [user, pathname]);

  if (!user) return null;

  const active = pathname === "/dashboard/notifications";

  return (
    <Link
      href="/dashboard/notifications"
      className={`relative text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
        active ? "bg-amber-500 text-white shadow-lg" : "text-neutral-500 hover:bg-neutral-100"
      }`}
      data-testid="nav-notifications"
    >
      <span className="inline-flex items-center gap-1">
        <Bell className="w-3.5 h-3.5" aria-hidden />
        Alerts
      </span>
      {unreadCount > 0 ? (
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center"
          data-testid="nav-notifications-unread-count"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
