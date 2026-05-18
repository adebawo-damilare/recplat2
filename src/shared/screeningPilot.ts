import { isMvpTalentCategorySlug, labelForMvpTalentSlug } from "./mvpCategories";

/** Lanes with screening question templates enabled. */
export const SCREENING_ENABLED_CATEGORY_SLUGS = ["marketers", "designers", "sales"] as const;

export type ScreeningEnabledCategorySlug = (typeof SCREENING_ENABLED_CATEGORY_SLUGS)[number];

export function isScreeningEnabledCategorySlug(
  slug: string | null | undefined,
): slug is ScreeningEnabledCategorySlug {
  const s = slug?.trim().toLowerCase();
  return (
    s === "marketers" ||
    s === "designers" ||
    s === "sales"
  );
}

export function screeningLaneLabel(slug: string | null | undefined): string {
  const s = slug?.trim().toLowerCase();
  if (!s) return "Talent lane";
  return labelForMvpTalentSlug(s) ?? s;
}

/** @deprecated use isScreeningEnabledCategorySlug */
export const SCREENING_PILOT_CATEGORY_SLUG = "marketers" as const;

/** @deprecated use isScreeningEnabledCategorySlug */
export function isScreeningPilotCategorySlug(slug: string | null | undefined): boolean {
  return isScreeningEnabledCategorySlug(slug);
}

export const SCREENING_INVITATION_STATUSES = ["pending", "submitted"] as const;
export type ScreeningInvitationStatus = (typeof SCREENING_INVITATION_STATUSES)[number];

export function screeningInvitationStatusLabel(status: ScreeningInvitationStatus): string {
  if (status === "submitted") return "Submitted";
  return "Awaiting responses";
}
