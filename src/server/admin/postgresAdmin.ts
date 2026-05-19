import { asc, count, eq, sql } from "drizzle-orm";

import { getDrizzleDb } from "../db/postgres";
import {
  applications,
  categories,
  notifications,
  screeningInvitations,
  users,
  vacancies,
} from "../schema";

export type PlatformSummary = {
  users: number;
  recruiters: number;
  candidates: number;
  openVacancies: number;
  applications: number;
  notifications: number;
  screeningInvitations: number;
};

export type AdminCategoryRow = {
  slug: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  openVacancyCount: number;
};

export async function getPlatformSummary(): Promise<PlatformSummary> {
  const db = getDrizzleDb();
  const [userRows] = await db
    .select({
      users: count(),
      recruiters: sql<number>`count(*) filter (where ${users.role} = 'recruiter')::int`,
      candidates: sql<number>`count(*) filter (where ${users.role} <> 'recruiter')::int`,
    })
    .from(users);

  const [vacRows] = await db
    .select({
      openVacancies: sql<number>`count(*) filter (where ${vacancies.status} = 'open')::int`,
    })
    .from(vacancies);

  const [appRows] = await db.select({ applications: count() }).from(applications);
  const [notifRows] = await db.select({ notifications: count() }).from(notifications);
  const [screenRows] = await db.select({ screeningInvitations: count() }).from(screeningInvitations);

  return {
    users: Number(userRows?.users ?? 0),
    recruiters: Number(userRows?.recruiters ?? 0),
    candidates: Number(userRows?.candidates ?? 0),
    openVacancies: Number(vacRows?.openVacancies ?? 0),
    applications: Number(appRows?.applications ?? 0),
    notifications: Number(notifRows?.notifications ?? 0),
    screeningInvitations: Number(screenRows?.screeningInvitations ?? 0),
  };
}

export async function listAdminCategories(): Promise<AdminCategoryRow[]> {
  const db = getDrizzleDb();
  const rows = await db
    .select({
      slug: categories.slug,
      label: categories.label,
      sortOrder: categories.sortOrder,
      isActive: categories.isActive,
      openVacancyCount: sql<number>`count(${vacancies.id}) filter (where ${vacancies.status} = 'open')::int`,
    })
    .from(categories)
    .leftJoin(vacancies, eq(vacancies.categoryId, categories.id))
    .groupBy(categories.id, categories.slug, categories.label, categories.sortOrder, categories.isActive)
    .orderBy(asc(categories.sortOrder), asc(categories.slug));

  return rows.map((r) => ({
    slug: r.slug,
    label: r.label,
    sortOrder: r.sortOrder,
    isActive: r.isActive,
    openVacancyCount: Number(r.openVacancyCount ?? 0),
  }));
}

export async function updateAdminCategory(
  slug: string,
  patch: { label?: string; isActive?: boolean; sortOrder?: number },
): Promise<AdminCategoryRow | null> {
  const trimmedSlug = slug.trim().toLowerCase();
  if (!trimmedSlug) return null;

  const db = getDrizzleDb();
  const set: Partial<{ label: string; isActive: boolean; sortOrder: number }> = {};
  if (typeof patch.label === "string" && patch.label.trim()) set.label = patch.label.trim();
  if (typeof patch.isActive === "boolean") set.isActive = patch.isActive;
  if (typeof patch.sortOrder === "number" && Number.isFinite(patch.sortOrder)) {
    set.sortOrder = Math.trunc(patch.sortOrder);
  }
  if (Object.keys(set).length === 0) return null;

  const [row] = await db
    .update(categories)
    .set(set)
    .where(eq(categories.slug, trimmedSlug))
    .returning({
      id: categories.id,
      slug: categories.slug,
      label: categories.label,
      sortOrder: categories.sortOrder,
      isActive: categories.isActive,
    });

  if (!row) return null;

  const [vc] = await db
    .select({ openVacancyCount: sql<number>`count(*) filter (where ${vacancies.status} = 'open')::int` })
    .from(vacancies)
    .where(eq(vacancies.categoryId, row.id));

  return {
    slug: row.slug,
    label: row.label,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    openVacancyCount: Number(vc?.openVacancyCount ?? 0),
  };
}
