import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { verifyRequestSession } from "./verifySession";
import { hasPostgresConfigured, getDrizzleDb } from "../db/postgres";
import { users } from "../schema";

export type SessionUser = {
  userId: string;
  email: string;
  role: "candidate" | "recruiter";
};

export async function requireTalentBridgeSession(
  request: Request,
): Promise<{ ok: true; user: SessionUser } | { ok: false; response: NextResponse }> {
  if (!hasPostgresConfigured()) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Authentication is not configured on this server.", code: "AUTH_UNAVAILABLE" },
        { status: 503 },
      ),
    };
  }

  const auth = await verifyRequestSession(request);
  if (auth.ok === false) {
    if (auth.reason === "AUTH_UNAVAILABLE") {
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: "Authentication is not configured on this server.", code: "AUTH_UNAVAILABLE" },
          { status: 503 },
        ),
      };
    }
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Authentication required.", code: "UNAUTHORIZED" }, { status: 401 }),
    };
  }

  const db = getDrizzleDb();
  const rows = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, auth.userId))
    .limit(1);
  const u = rows[0];
  if (!u) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Authentication required.", code: "UNAUTHORIZED" }, { status: 401 }),
    };
  }

  const role: "candidate" | "recruiter" = u.role === "recruiter" ? "recruiter" : "candidate";
  return { ok: true as const, user: { userId: u.id, email: u.email, role } };
}
