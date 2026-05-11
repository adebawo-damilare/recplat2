import type { Application } from "./domainTypes";

const STATUSES = ["applied", "viewed", "interviewing", "rejected", "hired"] as const;

export type PipelineApplicationStatus = (typeof STATUSES)[number];

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
