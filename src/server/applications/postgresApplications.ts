import { desc, eq } from "drizzle-orm";

import { getDrizzleDb } from "../db/postgres";
import { getVacancyById } from "../jobs/postgresVacancies";
import { applications } from "../schema";

/** Lists a candidate's applications with vacancy rows joined via lookup (Jobs Slice / Postgres path). */
export async function listApplicationsWithVacanciesForCandidate(candidateFirebaseUid: string) {
  const db = getDrizzleDb();
  const rows = await db
    .select()
    .from(applications)
    .where(eq(applications.candidateFirebaseUid, candidateFirebaseUid))
    .orderBy(desc(applications.createdAt));

  const out: {
    id: string;
    vacancyId: string;
    candidateId: string;
    appliedAt: Date;
    vacancy: Awaited<ReturnType<typeof getVacancyById>>;
  }[] = [];

  for (const r of rows) {
    const vacancy = await getVacancyById(r.vacancyId);
    out.push({
      id: r.id,
      vacancyId: r.vacancyId,
      candidateId: candidateFirebaseUid,
      appliedAt: r.createdAt,
      vacancy: vacancy ?? null,
    });
  }

  return out;
}
