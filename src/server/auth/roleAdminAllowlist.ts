/** Same rules as `POST /api/admin/users/role` — used by session payload and that route. */
export function canManageRolesForEmail(actorEmail: string): boolean {
  if (process.env.TALENTBRIDGE_ENABLE_ROLE_ADMIN !== "1") return false;
  const configured = (process.env.TALENTBRIDGE_ROLE_ADMIN_EMAILS || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  if (configured.length === 0) return false;
  return configured.includes(actorEmail.toLowerCase());
}
