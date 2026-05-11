import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { requireTalentBridgeSession } from "../../../../../src/server/auth/requireSession";
import { requireRole } from "../../../../../src/server/auth/requireRole";
import { canManageRolesForEmail } from "../../../../../src/server/auth/roleAdminAllowlist";
import { getDrizzleDb, hasPostgresConfigured } from "../../../../../src/server/db/postgres";
import { users } from "../../../../../src/server/schema";
import { recordAiAudit } from "../../../../../src/server/ai/audit";

function parseRequestedRole(raw: unknown): "candidate" | "recruiter" | null {
  if (raw === "candidate" || raw === "recruiter") return raw;
  return null;
}

export async function POST(request: NextRequest) {
  if (!hasPostgresConfigured()) {
    return NextResponse.json({ code: "POSTGRES_UNAVAILABLE" }, { status: 503 });
  }

  const auth = await requireTalentBridgeSession(request);
  if (auth.ok === false) return auth.response;
  const recruiterCheck = requireRole(auth.user, "recruiter");
  if (recruiterCheck.ok === false) return recruiterCheck.response;

  if (!canManageRolesForEmail(auth.user.email)) {
    return NextResponse.json(
      { error: "Role admin is disabled or your account is not allowlisted.", code: "FORBIDDEN_ROLE_ADMIN" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const b = body as { email?: unknown; role?: unknown };
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const nextRole = parseRequestedRole(b.role);
  if (!email || !email.includes("@") || !nextRole) {
    return NextResponse.json({ error: "email and role are required." }, { status: 400 });
  }
  if (email === auth.user.email.toLowerCase()) {
    return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 });
  }

  const db = getDrizzleDb();
  const matches = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);
  const target = matches[0];
  if (!target) {
    return NextResponse.json({ error: "Target user not found." }, { status: 404 });
  }

  const currentRole: "candidate" | "recruiter" = target.role === "recruiter" ? "recruiter" : "candidate";
  if (currentRole === nextRole) {
    return NextResponse.json({ user: { id: target.id, email: target.email, role: currentRole }, changed: false });
  }

  await db.update(users).set({ role: nextRole, updatedAt: new Date() }).where(sql`${users.id} = ${target.id}`);
  await recordAiAudit({
    actorUserId: auth.user.userId,
    eventType: "user.role_changed",
    provider: "system",
    model: null,
    payload: {
      targetUserId: target.id,
      targetEmail: target.email,
      fromRole: currentRole,
      toRole: nextRole,
    },
  });

  return NextResponse.json({
    user: { id: target.id, email: target.email, role: nextRole },
    changed: true,
  });
}
