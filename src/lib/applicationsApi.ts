/**
 * Candidate application list: prefer Postgres-backed `/api/applications/mine`.
 */

import type { Application } from "./firebase";
import { auth } from "./firebase";
import { getApplicationsByUser } from "./firebase";
import { shouldFallbackToFirestoreForJobsApi, isBrowserJobsPostgresOnly } from "./talentBridgeApiMode";

async function authHeaders(): Promise<HeadersInit | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return { Authorization: `Bearer ${await user.getIdToken()}` };
  } catch {
    return null;
  }
}

/** Maps ISO appliedAt strings from API back to shapes the UI expects. */
function normalizeApplications(payload: unknown): Application[] {
  const rows = payload as Array<{
    id: string;
    vacancyId: string;
    candidateId: string;
    appliedAt: string;
    vacancy?: Application["vacancy"];
  }>;
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => ({
    id: r.id,
    vacancyId: r.vacancyId,
    candidateId: r.candidateId,
    appliedAt: r.appliedAt,
    vacancy: r.vacancy as Application["vacancy"],
    status: "applied" as const,
  }));
}

export async function fetchMyApplicationsWithFallback(candidateUid: string): Promise<Application[]> {
  const headers = await authHeaders();

  try {
    if (headers) {
      const res = await fetch("/api/applications/mine", { headers, credentials: "same-origin" });
      const raw = (await res.json().catch(() => ({}))) as { applications?: unknown; code?: string };
      if (res.ok && raw.applications) {
        return normalizeApplications(raw.applications);
      }
      if (!shouldFallbackToFirestoreForJobsApi(res.status, raw)) {
        console.warn("[applicationsApi] unexpected /api/applications/mine", res.status);
      }
    }
  } catch (e) {
    console.warn("[applicationsApi] /api/applications/mine failed", e);
  }

  if (isBrowserJobsPostgresOnly()) {
    return [];
  }

  return (await getApplicationsByUser(candidateUid)) ?? [];
}
