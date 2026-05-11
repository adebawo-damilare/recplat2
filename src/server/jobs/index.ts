import type { PaginatedVacanciesResult } from "./paginatedTypes";
import { hasPostgresConfigured } from "../db/postgres";
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
  searchText?: string | null,
): Promise<PaginatedVacanciesResult> {
  if (process.env.TALENTBRIDGE_E2E_STUB_FIRESTORE_JOBS === "1") {
    return { jobs: [], nextCursor: null };
  }

  if (!hasPostgresConfigured()) {
    throw new Error("JOBS_POSTGRES_REQUIRED");
  }
  return fetchOpenVacanciesPageFromPostgres(limit, cursor, categorySlug, searchText);
}
