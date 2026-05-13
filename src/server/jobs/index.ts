import type { Vacancy } from "../../lib/domainTypes";
import type { JobType } from "../../shared/jobTypes";
import type { PaginatedVacanciesResult } from "./paginatedTypes";
import { hasPostgresConfigured } from "../db/postgres";
import {
  countOpenVacanciesFromPostgres,
  fetchOpenVacanciesPageFromPostgres,
  getOpenVacancyByIdFromPostgres,
  getVacancyById,
  insertVacancyForOwner,
  listVacanciesForOwner,
  recordApplicationPostgres,
  updateVacancyForOwner,
} from "./postgresVacancies";

export type { PaginatedVacanciesResult };
export {
  countOpenVacanciesFromPostgres,
  fetchOpenVacanciesPageFromPostgres,
  getVacancyById,
  insertVacancyForOwner,
  listVacanciesForOwner,
  recordApplicationPostgres,
  updateVacancyForOwner,
};

export async function countOpenVacancies(
  categorySlug?: string | null,
  searchText?: string | null,
  jobType?: JobType | null,
): Promise<number> {
  if (process.env.TALENTBRIDGE_E2E_STUB_FIRESTORE_JOBS === "1") {
    return 0;
  }
  if (!hasPostgresConfigured()) {
    throw new Error("JOBS_POSTGRES_REQUIRED");
  }
  return countOpenVacanciesFromPostgres(categorySlug, searchText, jobType);
}

export async function fetchOpenVacanciesPage(
  limit: number,
  cursor?: string | null,
  categorySlug?: string | null,
  searchText?: string | null,
  jobType?: JobType | null,
): Promise<PaginatedVacanciesResult> {
  if (process.env.TALENTBRIDGE_E2E_STUB_FIRESTORE_JOBS === "1") {
    return { jobs: [], nextCursor: null };
  }

  if (!hasPostgresConfigured()) {
    throw new Error("JOBS_POSTGRES_REQUIRED");
  }
  return fetchOpenVacanciesPageFromPostgres(limit, cursor, categorySlug, searchText, jobType);
}

export async function getOpenVacancyById(id: string): Promise<Vacancy | null> {
  if (process.env.TALENTBRIDGE_E2E_STUB_FIRESTORE_JOBS === "1") {
    return null;
  }
  if (!hasPostgresConfigured()) {
    throw new Error("JOBS_POSTGRES_REQUIRED");
  }
  return getOpenVacancyByIdFromPostgres(id);
}
