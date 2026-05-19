import { NextResponse } from "next/server";

import type { SessionUser } from "./requireSession";
import { canManageRolesForEmail } from "./roleAdminAllowlist";

export function requirePlatformAdmin(
  user: SessionUser,
): { ok: true } | { ok: false; response: NextResponse } {
  if (user.role !== "recruiter") {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "This action requires a recruiter account.", code: "FORBIDDEN_ROLE" },
        { status: 403 },
      ),
    };
  }
  if (!canManageRolesForEmail(user.email)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Platform admin is disabled or your account is not allowlisted.", code: "FORBIDDEN_ADMIN" },
        { status: 403 },
      ),
    };
  }
  return { ok: true as const };
}
