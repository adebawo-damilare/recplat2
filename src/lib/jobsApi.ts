/**
 * Jobs + applications via Next `/api/*` (Postgres + session cookie / optional Bearer JWT).
 */

import type { Vacancy } from "./domainTypes";
import type { JobType } from "../shared/jobTypes";
import { refreshTalentBridgeSession } from "./authBrowser";
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
): Promise<{ jobs: Vacancy[]; nextCursor: string | null }> {
  const csRaw = categorySlug?.trim().toLowerCase();
  const cs = csRaw && csRaw !== "all" ? csRaw : null;

  try {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (cursor) qs.set("cursor", cursor);
    if (cs) qs.set("category", cs);
    if (q?.trim()) qs.set("q", q.trim().slice(0, 200));

    const res = await fetch(`/api/jobs?${qs.toString()}`, {
      credentials: "same-origin",
      cache: "no-store",
    });

    const raw = (await res.json().catch(() => ({}))) as {
      jobs?: Vacancy[];
      code?: string;
      pagination?: { nextCursor?: string | null };
    };

    if (res.ok) {
      return {
        jobs: raw.jobs ?? [],
        nextCursor: raw.pagination?.nextCursor ?? null,
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

export async function fetchPublicJobsWithFallback(
  limit = 75,
  cursor?: string | null,
  categorySlug?: string | null,
) {
  const { jobs } = await fetchPublicJobsPage(limit, cursor, categorySlug, undefined);
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

export async function applyToVacancyWithFallback(vacancyId: string): Promise<boolean> {
  const signedIn = await ensureSignedIn();
  if (!signedIn) {
    alert("Please sign in to apply for jobs.");
    return false;
  }

  try {
    const res = await fetch(`/api/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ vacancyId }),
    });
    const raw = (await res.json().catch(() => ({}))) as { code?: string };
    if (res.ok) {
      return true;
    }
    if (!shouldFallback(res.status, raw)) {
      alert("Unable to apply right now.");
      return false;
    }
  } catch (error) {
    console.warn("[jobsApi] application API failed", error);
  }

  if (isBrowserJobsPostgresOnly()) {
    alert("Applications require Postgres + API.");
    return false;
  }

  alert("Unable to apply right now.");
  return false;
}
