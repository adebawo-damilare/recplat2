/**
 * TalentBridge domain shapes shared by UI and Postgres-backed APIs (no Firebase).
 */

import type { JobType } from "../shared/jobTypes";

export interface CandidateProfile {
  firstName: string;
  lastName: string;
  email: string;
  headline: string;
  summary: string;
  skills: string;
  experience: string;
  userId: string;
  portfolioUrl?: string | null;
  portfolioContent?: string | null;
  createdAt?: string | unknown;
  updatedAt?: string | unknown;
}

export interface VacancyCategorySummary {
  slug: string;
  label: string;
}

export interface Vacancy {
  id?: string;
  jobTitle: string;
  jobType: JobType;
  companyName: string;
  location: string;
  salary: string;
  description: string;
  requirements: string;
  status: "open" | "closed";
  postedBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  category?: VacancyCategorySummary | null;
}

export interface Application {
  id?: string;
  vacancyId: string;
  candidateId: string;
  status: "applied" | "viewed" | "interviewing" | "rejected" | "hired";
  appliedAt: unknown;
  /** ISO timestamp when status last changed (Postgres `status_updated_at`). */
  statusUpdatedAt?: string;
  vacancy?: Vacancy;
}

export type TalentBridgeUser = {
  id: string;
  email: string;
  role: "candidate" | "recruiter";
  /** From `GET /api/auth/session` when role admin is enabled and email is allowlisted. */
  canManageUserRoles?: boolean;
};
