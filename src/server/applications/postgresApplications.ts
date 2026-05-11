import { and, desc, eq, sql } from "drizzle-orm";

import { normalizeApplicationStatus, type PipelineApplicationStatus } from "../../lib/applicationStatus";
import { getDrizzleDb } from "../db/postgres";
import { getVacancyById } from "../jobs/postgresVacancies";
import { applications, candidateProfiles, vacancies } from "../schema";

/** Lists a candidate's applications with vacancy rows joined via lookup (Jobs Slice / Postgres path). */
export async function listApplicationsWithVacanciesForCandidate(candidateUserId: string) {
  const db = getDrizzleDb();
  const rows = await db
    .select()
    .from(applications)
    .where(eq(applications.candidateUserId, candidateUserId))
    .orderBy(desc(applications.createdAt));

  const out: {
    id: string;
    vacancyId: string;
    candidateId: string;
    status: PipelineApplicationStatus;
    appliedAt: Date;
    vacancy: Awaited<ReturnType<typeof getVacancyById>>;
  }[] = [];

  for (const r of rows) {
    const vacancy = await getVacancyById(r.vacancyId);
    out.push({
      id: r.id,
      vacancyId: r.vacancyId,
      candidateId: candidateUserId,
      status: normalizeApplicationStatus(r.status),
      appliedAt: r.createdAt,
      vacancy: vacancy ?? null,
    });
  }

  return out;
}

export type RecruiterBoardRow = {
  id: string;
  vacancyId: string;
  candidateUserId: string;
  status: PipelineApplicationStatus;
  appliedAt: Date;
  vacancy: { id: string; jobTitle: string; companyName: string };
  candidate: { userId: string; fullName: string; email: string; headline: string };
};

/** Applications across vacancies owned by this recruiter (optionally scoped to one vacancy). */
export async function listApplicationsBoardForOwner(ownerUserId: string, vacancyIdFilter?: string | null) {
  const db = getDrizzleDb();
  const filters = [eq(vacancies.postedByUserId, ownerUserId)];
  const vid = vacancyIdFilter?.trim();
  if (vid) filters.push(eq(applications.vacancyId, vid));

  const rows = await db
    .select({
      applicationId: applications.id,
      vacancyId: applications.vacancyId,
      candidateUserId: applications.candidateUserId,
      status: applications.status,
      appliedAt: applications.createdAt,
      vacancyJobTitle: vacancies.jobTitle,
      vacancyCompany: vacancies.companyNameDenorm,
      candidateFullName: candidateProfiles.fullName,
      candidateEmailSnapshot: candidateProfiles.emailSnapshot,
      candidateHeadline: candidateProfiles.headline,
    })
    .from(applications)
    .innerJoin(vacancies, eq(applications.vacancyId, vacancies.id))
    .leftJoin(candidateProfiles, sql`${applications.candidateUserId} = ${candidateProfiles.userId}::text`)
    .where(and(...filters)!)
    .orderBy(desc(applications.createdAt));

  const out: RecruiterBoardRow[] = rows.map((r) => ({
    id: r.applicationId,
    vacancyId: r.vacancyId,
    candidateUserId: r.candidateUserId,
    status: normalizeApplicationStatus(r.status),
    appliedAt: r.appliedAt,
    vacancy: {
      id: r.vacancyId,
      jobTitle: r.vacancyJobTitle,
      companyName: r.vacancyCompany,
    },
    candidate: {
      userId: r.candidateUserId,
      fullName: r.candidateFullName?.trim() ? r.candidateFullName : "(No profile)",
      email: r.candidateEmailSnapshot?.trim() ? r.candidateEmailSnapshot : "",
      headline: r.candidateHeadline?.trim() ? r.candidateHeadline : "",
    },
  }));

  return out;
}

export async function updateApplicationStatusForVacancyOwner(
  applicationId: string,
  ownerUserId: string,
  status: PipelineApplicationStatus,
): Promise<{ ok: true } | { ok: false; reason: "NOT_FOUND" | "FORBIDDEN" }> {
  const db = getDrizzleDb();
  const rows = await db
    .select({ postedBy: vacancies.postedByUserId })
    .from(applications)
    .innerJoin(vacancies, eq(applications.vacancyId, vacancies.id))
    .where(eq(applications.id, applicationId))
    .limit(1);
  const row = rows[0];
  if (!row) return { ok: false, reason: "NOT_FOUND" };
  if (row.postedBy !== ownerUserId) return { ok: false, reason: "FORBIDDEN" };

  await db.update(applications).set({ status }).where(eq(applications.id, applicationId));
  return { ok: true };
}
