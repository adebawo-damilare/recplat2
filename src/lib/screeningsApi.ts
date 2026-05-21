import type { ScreeningInvitationStatus } from "../shared/screeningPilot";
import { refreshTalentBridgeSession } from "./authBrowser";

export type ScreeningInvitationSummary = {
  id: string;
  applicationId: string;
  vacancyId: string;
  status: ScreeningInvitationStatus;
  invitedAt: string;
  submittedAt: string | null;
  vacancy: { jobTitle: string; companyName: string; categorySlug: string | null };
};

export type ScreeningQuestion = {
  id: string;
  sortOrder: number;
  prompt: string;
  responseType: string;
};

export type ScreeningAnswer = {
  questionId: string;
  prompt: string;
  answerText: string;
};

export type ScreeningCandidateSummary = {
  name: string;
  email: string;
};

export type ScreeningQuestionScore = {
  questionId: string;
  score: number;
  note: string | null;
};

export type ScreeningReview = {
  id: string;
  invitationId: string;
  reviewerUserId: string;
  overallScore: number | null;
  reviewerNote: string | null;
  questionScores: ScreeningQuestionScore[];
  reviewedAt: string;
  updatedAt: string;
};

export type ScreeningInvitationDetail = ScreeningInvitationSummary & {
  questions: ScreeningQuestion[];
  answers: ScreeningAnswer[];
  candidate?: ScreeningCandidateSummary;
  review?: ScreeningReview | null;
};

export async function inviteToScreening(applicationId: string): Promise<{
  ok: boolean;
  invitation?: ScreeningInvitationSummary;
  error?: string;
}> {
  const res = await fetch("/api/screenings/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ applicationId }),
  });
  const raw = (await res.json().catch(() => ({}))) as {
    invitation?: ScreeningInvitationSummary;
    error?: string;
  };
  if (!res.ok) return { ok: false, error: raw.error || "Could not send screening invitation." };
  return { ok: true, invitation: raw.invitation };
}

export async function fetchScreeningByApplication(
  applicationId: string,
): Promise<ScreeningInvitationSummary | null> {
  const res = await fetch(
    `/api/screenings/by-application/${encodeURIComponent(applicationId)}`,
    { credentials: "same-origin" },
  );
  const raw = (await res.json().catch(() => ({}))) as { invitation?: ScreeningInvitationSummary | null };
  if (!res.ok) return null;
  return raw.invitation ?? null;
}

export async function fetchMyScreenings(): Promise<ScreeningInvitationSummary[]> {
  const u = await refreshTalentBridgeSession();
  if (!u || u.role !== "candidate") return [];
  const res = await fetch("/api/screenings/mine", { credentials: "same-origin" });
  const raw = (await res.json().catch(() => ({}))) as { invitations?: ScreeningInvitationSummary[] };
  if (!res.ok || !Array.isArray(raw.invitations)) return [];
  return raw.invitations;
}

export async function fetchScreeningDetail(id: string): Promise<ScreeningInvitationDetail | null> {
  const res = await fetch(`/api/screenings/${encodeURIComponent(id)}`, {
    credentials: "same-origin",
  });
  const raw = (await res.json().catch(() => ({}))) as { invitation?: ScreeningInvitationDetail };
  if (!res.ok) return null;
  return raw.invitation ?? null;
}

export type ScreeningMatrixRow = {
  applicationId: string;
  candidateUserId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  vacancyId: string;
  screeningStatus: "not_invited" | "pending" | "submitted";
  invitationId: string | null;
  answersByQuestionId: Record<string, string | null>;
};

export type ScreeningMatrix = {
  categorySlug: string;
  questions: ScreeningQuestion[];
  rows: ScreeningMatrixRow[];
};

export type ScreeningFollowUpKind = "needs_invite" | "awaiting_candidate" | "awaiting_review";

export type ScreeningFollowUpItem = {
  kind: ScreeningFollowUpKind;
  applicationId: string;
  invitationId: string | null;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  companyName: string;
  vacancyId: string;
  categorySlug: string;
  invitedAt: string | null;
  submittedAt: string | null;
  reminderText: string;
  linkPath: string | null;
};

export async function fetchScreeningFollowUp(options?: {
  categorySlug?: string | null;
}): Promise<ScreeningFollowUpItem[]> {
  const p = new URLSearchParams();
  const lane = options?.categorySlug?.trim().toLowerCase();
  if (lane) p.set("categorySlug", lane);
  const qs = p.toString();
  const res = await fetch(`/api/screenings/follow-up${qs ? `?${qs}` : ""}`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  const raw = (await res.json().catch(() => ({}))) as { items?: ScreeningFollowUpItem[] };
  if (!res.ok || !Array.isArray(raw.items)) return [];
  return raw.items;
}

export async function fetchScreeningMatrix(options?: {
  vacancyId?: string | null;
  categorySlug?: string | null;
}): Promise<ScreeningMatrix> {
  const p = new URLSearchParams();
  const vid = options?.vacancyId?.trim();
  if (vid) p.set("vacancyId", vid);
  const lane = options?.categorySlug?.trim().toLowerCase();
  if (lane) p.set("categorySlug", lane);
  const qs = p.toString();
  const res = await fetch(`/api/screenings/matrix${qs ? `?${qs}` : ""}`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  const raw = (await res.json().catch(() => ({}))) as ScreeningMatrix;
  if (!res.ok || !Array.isArray(raw.questions) || !Array.isArray(raw.rows)) {
    return { categorySlug: lane || "marketers", questions: [], rows: [] };
  }
  return {
    categorySlug: raw.categorySlug || lane || "marketers",
    questions: raw.questions,
    rows: raw.rows,
  };
}

export async function saveScreeningReview(
  invitationId: string,
  payload: {
    questionScores: { questionId: string; score: number; note?: string | null }[];
    reviewerNote?: string | null;
  },
): Promise<{ ok: boolean; review?: ScreeningReview; error?: string }> {
  const res = await fetch(`/api/screenings/${encodeURIComponent(invitationId)}/review`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });
  const raw = (await res.json().catch(() => ({}))) as { review?: ScreeningReview; error?: string };
  if (!res.ok) return { ok: false, error: raw.error || "Could not save screening scores." };
  return { ok: true, review: raw.review };
}

export async function submitScreening(
  id: string,
  answers: { questionId: string; answerText: string }[],
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/screenings/${encodeURIComponent(id)}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ answers }),
  });
  const raw = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) return { ok: false, error: raw.error || "Could not submit screening." };
  return { ok: true };
}
