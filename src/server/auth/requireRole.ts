import { NextResponse } from "next/server";
import type { SessionUser } from "./requireSession";

export function requireRole(
  user: SessionUser,
  role: "candidate" | "recruiter",
): { ok: true } | { ok: false; response: NextResponse } {
  if (user.role === role) return { ok: true };
  return {
    ok: false,
    response: NextResponse.json(
      { error: `This action requires a ${role} account.`, code: "FORBIDDEN_ROLE" },
      { status: 403 },
    ),
  };
}
