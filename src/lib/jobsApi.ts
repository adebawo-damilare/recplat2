/**
 * Jobs + applications via Next `/api/*` (Postgres + session cookie / optional Bearer JWT).
 */

import type { Vacancy } from "./domainTypes";
import type { JobType } from "../shared/jobTypes";
import { refreshTalentBridgeSession } from "./authBrowser";
import { talentBridgeUiNotify } from "./talentBridgeUiNotify";
import { isBrowserJobsPostgresOnly, shouldFallbackToFirestoreForJobsApi } from "./talentBridgeApiMode";

export type VacancyWritePayload = {
  jobTitle: string;
  jobType: JobType;
  companyName: string;
  location: string;
  salary: string;
  description: string;
  requirements: string;
  categorySlug?: string | null;
};

async function ensureSignedIn(): Promise<boolean> {
  const u = await refreshTalentBridgeSession();
  return Boolean(u);
}

function shouldFallback(status: number, payload?: { code?: string }) {
  return shouldFallbackToFirestoreForJobsApi(status, payload);
}

export async function fetchPublicJobsPage(
  limit = 10,
  cursor?: string | null,
  categorySlug?: string | null,
  q?: string | null,
  options?: { includeTotal?: boolean; jobType?: JobType | null },
): Promise<{ jobs: Vacancy[]; nextCursor: string | null; totalOpen?: number }> {
  const csRaw = categorySlug?.trim().toLowerCase();
  const cs = csRaw && csRaw !== "all" ? csRaw : null;
  const includeTotal = options?.includeTotal === true;
  const jobType = options?.jobType ?? null;

  try {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (cursor) qs.set("cursor", cursor);
    if (cs) qs.set("category", cs);
    if (q?.trim()) qs.set("q", q.trim().slice(0, 200));
    if (includeTotal) qs.set("includeTotal", "1");
    if (jobType) qs.set("jobType", jobType);

    const res = await fetch(`/api/jobs?${qs.toString()}`, {
      credentials: "same-origin",
      cache: "no-store",
    });

    const raw = (await res.json().catch(() => ({}))) as {
      jobs?: Vacancy[];
      code?: string;
      totalOpen?: number;
      pagination?: { nextCursor?: string | null };
    };

    if (res.ok) {
      const jobs = raw.jobs ?? [];
      return {
        jobs,
        nextCursor: raw.pagination?.nextCursor ?? null,
        ...(includeTotal && typeof raw.totalOpen === "number" ? { totalOpen: raw.totalOpen } : {}),
      };
    }

    if (!shouldFallback(res.status, raw)) {
      console.warn("[jobsApi] Unexpected /api/jobs response", res.status);
    }
  } catch (error) {
    console.warn("[jobsApi] /api/jobs failed", error);
  }

  return { jobs: [], nextCursor: null };
}

/** Home hero: up to 6 open jobs plus total count for "n of N | Explore all jobs". */
export const HOME_FEATURED_JOB_LIMIT = 6;

export async function fetchHomeFeaturedJobs(): Promise<{ jobs: Vacancy[]; totalOpen: number }> {
  try {
    const { jobs, totalOpen } = await fetchPublicJobsPage(
      HOME_FEATURED_JOB_LIMIT,
      null,
      null,
      undefined,
      { includeTotal: true },
    );
    return {
      jobs: jobs ?? [],
      totalOpen: typeof totalOpen === "number" ? totalOpen : jobs.length,
    };
  } catch (error) {
    console.warn("[jobsApi] fetchHomeFeaturedJobs failed", error);
  }
  return { jobs: [], totalOpen: 0 };
}

