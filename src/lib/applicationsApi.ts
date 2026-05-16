/**
 * Candidate application list via `/api/applications/mine`.
 */

import type { Application } from "./domainTypes";
import { refreshTalentBridgeSession } from "./authBrowser";
import { shouldFallbackToFirestoreForJobsApi } from "./talentBridgeApiMode";
import { normalizeApplicationStatus } from "./applicationStatus";

/** Maps ISO appliedAt strings from API back to shapes the UI expects. */
function normalizeApplications(payload: unknown): Application[] {
  const rows = payload as Array<{
    id: string;
    vacancyId: string;
    candidateId: string;
    appliedAt: string;
    statusUpdatedAt?: string;
    status?: unknown;
    vacancy?: Application["vacancy"];
  }>;
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => ({
    id: r.id,
    vacancyId: r.vacancyId,
    candidateId: r.candidateId,
    appliedAt: r.appliedAt,
    statusUpdatedAt: r.statusUpdatedAt,
    vacancy: r.vacancy as Application["vacancy"],
    status: normalizeApplicationStatus(r.status),
  }));
}

export type MyApplicationsFetchResult = {
  applications: Application[];
  loadFailed: boolean;
};

export async function fetchMyApplicationsWithFallback(): Promise<MyApplicationsFetchResult> {
  const u = await refreshTalentBridgeSession();
  if (!u) return { applications: [], loadFailed: false };

  try {
    const res = await fetch("/api/applications/mine", { credentials: "same-origin" });
    const raw = (await res.json().catch(() => ({}))) as { applications?: unknown; code?: string };
    if (res.ok && Array.isArray(raw.applications)) {
      return { applications: normalizeApplications(raw.applications), loadFailed: false };
    }
    if (!shouldFallbackToFirestoreForJobsApi(res.status, raw)) {
      console.warn("[applicationsApi] unexpected /api/applications/mine", res.status, raw);
    }
    return { applications: [], loadFailed: true };
  } catch (e) {
    console.warn("[applicationsApi] /api/applications/mine failed", e);
    return { applications: [], loadFailed: true };
  }
}
