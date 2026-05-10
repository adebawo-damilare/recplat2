import type { Vacancy } from "./firebase";
import { labelForMvpTalentSlug } from "../shared/mvpCategories";

/** Normalizes a write-time category slug into the shape stored/read on Vacancy. */
export function categorySummaryFromWriteSlug(categorySlug?: string | null): Vacancy["category"] {
  const s = categorySlug?.trim().toLowerCase();
  if (!s) return undefined;
  const label = labelForMvpTalentSlug(s);
  if (!label) return undefined;
  return { slug: s, label };
}
