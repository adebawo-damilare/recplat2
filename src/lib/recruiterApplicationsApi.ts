/**
 * Recruiter application pipeline: board list + status updates.
 */

import type { Application } from "./domainTypes";
import { refreshTalentBridgeSession } from "./authBrowser";

export type RecruiterBoardApplication = {
  id: string;
  vacancyId: string;
  candidateUserId: string;
  status: Application["status"];
  appliedAt: string;
  vacancy: { id: string; jobTitle: string; companyName: string };
  candidate: { userId: string; firstName: string; lastName: string; email: string; headline: string };
};

export async function fetchRecruiterApplicationBoard(vacancyId?: string | null): Promise<RecruiterBoardApplication[]> {
  const u = await refreshTalentBridgeSession();
  if (!u || u.role !== "recruiter") return [];

  const qs = vacancyId?.trim() ? `?vacancyId=${encodeURIComponent(vacancyId.trim())}` : "";
  const res = await fetch(`/api/applications/board${qs}`, { credentials: "same-origin" });
  const raw = (await res.json().catch(() => ({}))) as { applications?: RecruiterBoardApplication[] };
  if (!res.ok || !Array.isArray(raw.applications)) {
    return [];
  }
  return raw.applications;
}

export async function patchApplicationStatus(applicationId: string, status: Application["status"]): Promise<boolean> {
  const res = await fetch(`/api/applications/${applicationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ status }),
  });
  return res.ok;
}
