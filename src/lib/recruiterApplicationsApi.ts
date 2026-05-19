/**
 * Recruiter application pipeline: board list + status updates.
 */

import type { Application, CandidateCategoryFieldValue } from "./domainTypes";
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
    primaryTalentLaneSlug?: string | null;
    categoryFieldValues?: CandidateCategoryFieldValue[];
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

export type ApplicationPipelineAudit = {
  statusEvents: {
    id: string;
    fromStatus: Application["status"] | null;
    toStatus: Application["status"];
    note: string | null;
    actorEmail: string;
    createdAt: string;
  }[];
  notes: {
    id: string;
    body: string;
    authorEmail: string;
    createdAt: string;
  }[];
};

export async function patchApplicationStatus(
  applicationId: string,
  status: Application["status"],
  note?: string,
): Promise<boolean> {
  const res = await fetch(`/api/applications/${applicationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ status, note: note?.trim() || undefined }),
  });
  return res.ok;
}

export async function fetchApplicationPipelineAudit(
  applicationId: string,
): Promise<ApplicationPipelineAudit | null> {
  const res = await fetch(`/api/applications/${encodeURIComponent(applicationId)}/audit`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  const raw = (await res.json().catch(() => ({}))) as ApplicationPipelineAudit;
  if (!res.ok) return null;
  return raw;
}

export async function postApplicationNote(applicationId: string, body: string): Promise<boolean> {
  const res = await fetch(`/api/applications/${encodeURIComponent(applicationId)}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ body }),
  });
  return res.ok;
}
