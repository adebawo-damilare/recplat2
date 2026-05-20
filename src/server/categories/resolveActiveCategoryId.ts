import { and, eq } from "drizzle-orm";

import { getDrizzleDb } from "../db/postgres";
import { hasPostgresConfigured } from "../db/postgres";
import { categories } from "../schema";
import { isMvpTalentCategorySlug } from "../../shared/mvpCategories";

/** Resolves slug to FK id only for known MVP lanes and active catalog rows. */
export async function resolveActiveCategoryIdBySlug(rawSlug: string): Promise<string | null> {
  const slug = rawSlug.trim().toLowerCase();
  if (!slug) {
    return null;
  }

  if (!hasPostgresConfigured()) {
    return isMvpTalentCategorySlug(slug) ? slug : null;
  }

  const db = getDrizzleDb();
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.slug, slug), eq(categories.isActive, true)))
    .limit(1);

  return rows[0]?.id ?? null;
}
