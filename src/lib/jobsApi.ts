/**
 * Browser helpers: prefer Next `/api/*` (Postgres-backed).
 * When `NEXT_PUBLIC_TALENTBRIDGE_JOBS_POSTGRES_ONLY=1` (Jobs Slice v1 production), Firestore fallbacks are disabled.
 */

import {
  auth,
  applyToJob as applyToJobFirestore,
  deleteVacancy as deleteVacancyFirestore,
  getVacancies as getVacanciesFirestore,
  getVacanciesByUser,
  postVacancy as createVacancyFirestore,
  seedVacancies as seedVacanciesFirestore,
  updateVacancy as updateVacancyFirestore,
  type Vacancy,
} from "./firebase";
import {
  isBrowserJobsPostgresOnly,
  shouldFallbackToFirestoreForJobsApi,
} from "./talentBridgeApiMode";
import { categorySummaryFromWriteSlug } from "./vacancyWriteShared";

export type VacancyWritePayload = {
  jobTitle: string;
  companyName: string;
  location: string;
  salary: string;
  description: string;
  requirements: string;
  /** Omitted → leave unset on create, leave unchanged on update (Postgres PATCH). explicit null clears. */
  categorySlug?: string | null;
};

async function buildAuthHeaders(): Promise<HeadersInit | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return null;
  }
}

function shouldFallback(status: number, payload?: { code?: string }) {
  return shouldFallbackToFirestoreForJobsApi(status, payload);
}

export async function fetchPublicJobsWithFallback(
  limit = 75,
  cursor?: string | null,
  categorySlug?: string | null,
) {
  const csRaw = categorySlug?.trim().toLowerCase();
  const cs =
    csRaw && csRaw !== "all"
      ? csRaw
      : null;

  try {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (cursor) qs.set("cursor", cursor);
    if (cs) qs.set("category", cs);

    const res = await fetch(`/api/jobs?${qs.toString()}`, {
      credentials: "same-origin",
      cache: "no-store",
    });

    const raw = (await res.json().catch(() => ({}))) as { jobs?: Vacancy[]; code?: string };

    if (res.ok) {
      return raw.jobs ?? [];
    }

    if (!shouldFallback(res.status, raw)) {
      console.warn("[jobsApi] Unexpected /api/jobs response", res.status);
    }
  } catch (error) {
    console.warn("[jobsApi] /api/jobs failed", error);
  }

  if (isBrowserJobsPostgresOnly()) {
    return [];
  }

  const fb = await getVacanciesFirestore();
  const rows = fb || [];
  if (!cs) {
    return rows;
  }

  return rows.filter((job) => job.category?.slug === cs);
}

export async function fetchMyVacanciesWithFallback(ownerUid: string) {
  const headers = await buildAuthHeaders();

  try {
    if (headers) {
      const res = await fetch(`/api/jobs/mine`, { headers, credentials: "same-origin" });
      const raw = (await res.json().catch(() => ({}))) as { jobs?: Vacancy[]; code?: string };
      if (res.ok) {
        return raw.jobs ?? [];
      }
      if (!shouldFallback(res.status, raw)) {
        console.warn("[jobsApi] Unexpected /api/jobs/mine response", res.status);
      }
    }
  } catch (error) {
    console.warn("[jobsApi] /api/jobs/mine failed", error);
  }

  if (isBrowserJobsPostgresOnly()) {
    return [];
  }

  const fb = await getVacanciesByUser(ownerUid);
  return fb || [];
}

