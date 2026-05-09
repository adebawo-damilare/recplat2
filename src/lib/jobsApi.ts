/**
 * Browser helpers: call Next `/api/*` routes first, then fall back to Firestore clients
 * when Postgres or Firebase Admin verification is not configured.
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

type VacancyWritePayload = {
  jobTitle: string;
  companyName: string;
  location: string;
  salary: string;
  description: string;
  requirements: string;
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
  if (status === 503) return true;
  const code = payload?.code;
  return code === "POSTGRES_UNAVAILABLE" || code === "FIREBASE_ADMIN_UNAVAILABLE";
}

export async function fetchPublicJobsWithFallback(limit = 75, cursor?: string | null) {
  try {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (cursor) qs.set("cursor", cursor);

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
    console.warn("[jobsApi] /api/jobs failed, reverting to Firestore", error);
  }

  const fb = await getVacanciesFirestore();
  return fb || [];
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

  const fb = await getVacanciesByUser(ownerUid);
  return fb || [];
}

export async function persistVacancyWithFallback(payload: VacancyWritePayload, vacancy?: Vacancy | null) {
  const headers = await buildAuthHeaders();

  if (headers) {
    try {
      if (!vacancy) {
        const res = await fetch(`/api/jobs`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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
          body: JSON.stringify(payload),
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
      console.warn("[jobsApi] Postgres vacancy write failed, using Firestore", error);
    }
  }

  if (!auth.currentUser) {
    throw new Error("You must be signed in to save a vacancy.");
  }

  if (vacancy?.id) {
    await updateVacancyFirestore(vacancy.id, payload);
    return { ...vacancy, ...payload } as Vacancy;
  }

  await createVacancyFirestore({
    ...payload,
    postedBy: auth.currentUser.uid,
  });
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
    }
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
    }
  }

  if (!auth.currentUser) {
    throw new Error("Sign in required to seed vacancies.");
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

  await applyToJobFirestore(vacancyId, auth.currentUser.uid);
  return true;
}
