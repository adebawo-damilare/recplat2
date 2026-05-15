import type { Application } from "./domainTypes";

const STATUSES = ["applied", "viewed", "interviewing", "rejected", "hired"] as const;

export type PipelineApplicationStatus = (typeof STATUSES)[number];

/** Candidate-facing labels for pipeline stages. */
export const APPLICATION_STATUS_LABELS: Record<PipelineApplicationStatus, string> = {
  applied: "Submitted",
  viewed: "Under review",
  interviewing: "Interviewing",
  rejected: "Not moving forward",
  hired: "Offer / hired",
};

/** Short helper text shown under the status chip on My applications. */
export const APPLICATION_STATUS_HINTS: Record<PipelineApplicationStatus, string> = {
  applied: "Your application was received.",
  viewed: "The hiring team has opened your application.",
  interviewing: "You are in the interview process.",
  rejected: "This role is closed for you.",
  hired: "Congratulations — you were selected for this role.",
};

export function applicationStatusLabel(status: PipelineApplicationStatus): string {
  return APPLICATION_STATUS_LABELS[status] ?? APPLICATION_STATUS_LABELS.applied;
}

export function normalizeApplicationStatus(raw: unknown): PipelineApplicationStatus {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (STATUSES.includes(s as PipelineApplicationStatus)) {
    return s as PipelineApplicationStatus;
  }
  return "applied";
}

export function isPipelineApplicationStatus(s: unknown): s is Application["status"] {
  return STATUSES.includes(s as PipelineApplicationStatus);
}
