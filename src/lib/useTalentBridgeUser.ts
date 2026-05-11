"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { TalentBridgeUser } from "./domainTypes";
import { logoutTalentBridgeSession, refreshTalentBridgeSession, setTalentBridgeUserSnapshot } from "./authBrowser";

export function useTalentBridgeUser() {
  const [user, setUser] = useState<TalentBridgeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    const u = await refreshTalentBridgeSession();
    setTalentBridgeUserSnapshot(u);
    setUser(u);
    return u;
  }, []);

  // Re-fetch when the route changes. Root layout + nav stay mounted across client
  // navigations (e.g. /sign-in → /), so a mount-only effect would leave stale `user`
  // until a full page reload.
  useEffect(() => {
    let cancelled = false;
    refresh().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refresh, pathname]);

  const logout = useCallback(async () => {
    await logoutTalentBridgeSession();
    setTalentBridgeUserSnapshot(null);
    setUser(null);
  }, []);

  return { user, loading, refresh, logout };
}