/** Public job detail (open vacancies only). Returns null if 404 / error. */
export async function fetchPublicJobById(id: string): Promise<Vacancy | null> {
  const trimmed = id?.trim();
  if (!trimmed) return null;
  try {
    const res = await fetch(`/api/jobs/${encodeURIComponent(trimmed)}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    const raw = (await res.json().catch(() => ({}))) as { job?: Vacancy; code?: string };
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return raw.job ?? null;
  } catch {
    return null;
  }
}

export async function fetchPublicJobsWithFallback(
  limit = 75,
  cursor?: string | null,
  categorySlug?: string | null,
  jobType?: JobType | null,
) {
  const { jobs } = await fetchPublicJobsPage(limit, cursor, categorySlug, undefined, { jobType: jobType ?? null });
  return jobs;
}

export async function fetchMyVacanciesWithFallback(): Promise<Vacancy[]> {
  try {
    const res = await fetch(`/api/jobs/mine`, { credentials: "same-origin" });
    const raw = (await res.json().catch(() => ({}))) as { jobs?: Vacancy[]; code?: string };
    if (res.ok) {
      return raw.jobs ?? [];
    }
    if (!shouldFallback(res.status, raw)) {
      console.warn("[jobsApi] Unexpected /api/jobs/mine response", res.status);
    }
  } catch (error) {
    console.warn("[jobsApi] /api/jobs/mine failed", error);
  }

  return [];
}

function buildVacancyWriteJson(payload: VacancyWritePayload): Record<string, unknown> {
  const base = {
    jobTitle: payload.jobTitle,
    jobType: payload.jobType,
    companyName: payload.companyName,
    location: payload.location,
    salary: payload.salary,
    description: payload.description,
    requirements: payload.requirements,
  };
  const out: Record<string, unknown> = { ...base };
  const rawCat = payload.categorySlug;
  if (rawCat === null) {
    out.categorySlug = null;
  } else if (typeof rawCat === "string" && rawCat.trim()) {
    out.categorySlug = rawCat.trim().toLowerCase();
  }
  return out;
}

export async function persistVacancyWithFallback(payload: VacancyWritePayload, vacancy?: Vacancy | null) {
  const signedIn = await ensureSignedIn();
  if (!signedIn) {
    throw new Error("You must be signed in to save a vacancy.");
  }

  const apiBody = buildVacancyWriteJson(payload);

  try {
    if (!vacancy) {
      const res = await fetch(`/api/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(apiBody),
      });
      const raw = (await res.json().catch(() => ({}))) as { job?: Vacancy; code?: string };
      if (res.ok && raw.job) {
        return raw.job;
      }
      if (!shouldFallback(res.status, raw)) {
        throw new Error(`Unable to create vacancy (${res.status})`);
      }
    } else if (vacancy.id) {
      const res = await fetch(`/api/jobs/${vacancy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(apiBody),
      });
      const raw = (await res.json().catch(() => ({}))) as { job?: Vacancy; code?: string };
      if (res.ok && raw.job) {
        return raw.job;
      }
      if (!shouldFallback(res.status, raw)) {
        throw new Error(`Unable to update vacancy (${res.status})`);
      }
    }
  } catch (error) {
    console.warn("[jobsApi] Vacancy API write failed", error);
  }

  if (isBrowserJobsPostgresOnly()) {
    throw new Error("Saving vacancies requires the Postgres-backed API (see docs/MVP_JOBS_SLICE_V1.md).");
  }
  throw new Error("Unable to save vacancy. Check DATABASE_URL, migrations, and session.");
}

export async function closeVacancyWithFallback(id: string) {
  const signedIn = await ensureSignedIn();
  if (!signedIn) {
    throw new Error("You must be signed in.");
  }

  try {
    const res = await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ status: "closed" }),
    });
    const raw = (await res.json().catch(() => ({}))) as { code?: string };
    if (res.ok) {
      return true;
    }
    if (!shouldFallback(res.status, raw)) {
      console.warn("[jobsApi] Unable to close vacancy via API", res.status);
    }
  } catch (error) {
    console.warn("[jobsApi] close via API failed", error);
  }

  if (isBrowserJobsPostgresOnly()) {
    throw new Error("Closing vacancies requires the Postgres-backed API.");
  }
  throw new Error("Unable to close vacancy.");
}

export type ApplyToVacancyResult = "created" | "already_applied" | false;

export async function applyToVacancyWithFallback(vacancyId: string): Promise<ApplyToVacancyResult> {
  const signedIn = await ensureSignedIn();
  if (!signedIn) {
    talentBridgeUiNotify("Please sign in to apply for jobs.");
    return false;
  }

  try {
    const res = await fetch(`/api/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ vacancyId }),
    });
    const raw = (await res.json().catch(() => ({}))) as {
      code?: string;
      error?: string;
      message?: string;
      created?: boolean;
    };
    if (res.ok) {
      if (raw.created === false) {
        talentBridgeUiNotify(raw.message || "You have already applied to this job.");
        return "already_applied";
      }
      return "created";
    }
    if (res.status === 403 && raw.code === "FORBIDDEN_ROLE") {
      talentBridgeUiNotify(
        raw.error || "This action requires a candidate account. Sign in as a candidate or register a new account.",
      );
      return false;
    }
    if (res.status === 400 || res.status === 404) {
      talentBridgeUiNotify(raw.error || "This job is not available to apply to.");
      return false;
    }
    if (!shouldFallback(res.status, raw)) {
      talentBridgeUiNotify(raw.error || "Unable to apply right now.");
      return false;
    }
  } catch (error) {
    console.warn("[jobsApi] application API failed", error);
  }

  if (isBrowserJobsPostgresOnly()) {
    talentBridgeUiNotify("Applications require Postgres + API.");
    return false;
  }

  talentBridgeUiNotify("Unable to apply right now.");
  return false;
}
