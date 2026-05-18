export type CategoryFieldDefinition = {
  id: string;
  fieldKey: string;
  label: string;
  sortOrder: number;
  fieldType: "text" | "textarea";
};

export async function fetchCategoryProfileFields(
  categorySlug: string,
): Promise<CategoryFieldDefinition[]> {
  const slug = categorySlug.trim().toLowerCase();
  if (!slug) return [];
  const res = await fetch(`/api/categories/${encodeURIComponent(slug)}/profile-fields`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  const raw = (await res.json().catch(() => ({}))) as { fields?: CategoryFieldDefinition[] };
  if (!res.ok || !Array.isArray(raw.fields)) return [];
  return raw.fields;
}
