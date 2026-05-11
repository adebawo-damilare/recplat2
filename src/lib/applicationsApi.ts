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
    status?: unknown;
    vacancy?: Application["vacancy"];
  }>;
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => ({
    id: r.id,
    vacancyId: r.vacancyId,
    candidateId: r.candidateId,
    appliedAt: r.appliedAt,
    vacancy: r.vacancy as Application["vacancy"],
    status: normalizeApplicationStatus(r.status),
  }));
}

export async function fetchMyApplicationsWithFallback(): Promise<Application[]> {
  const u = await refreshTalentBridgeSession();
  if (!u) return [];

  try {
    const res = await fetch("/api/applications/mine", { credentials: "same-origin" });
    const raw = (await res.json().catch(() => ({}))) as { applications?: unknown; code?: string };
    if (res.ok && raw.applications) {
      return normalizeApplications(raw.applications);
    }
    if (!shouldFallbackToFirestoreForJobsApi(res.status, raw)) {
      console.warn("[applicationsApi] unexpected /api/applications/mine", res.status);
    }
  } catch (e) {
    console.warn("[applicationsApi] /api/applications/mine failed", e);
  }

  return [];
}
