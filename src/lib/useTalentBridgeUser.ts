"use client";

import { useCallback, useEffect, useState } from "react";
import type { TalentBridgeUser } from "./domainTypes";
import { logoutTalentBridgeSession, refreshTalentBridgeSession, setTalentBridgeUserSnapshot } from "./authBrowser";

export function useTalentBridgeUser() {
  const [user, setUser] = useState<TalentBridgeUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const u = await refreshTalentBridgeSession();
    setTalentBridgeUserSnapshot(u);
    setUser(u);
    return u;
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const logout = useCallback(async () => {
    await logoutTalentBridgeSession();
    setTalentBridgeUserSnapshot(null);
    setUser(null);
  }, []);

  return { user, loading, refresh, logout };
}
