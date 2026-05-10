/**
 * MVP talent lanes for category-shaped recruiting (synthesis: start with few categories).
 * Kept here so `/api/categories` can serve a deterministic catalog when Postgres is empty
 * or unset, while SQL seed (`0002_categories.sql`) remains the authoritative source online.
 */

export interface MvpTalentCategory {
  slug: string;
  label: string;
  sortOrder: number;
}

export const MVP_TALENT_CATEGORIES: readonly MvpTalentCategory[] = [
  { slug: "marketers", label: "Marketers", sortOrder: 10 },
  { slug: "designers", label: "Designers", sortOrder: 20 },
  { slug: "sales", label: "Sales", sortOrder: 30 },
] as const;

const SLUG_ORDER = Object.fromEntries(
  MVP_TALENT_CATEGORIES.map((c, i) => [c.slug, c.sortOrder + i * 0.001]),
);

export function isMvpTalentCategorySlug(raw: string): boolean {
  const slug = raw.trim().toLowerCase();
  return MVP_TALENT_CATEGORIES.some((c) => c.slug === slug);
}

export function labelForMvpTalentSlug(slug: string): string | null {
  const key = slug.trim().toLowerCase();
  const row = MVP_TALENT_CATEGORIES.find((c) => c.slug === key);
  return row?.label ?? null;
}

export function sortedMvpTalentCategories(): MvpTalentCategory[] {
  return [...MVP_TALENT_CATEGORIES].sort((a, b) => {
    const oa = SLUG_ORDER[a.slug] ?? a.sortOrder;
    const ob = SLUG_ORDER[b.slug] ?? b.sortOrder;
    return oa - ob;
  });
}
