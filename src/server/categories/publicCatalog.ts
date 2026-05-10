import { asc, eq } from "drizzle-orm";

import { getDrizzleDb, hasPostgresConfigured } from "../db/postgres";
import { categories } from "../schema";
import { sortedMvpTalentCategories } from "../../shared/mvpCategories";

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
