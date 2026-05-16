import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";

import type { Vacancy } from "../../lib/domainTypes";
import type { JobType } from "../../shared/jobTypes";
import type { PaginatedVacanciesResult } from "./paginatedTypes";
import { resolveActiveCategoryIdBySlug } from "../categories/resolveActiveCategoryId";
import { getDrizzleDb } from "../db/postgres";
import { applications, categories, companies, vacancies } from "../schema";
import { decodeVacancyCursor, encodeVacancyCursor } from "./cursor";
import { mapPostgresVacancyRow } from "./vacancyMapper";

function catSummaryFromJoined(
  slug: string | null,
  label: string | null,
): { slug: string; label: string } | null {
  return slug && label ? { slug, label } : null;
}

function toEpochMs(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  const ms = new Date(String(value)).getTime();
  if (Number.isNaN(ms)) {
    throw new Error("INVALID_VACANCY_CREATED_AT");
  }
  return ms;
}

function escapeIlikeFragment(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function fetchOpenVacanciesPageFromPostgres(
  rawLimit: number,
  cursor?: string | null,
  categorySlug?: string | null,
  searchText?: string | null,
  jobType?: JobType | null,
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

  const slugFilter = categorySlug?.trim().toLowerCase();
  if (slugFilter) {
    conditions.push(eq(categories.slug, slugFilter));
  }

  const qRaw = searchText?.trim();
  if (qRaw && qRaw.length > 0) {
    const pattern = `%${escapeIlikeFragment(qRaw.slice(0, 200))}%`;
    conditions.push(
      or(
        ilike(vacancies.jobTitle, pattern),
        ilike(vacancies.companyNameDenorm, pattern),
        ilike(vacancies.description, pattern),
      )!,
    );
  }

  if (jobType) {
    conditions.push(eq(vacancies.jobType, jobType));
  }

  const nextWhere = and(...conditions)!;

  const rows = await db
    .select({
      v: vacancies,
      catSlug: categories.slug,
      catLabel: categories.label,
    })
    .from(vacancies)
    .leftJoin(categories, eq(vacancies.categoryId, categories.id))
    .where(nextWhere)
    .orderBy(desc(vacancies.createdAt), desc(vacancies.id))
    .limit(pageSize + 1);

  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
  const jobs = pageRows.map((r) =>
    mapPostgresVacancyRow(r.v, catSummaryFromJoined(r.catSlug, r.catLabel)),
  );

  const last = pageRows[pageRows.length - 1];
  let nextCursor: string | null = null;

  if (hasMore && last) {
    nextCursor = encodeVacancyCursor({
      createdAtMs: toEpochMs(last.v.createdAt),
      id: last.v.id,
    });
  }

  return { jobs, nextCursor };
}

/** Count open vacancies matching the same filters as {@link fetchOpenVacanciesPageFromPostgres} (no cursor). */
export async function countOpenVacanciesFromPostgres(
  categorySlug?: string | null,
  searchText?: string | null,
  jobType?: JobType | null,
): Promise<number> {
  const db = getDrizzleDb();
  const slugFilter = categorySlug?.trim().toLowerCase();
  const qRaw = searchText?.trim();

  if (!slugFilter && (!qRaw || qRaw.length === 0) && !jobType) {
    const [row] = await db
      .select({ n: count() })
      .from(vacancies)
      .where(eq(vacancies.status, "open"));
    return Number(row?.n ?? 0);
  }

  if (!slugFilter && (!qRaw || qRaw.length === 0) && jobType) {
    const [row] = await db
      .select({ n: count() })
      .from(vacancies)
      .where(and(eq(vacancies.status, "open"), eq(vacancies.jobType, jobType))!);
    return Number(row?.n ?? 0);
  }

  const conditions = [eq(vacancies.status, "open")];
  if (slugFilter) {
    conditions.push(eq(categories.slug, slugFilter));
  }
  if (qRaw && qRaw.length > 0) {
    const pattern = `%${escapeIlikeFragment(qRaw.slice(0, 200))}%`;
    conditions.push(
      or(
        ilike(vacancies.jobTitle, pattern),
        ilike(vacancies.companyNameDenorm, pattern),
        ilike(vacancies.description, pattern),
      )!,
    );
  }
  if (jobType) {
    conditions.push(eq(vacancies.jobType, jobType));
  }
  const nextWhere = and(...conditions)!;

  const [row] = await db
    .select({ n: count() })
    .from(vacancies)
    .leftJoin(categories, eq(vacancies.categoryId, categories.id))
    .where(nextWhere);

  return Number(row?.n ?? 0);
}

async function findCompanyByOwnerAndName(ownerUserId: string, name: string) {
  const db = getDrizzleDb();
  const rows = await db
    .select()
    .from(companies)
    .where(
      and(
        eq(companies.ownerUserId, ownerUserId),
        sql`lower(${companies.name}) = lower(${name})`,
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function ensureCompanyForOwner(ownerUserId: string, name: string) {
  const existing = await findCompanyByOwnerAndName(ownerUserId, name);
  if (existing) return existing;

  const db = getDrizzleDb();
  const inserted = await db
    .insert(companies)
    .values({ ownerUserId, name })
    .returning();
  return inserted[0];
}

export async function insertVacancyForOwner(input: {
  ownerUserId: string;
  companyName: string;
  jobTitle: string;
  jobType: JobType;
  location: string;
  salary: string;
  description: string;
  requirements: string;
  categorySlug?: string | null;
}) {
  const db = getDrizzleDb();
  const company = await ensureCompanyForOwner(input.ownerUserId, input.companyName);
  const id = crypto.randomUUID();

  let categoryId: string | null = null;
  if (input.categorySlug?.trim()) {
    categoryId = await resolveActiveCategoryIdBySlug(input.categorySlug);
    if (!categoryId) {
      throw new Error("INVALID_CATEGORY_SLUG");
    }
  }

  const [row] = await db
    .insert(vacancies)
    .values({
      id,
      companyId: company.id,
      categoryId,
      companyNameDenorm: input.companyName,
      jobTitle: input.jobTitle,
      jobType: input.jobType,
      location: input.location,
      salary: input.salary,
      description: input.description,
      requirements: input.requirements,
      status: "open",
      postedByUserId: input.ownerUserId,
    })
    .returning();

  return mapJoinedRowByVacancyId(row.id);
}

export type UpdateVacancyForOwnerResult =
  | { ok: true; vacancy: Vacancy }
  | { ok: false; reason: "NOT_FOUND_OR_FORBIDDEN" | "INVALID_CATEGORY_SLUG" };

export async function updateVacancyForOwner(
  vacancyId: string,
  ownerUserId: string,
  patch: Partial<{
    companyName: string;
    jobTitle: string;
    jobType?: JobType;
    location: string;
    salary: string;
    description: string;
    requirements: string;
    status: "open" | "closed";
    categorySlug: string | null;
  }>,
): Promise<UpdateVacancyForOwnerResult> {
  const db = getDrizzleDb();
  const existing = await db.select().from(vacancies).where(eq(vacancies.id, vacancyId)).limit(1);
  const row = existing[0];
  if (!row || row.postedByUserId !== ownerUserId) {
    return { ok: false as const, reason: "NOT_FOUND_OR_FORBIDDEN" as const };
  }

  let companyId = row.companyId;
  let companyNameDenorm = row.companyNameDenorm;

  if (patch.companyName && patch.companyName !== row.companyNameDenorm) {
    const company = await ensureCompanyForOwner(ownerUserId, patch.companyName);
    companyId = company.id;
    companyNameDenorm = patch.companyName;
  }

  let nextCategoryId = row.categoryId;
  if ("categorySlug" in patch) {
    if (patch.categorySlug === null || patch.categorySlug === "") {
      nextCategoryId = null;
    } else {
      const resolved = await resolveActiveCategoryIdBySlug(patch.categorySlug);
      if (!resolved) {
        return { ok: false as const, reason: "INVALID_CATEGORY_SLUG" as const };
      }
      nextCategoryId = resolved;
    }
  }

  const [updated] = await db
    .update(vacancies)
    .set({
      companyId,
      companyNameDenorm,
      categoryId: nextCategoryId,
      jobTitle: patch.jobTitle ?? row.jobTitle,
      jobType: patch.jobType !== undefined ? patch.jobType : (row.jobType as JobType),
      location: patch.location ?? row.location,
      salary: patch.salary ?? row.salary,
      description: patch.description ?? row.description,
      requirements: patch.requirements ?? row.requirements,
      status: patch.status ?? row.status,
      updatedAt: new Date(),
    })
    .where(eq(vacancies.id, vacancyId))
    .returning();

  const vacancy = await mapJoinedRowByVacancyId(updated.id);
  return { ok: true as const, vacancy };
}

async function mapJoinedRowByVacancyId(id: string): Promise<Vacancy> {
  const db = getDrizzleDb();
  const rows = await db
    .select({
      v: vacancies,
      catSlug: categories.slug,
      catLabel: categories.label,
    })
    .from(vacancies)
    .leftJoin(categories, eq(vacancies.categoryId, categories.id))
    .where(eq(vacancies.id, id))
    .limit(1);

  const r = rows[0];
  if (!r) {
    throw new Error("VACANCY_ROW_MISSING_AFTER_WRITE");
  }
  return mapPostgresVacancyRow(r.v, catSummaryFromJoined(r.catSlug, r.catLabel));
}

export async function listVacanciesForOwner(ownerUserId: string) {
  const db = getDrizzleDb();
  const rows = await db
    .select({
      v: vacancies,
      catSlug: categories.slug,
      catLabel: categories.label,
    })
    .from(vacancies)
    .leftJoin(categories, eq(vacancies.categoryId, categories.id))
    .where(eq(vacancies.postedByUserId, ownerUserId))
    .orderBy(desc(vacancies.updatedAt));

  return rows.map((r) => mapPostgresVacancyRow(r.v, catSummaryFromJoined(r.catSlug, r.catLabel)));
}

export async function getVacancyById(id: string): Promise<Vacancy | null> {
  const db = getDrizzleDb();
  const rows = await db
    .select({
      v: vacancies,
      catSlug: categories.slug,
      catLabel: categories.label,
    })
    .from(vacancies)
    .leftJoin(categories, eq(vacancies.categoryId, categories.id))
    .where(eq(vacancies.id, id))
    .limit(1);

  const r = rows[0];
  return r ? mapPostgresVacancyRow(r.v, catSummaryFromJoined(r.catSlug, r.catLabel)) : null;
}

/** Public job page: only open vacancies (closed or missing → null). */
export async function getOpenVacancyByIdFromPostgres(id: string): Promise<Vacancy | null> {
  const db = getDrizzleDb();
  const rows = await db
    .select({
      v: vacancies,
      catSlug: categories.slug,
      catLabel: categories.label,
    })
    .from(vacancies)
    .leftJoin(categories, eq(vacancies.categoryId, categories.id))
    .where(and(eq(vacancies.id, id), eq(vacancies.status, "open")))
    .limit(1);

  const r = rows[0];
  return r ? mapPostgresVacancyRow(r.v, catSummaryFromJoined(r.catSlug, r.catLabel)) : null;
}

function isMissingStatusUpdatedAtColumn(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /status_updated_at/i.test(msg);
}

export async function recordApplicationPostgres(vacancyId: string, candidateUserId: string) {
  const db = getDrizzleDb();

  try {
    await db
      .insert(applications)
      .values({ vacancyId, candidateUserId, status: "applied", statusUpdatedAt: new Date() })
      .onConflictDoNothing({ target: [applications.vacancyId, applications.candidateUserId] });
  } catch (err) {
    if (!isMissingStatusUpdatedAtColumn(err)) throw err;
    await db
      .insert(applications)
      .values({ vacancyId, candidateUserId, status: "applied" })
      .onConflictDoNothing({ target: [applications.vacancyId, applications.candidateUserId] });
  }
}
