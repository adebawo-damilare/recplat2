import { NextResponse } from "next/server";

import { requireTalentBridgeSession } from "../../../../src/server/auth/requireSession";
import { canManageRolesForEmail } from "../../../../src/server/auth/roleAdminAllowlist";

/** Returns the current session user when the JWT cookie/header is valid; otherwise `{ user: null }`. */
export async function GET(request: Request) {
  const r = await requireTalentBridgeSession(request);
  if (r.ok) {
    return NextResponse.json({
      user: {
        id: r.user.userId,
        email: r.user.email,
        role: r.user.role,
        canManageUserRoles: canManageRolesForEmail(r.user.email),
      },
    });
  }
  return NextResponse.json({ user: null });
}
