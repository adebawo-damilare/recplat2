import type { Vacancy } from "../../lib/domainTypes";

export interface PaginatedVacanciesResult {
  jobs: Vacancy[];
  nextCursor: string | null;
}
