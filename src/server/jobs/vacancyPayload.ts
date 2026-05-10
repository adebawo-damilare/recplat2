/**
 * Parses optional categorySlug from vacancy write payloads (keeps API routes thin).
 */

export type CreateCategorySlugResult =
  | { ok: true; slug: string | undefined }
  | { ok: false; error: "INVALID_CATEGORY_SLUG_FIELD" };

export function extractCategorySlugForCreate(body: Partial<Record<string, unknown>>): CreateCategorySlugResult {
  if (!Object.prototype.hasOwnProperty.call(body, "categorySlug")) {
    return { ok: true, slug: undefined };
  }
  const raw = body.categorySlug;
  if (raw === undefined || raw === null) {
    return { ok: true, slug: undefined };
  }
  if (typeof raw !== "string") {
    return { ok: false, error: "INVALID_CATEGORY_SLUG_FIELD" };
  }
  const t = raw.trim().toLowerCase();
  return { ok: true, slug: t || undefined };
}

export type CategorySlugPatchParsed =
  | { kind: "omit" }
  | { kind: "clear" }
  | { kind: "set"; slug: string }
  | { kind: "invalid" };

export function parseCategorySlugForPatch(body: Partial<Record<string, unknown>>): CategorySlugPatchParsed {
  if (!Object.prototype.hasOwnProperty.call(body, "categorySlug")) {
    return { kind: "omit" };
  }
  const raw = body.categorySlug;
  if (raw === null || raw === "") {
    return { kind: "clear" };
  }
  if (typeof raw !== "string") {
    return { kind: "invalid" };
  }
  const t = raw.trim().toLowerCase();
  if (!t) {
    return { kind: "clear" };
  }
  return { kind: "set", slug: t };
}
