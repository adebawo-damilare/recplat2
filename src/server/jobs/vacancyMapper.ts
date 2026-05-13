import type { Vacancy } from "../../lib/domainTypes";
import type { JobType } from "../../shared/jobTypes";
import type { vacancies } from "../schema";

type VacancyRow = typeof vacancies.$inferSelect;

export function mapPostgresVacancyRow(
  row: VacancyRow,
  category: { slug: string; label: string } | null,
): Vacancy {
  return {
    id: row.id,
    jobTitle: row.jobTitle,
    jobType: row.jobType as JobType,
    companyName: row.companyNameDenorm,
    location: row.location,
    salary: row.salary,
    description: row.description,
    requirements: row.requirements,
    status: row.status as Vacancy["status"],
    postedBy: row.postedByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    category,
  };
}
