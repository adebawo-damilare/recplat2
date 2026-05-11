/**
 * Sync session state after /api/auth/* — used where we need immediate user checks (e.g. jobsApi).
 * Components should prefer useTalentBridgeUser() hook.
 */

import type { TalentBridgeUser } from "./domainTypes";

let cache: TalentBridgeUser | null = null;

/** Best-effort in-memory snapshot; refresh via refreshTalentBridgeSession(). */
export function getTalentBridgeUserSnapshot(): TalentBridgeUser | null {
  return cache;
}

export function setTalentBridgeUserSnapshot(user: TalentBridgeUser | null) {
  cache = user;
}

export async function refreshTalentBridgeSession(): Promise<TalentBridgeUser | null> {
  try {
    const res = await fetch("/api/auth/session", { credentials: "same-origin" });
    const raw = (await res.json().catch(() => ({}))) as { user?: TalentBridgeUser | null };
    const u = raw.user ?? null;
    cache = u;
    return u;
  } catch {
    cache = null;
    return null;
  }
}

export async function logoutTalentBridgeSession(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
  } finally {
    cache = null;
  }
}
