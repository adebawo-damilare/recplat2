/** Pilot lane for async screening + invitations (expand to other lanes after validation). */
export const SCREENING_PILOT_CATEGORY_SLUG = "marketers" as const;

export type ScreeningPilotCategorySlug = typeof SCREENING_PILOT_CATEGORY_SLUG;

export function isScreeningPilotCategorySlug(slug: string | null | undefined): slug is ScreeningPilotCategorySlug {
  return slug?.trim().toLowerCase() === SCREENING_PILOT_CATEGORY_SLUG;
}

export const SCREENING_INVITATION_STATUSES = ["pending", "submitted"] as const;
export type ScreeningInvitationStatus = (typeof SCREENING_INVITATION_STATUSES)[number];

export function screeningInvitationStatusLabel(status: ScreeningInvitationStatus): string {
  if (status === "submitted") return "Submitted";
  return "Awaiting responses";
}
