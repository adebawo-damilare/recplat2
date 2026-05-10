import { isJobsPostgresOnly } from "../config/jobsBackendMode";
import { hasPostgresConfigured } from "../db/postgres";
import type { PaginatedVacanciesResult } from "./firestoreVacancies";
import { fetchOpenVacanciesPageFromFirestore } from "./firestoreVacancies";
import {
  fetchOpenVacanciesPageFromPostgres,
  getVacancyById,
  insertVacancyForOwner,
  listVacanciesForOwner,
  recordApplicationPostgres,
  updateVacancyForOwner,
} from "./postgresVacancies";

export type { PaginatedVacanciesResult };
export {
  fetchOpenVacanciesPageFromFirestore,
  fetchOpenVacanciesPageFromPostgres,
  getVacancyById,
  insertVacancyForOwner,
  listVacanciesForOwner,
  recordApplicationPostgres,
  updateVacancyForOwner,
};

export async function fetchOpenVacanciesPage(
  limit: number,
  cursor?: string | null,
  categorySlug?: string | null,
): Promise<PaginatedVacanciesResult> {
  if (process.env.TALENTBRIDGE_E2E_STUB_FIRESTORE_JOBS === "1") {
    return { jobs: [], nextCursor: null };
  }

  if (isJobsPostgresOnly()) {
    if (!hasPostgresConfigured()) {
      throw new Error("JOBS_POSTGRES_REQUIRED");
    }
    return fetchOpenVacanciesPageFromPostgres(limit, cursor, categorySlug);
  }

  if (hasPostgresConfigured()) {
    return fetchOpenVacanciesPageFromPostgres(limit, cursor, categorySlug);
  }
  return fetchOpenVacanciesPageFromFirestore(limit, cursor);
}
