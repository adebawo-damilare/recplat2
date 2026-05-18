import { and, asc, eq } from "drizzle-orm";

import { isMvpTalentCategorySlug } from "../../shared/mvpCategories";
import { getDrizzleDb } from "../db/postgres";
import {
  candidateProfileFieldValues,
  candidateProfiles,
  categories,
  categoryFields,
} from "../schema";

export type CategoryFieldDefinition = {
  id: string;
  fieldKey: string;
  label: string;
  sortOrder: number;
  fieldType: "text" | "textarea";
};

export type CandidateCategoryFieldValue = {
  fieldId: string;
  fieldKey: string;
  label: string;
  value: string;
};

export async function listActiveFieldsForCategorySlug(
  categorySlug: string,
): Promise<CategoryFieldDefinition[]> {
  const slug = categorySlug.trim().toLowerCase();
  if (!isMvpTalentCategorySlug(slug)) return [];

  const db = getDrizzleDb();
  const rows = await db
    .select({
      id: categoryFields.id,
      fieldKey: categoryFields.fieldKey,
      label: categoryFields.label,
      sortOrder: categoryFields.sortOrder,
      fieldType: categoryFields.fieldType,
    })
    .from(categoryFields)
    .innerJoin(categories, eq(categoryFields.categoryId, categories.id))
    .where(and(eq(categories.slug, slug), eq(categoryFields.isActive, true)))
    .orderBy(asc(categoryFields.sortOrder));

  return rows.map((r) => ({
    id: r.id,
    fieldKey: r.fieldKey,
    label: r.label,
    sortOrder: r.sortOrder,
    fieldType: r.fieldType === "textarea" ? "textarea" : "text",
  }));
}

export async function getCandidateFieldValuesForLane(
  userId: string,
  categorySlug: string | null | undefined,
): Promise<CandidateCategoryFieldValue[]> {
  const slug = categorySlug?.trim().toLowerCase();
  if (!slug || !isMvpTalentCategorySlug(slug)) return [];

  const defs = await listActiveFieldsForCategorySlug(slug);
  if (defs.length === 0) return [];

  const db = getDrizzleDb();
  const valueRows = await db
    .select({
      fieldId: candidateProfileFieldValues.fieldId,
      valueText: candidateProfileFieldValues.valueText,
    })
    .from(candidateProfileFieldValues)
    .where(eq(candidateProfileFieldValues.userId, userId));

  const byFieldId = new Map(valueRows.map((r) => [r.fieldId, r.valueText]));

  return defs.map((d) => ({
    fieldId: d.id,
    fieldKey: d.fieldKey,
    label: d.label,
    value: byFieldId.get(d.id)?.trim() ?? "",
  }));
}

export async function saveCandidateFieldValues(
  userId: string,
  categorySlug: string,
  valuesByFieldKey: Record<string, string>,
): Promise<void> {
  const slug = categorySlug.trim().toLowerCase();
  if (!isMvpTalentCategorySlug(slug)) return;

  const defs = await listActiveFieldsForCategorySlug(slug);
  const db = getDrizzleDb();
  const now = new Date();

  for (const d of defs) {
    const raw = valuesByFieldKey[d.fieldKey];
    if (raw === undefined) continue;
    const valueText = String(raw).trim().slice(0, 4000);
    await db
      .insert(candidateProfileFieldValues)
      .values({ userId, fieldId: d.id, valueText, updatedAt: now })
      .onConflictDoUpdate({
        target: [candidateProfileFieldValues.userId, candidateProfileFieldValues.fieldId],
        set: { valueText, updatedAt: now },
      });
  }

  await db
    .update(candidateProfiles)
    .set({ primaryTalentLaneSlug: slug, updatedAt: now })
    .where(eq(candidateProfiles.userId, userId));
}
