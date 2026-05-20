import { and, asc, eq } from "drizzle-orm";

import { getDrizzleDb, hasPostgresConfigured } from "../db/postgres";
import { categories } from "../schema";
import { isMvpTalentCategorySlug, sortedMvpTalentCategories } from "../../shared/mvpCategories";

export type PublicCategoryDTO = {
  slug: string;
  label: string;
  sortOrder: number;
};

/**
 * Lists active categories for public UI; falls back to in-code MVP list when Postgres
 * is not configured or the table is empty.
 */
export async function listPublicCategories(): Promise<PublicCategoryDTO[]> {
  if (!hasPostgresConfigured()) {
    return sortedMvpTalentCategories();
  }

  const db = getDrizzleDb();
  const rows = await db
    .select({
      slug: categories.slug,
      label: categories.label,
      sortOrder: categories.sortOrder,
    })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder), asc(categories.slug));

  if (rows.length > 0) {
    return rows;
  }

  return sortedMvpTalentCategories();
}

/** True when slug is an active row in the catalog (or a known MVP slug when Postgres is off). */
export async function isKnownActiveCategorySlug(rawSlug: string): Promise<boolean> {
  const slug = rawSlug.trim().toLowerCase();
  if (!slug) return false;
  if (!hasPostgresConfigured()) {
    return isMvpTalentCategorySlug(slug);
  }
  const db = getDrizzleDb();
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.slug, slug), eq(categories.isActive, true)))
    .limit(1);
  return rows.length > 0;
}
