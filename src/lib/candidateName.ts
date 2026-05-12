/**
 * Candidate name formatting — API uses firstName/lastName (camelCase);
 * DB columns are first_name / last_name (snake_case).
 */

/** Formal display: "First Last" (trimmed parts, single space). */
export function formatCandidateFullName(firstName: string, lastName: string): string {
  const f = firstName.trim();
  const l = lastName.trim();
  if (f && l) return `${f} ${l}`;
  return f || l || "";
}

/** Casual greeting: given name only. */
export function formatCandidateGreetingFirst(firstName: string): string {
  const t = firstName.trim();
  return t || "there";
}

/** Single letter for avatar fallback (first initial). */
export function getCandidateAvatarLetter(firstName: string, lastName: string): string {
  const c = firstName.trim().charAt(0) || lastName.trim().charAt(0);
  return c ? c.toUpperCase() : "?";
}

/** Two-letter initials when possible. */
export function getCandidateInitials(firstName: string, lastName: string): string {
  const fi = firstName.trim().charAt(0);
  const li = lastName.trim().charAt(0);
  if (fi && li) return `${fi}${li}`.toUpperCase();
  return (fi || li || "?").toUpperCase();
}

export function candidateHasDisplayableName(firstName: string, lastName: string): boolean {
  return Boolean(firstName.trim() || lastName.trim());
}
