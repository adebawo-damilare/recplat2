import { and, desc, eq, sql } from "drizzle-orm";
import type { Vacancy } from "../../lib/firebase";
import { getDrizzleDb } from "../db/postgres";
import { applications, companies, vacancies } from "../schema";
import { decodeVacancyCursor, encodeVacancyCursor } from "./cursor";
import type { PaginatedVacanciesResult } from "./firestoreVacancies";

function mapRowToVacancy(row: typeof vacancies.$inferSelect): Vacancy {
  return {
    id: row.id,
    jobTitle: row.jobTitle,
    companyName: row.companyNameDenorm,
    location: row.location,
    salary: row.salary,
    description: row.description,
    requirements: row.requirements,
    status: row.status as Vacancy["status"],
    postedBy: row.postedByFirebaseUid,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function fetchOpenVacanciesPageFromPostgres(
  rawLimit: number,
  cursor?: string | null,
): Promise<PaginatedVacanciesResult> {
  const pageSize = Math.max(1, Math.min(rawLimit, 50));
  const db = getDrizzleDb();

  const cursorPayload = cursor ? decodeVacancyCursor(cursor) : null;
  if (cursor && !cursorPayload) {
    throw new Error("INVALID_CURSOR");
  }

  const conditions = [eq(vacancies.status, "open")];
  if (cursorPayload) {
    const d = new Date(cursorPayload.createdAtMs);
    conditions.push(
      sql`(${vacancies.createdAt}, ${vacancies.id}) < (${d}::timestamptz, ${cursorPayload.id})`,
    );
  }
  const nextWhere = and(...conditions)!;

  const rows = await db
    .select()
    .from(vacancies)
    .where(nextWhere)
    .orderBy(desc(vacancies.createdAt), desc(vacancies.id))
    .limit(pageSize + 1);

  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
  const jobs = pageRows.map(mapRowToVacancy);

  const last = pageRows[pageRows.length - 1];
  let nextCursor: string | null = null;

  if (hasMore && last) {
    nextCursor = encodeVacancyCursor({
      createdAtMs: last.createdAt.getTime(),
      id: last.id,
    });
  }

  return { jobs, nextCursor };
}

async function findCompanyByOwnerAndName(ownerUid: string, name: string) {
  const db = getDrizzleDb();
  const rows = await db
    .select()
    .from(companies)
    .where(
      and(
        eq(companies.ownerFirebaseUid, ownerUid),
        sql`lower(${companies.name}) = lower(${name})`,
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function ensureCompanyForOwner(ownerUid: string, name: string) {
  const existing = await findCompanyByOwnerAndName(ownerUid, name);
  if (existing) return existing;

  const db = getDrizzleDb();
  const inserted = await db
    .insert(companies)
    .values({ ownerFirebaseUid: ownerUid, name })
    .returning();
  return inserted[0];
}

export async function insertVacancyForOwner(input: {
  ownerUid: string;
  companyName: string;
  jobTitle: string;
  location: string;
  salary: string;
  description: string;
  requirements: string;
}) {
  const db = getDrizzleDb();
  const company = await ensureCompanyForOwner(input.ownerUid, input.companyName);
  const id = crypto.randomUUID();

  const [row] = await db
    .insert(vacancies)
    .values({
      id,
      companyId: company.id,
      companyNameDenorm: input.companyName,
      jobTitle: input.jobTitle,
      location: input.location,
      salary: input.salary,
      description: input.description,
      requirements: input.requirements,
      status: "open",
      postedByFirebaseUid: input.ownerUid,
    })
    .returning();

  return mapRowToVacancy(row);
}

export async function updateVacancyForOwner(
  vacancyId: string,
  ownerUid: string,
  patch: Partial<{
    companyName: string;
    jobTitle: string;
    location: string;
    salary: string;
    description: string;
    requirements: string;
    status: "open" | "closed";
  }>,
) {
  const db = getDrizzleDb();
  const existing = await db.select().from(vacancies).where(eq(vacancies.id, vacancyId)).limit(1);
  const row = existing[0];
  if (!row || row.postedByFirebaseUid !== ownerUid) {
    return { ok: false as const, reason: "NOT_FOUND_OR_FORBIDDEN" as const };
  }

  let companyId = row.companyId;
  let companyNameDenorm = row.companyNameDenorm;

  if (patch.companyName && patch.companyName !== row.companyNameDenorm) {
    const company = await ensureCompanyForOwner(ownerUid, patch.companyName);
    companyId = company.id;
    companyNameDenorm = patch.companyName;
  }

  const [updated] = await db
    .update(vacancies)
    .set({
      companyId,
      companyNameDenorm,
      jobTitle: patch.jobTitle ?? row.jobTitle,
      location: patch.location ?? row.location,
      salary: patch.salary ?? row.salary,
      description: patch.description ?? row.description,
      requirements: patch.requirements ?? row.requirements,
      status: patch.status ?? row.status,
      updatedAt: new Date(),
    })
    .where(eq(vacancies.id, vacancyId))
    .returning();

  return { ok: true as const, vacancy: mapRowToVacancy(updated) };
}

export async function listVacanciesForOwner(ownerUid: string) {
  const db = getDrizzleDb();
  const rows = await db
    .select()
    .from(vacancies)
    .where(eq(vacancies.postedByFirebaseUid, ownerUid))
    .orderBy(desc(vacancies.updatedAt));
  return rows.map(mapRowToVacancy);
}

export async function getVacancyById(id: string): Promise<Vacancy | null> {
  const db = getDrizzleDb();
  const rows = await db.select().from(vacancies).where(eq(vacancies.id, id)).limit(1);
  return rows[0] ? mapRowToVacancy(rows[0]) : null;
}

export async function recordApplicationPostgres(vacancyId: string, candidateUid: string) {
  const db = getDrizzleDb();

  await db
    .insert(applications)
    .values({ vacancyId, candidateFirebaseUid: candidateUid })
    .onConflictDoNothing({ target: [applications.vacancyId, applications.candidateFirebaseUid] });
}