function buildVacancyWriteJson(payload: VacancyWritePayload): Record<string, unknown> {
  const base = {
    jobTitle: payload.jobTitle,
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
  const headers = await buildAuthHeaders();

  const apiBody = buildVacancyWriteJson(payload);

  if (headers) {
    try {
      if (!vacancy) {
        const res = await fetch(`/api/jobs`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
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
          headers: { ...headers, "Content-Type": "application/json" },
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
      if (isBrowserJobsPostgresOnly()) {
        throw new Error("Saving vacancies requires the Postgres-backed API (see docs/MVP_JOBS_SLICE_V1.md).");
      }
    }
  }

  if (!auth.currentUser) {
    throw new Error("You must be signed in to save a vacancy.");
  }

  if (isBrowserJobsPostgresOnly()) {
    throw new Error("Vacancy saves require Postgres + API (Jobs Slice v1).");
  }

  const coreFields = {
    jobTitle: payload.jobTitle,
    companyName: payload.companyName,
    location: payload.location,
    salary: payload.salary,
    description: payload.description,
    requirements: payload.requirements,
  };

  const categoryPatch: Partial<Pick<Vacancy, "category">> = {};
  if (payload.categorySlug === null) {
    categoryPatch.category = null;
  } else if (typeof payload.categorySlug === "string" && payload.categorySlug.trim()) {
    const sum = categorySummaryFromWriteSlug(payload.categorySlug.trim());
    if (sum) {
      categoryPatch.category = sum;
    }
  }

  if (vacancy?.id) {
    console.warn(
      "[jobsApi] Updating vacancy in Firestore—POST/PATCH /api/jobs did not succeed or dual-write fallback is enabled. For Neon-only prod: set NEXT_PUBLIC_TALENTBRIDGE_JOBS_POSTGRES_ONLY=1 on Vercel, redeploy, and fix API errors (see Network tab).",
    );
    await updateVacancyFirestore(vacancy.id, { ...coreFields, ...categoryPatch });
    const merged: Vacancy = { ...vacancy, ...coreFields };
    if ("category" in categoryPatch) {
      merged.category = categoryPatch.category === null ? undefined : categoryPatch.category;
    }
    return merged;
  }

  const createPayload: Omit<Vacancy, "id" | "status"> = {
    ...coreFields,
    postedBy: auth.currentUser.uid,
  };

  if (categoryPatch.category) {
    createPayload.category = categoryPatch.category;
  }

  console.warn(
    "[jobsApi] Creating vacancy in Firestore—POST /api/jobs did not return success or Jobs Slice postgres-only mode is off. For Neon prod: set NEXT_PUBLIC_TALENTBRIDGE_JOBS_POSTGRES_ONLY=1 (Production) and redeploy; confirm POST /api/jobs is 200 in DevTools.",
  );
  await createVacancyFirestore(createPayload);
  return null;
}

export async function closeVacancyWithFallback(id: string) {
  const headers = await buildAuthHeaders();

  if (headers) {
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
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
      if (isBrowserJobsPostgresOnly()) {
        throw new Error("Closing vacancies requires the Postgres-backed API.");
      }
    }
  }

  if (isBrowserJobsPostgresOnly()) {
    throw new Error("Closing vacancies requires the Postgres-backed API.");
  }

  await deleteVacancyFirestore(id);
  return true;
}

export async function seedSampleVacanciesViaApi(): Promise<Vacancy[]> {
  const headers = await buildAuthHeaders();

  if (headers) {
    try {
      const res = await fetch(`/api/jobs/seed-sample`, {
        method: "POST",
        headers,
      });
      const raw = (await res.json().catch(() => ({}))) as { jobs?: Vacancy[]; code?: string };
      if (res.ok) {
        return raw.jobs ?? [];
      }
      if (!shouldFallback(res.status, raw)) {
        throw new Error(`Unable to seed via API (${res.status})`);
      }
    } catch (error) {
      console.warn("[jobsApi] sample seed API failed", error);
      if (isBrowserJobsPostgresOnly()) {
        throw new Error("Sample seed requires Postgres, migrations, and a signed-in user token (POST /api/jobs/seed-sample).");
      }
    }
  }

  if (!auth.currentUser) {
    throw new Error("Sign in required to seed vacancies.");
  }

  if (isBrowserJobsPostgresOnly()) {
    throw new Error("Seeding vacancies requires Postgres (use POST /api/jobs/seed-sample when DATABASE_URL is set).");
  }

  await seedVacanciesFirestore(auth.currentUser.uid);
  return (await getVacanciesFirestore()) || [];
}

export async function applyToVacancyWithFallback(vacancyId: string) {
  if (!auth.currentUser) {
    alert("Please sign in to apply for jobs.");
    return false;
  }

  const headers = await buildAuthHeaders();

  if (headers) {
    try {
      const res = await fetch(`/api/applications`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
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
  }

  if (isBrowserJobsPostgresOnly()) {
    alert("Applications require Postgres + API (Jobs Slice v1).");
    return false;
  }

  await applyToJobFirestore(vacancyId, auth.currentUser.uid);
  return true;
}
