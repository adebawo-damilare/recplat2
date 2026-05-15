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
  statusUpdatedAt?: string;
  vacancy: {
    id: string;
    jobTitle: string;
    companyName: string;
    category?: { slug: string; label: string } | null;
  };
  candidate: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    headline: string;
    summary?: string;
    skills?: string;
    experience?: string;
    portfolioUrl?: string | null;
    portfolioContent?: string | null;
  };
};

export type RecruiterBoardFilters = {
  vacancyId?: string | null;
  status?: Application["status"] | "all" | null;
  category?: string | "all" | null;
};

export async function fetchRecruiterApplicationBoard(
  filters?: RecruiterBoardFilters,
): Promise<RecruiterBoardApplication[]> {
  const u = await refreshTalentBridgeSession();
  if (!u || u.role !== "recruiter") return [];

  const p = new URLSearchParams();
  const vid = filters?.vacancyId?.trim();
  if (vid) p.set("vacancyId", vid);
  const st = filters?.status;
  if (st && st !== "all") p.set("status", st);
  const cat = filters?.category?.trim().toLowerCase();
  if (cat && cat !== "all") p.set("category", cat);
  const qs = p.toString();
  const res = await fetch(`/api/applications/board${qs ? `?${qs}` : ""}`, { credentials: "same-origin" });
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
