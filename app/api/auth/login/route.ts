import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { verifyPassword } from "../../../../src/server/auth/password";
import { buildSessionSetCookie } from "../../../../src/server/auth/authCookie";
import { SESSION_MAX_AGE_SECONDS, signTalentBridgeSessionToken, isAuthSecretConfigured } from "../../../../src/server/auth/sessionJwt";
import { hasPostgresConfigured, getDrizzleDb } from "../../../../src/server/db/postgres";
import { users } from "../../../../src/server/schema";

export async function POST(request: Request) {
  if (!isAuthSecretConfigured()) {
    return NextResponse.json({ code: "AUTH_UNAVAILABLE" }, { status: 503 });
  }
  if (!hasPostgresConfigured()) {
    return NextResponse.json({ code: "POSTGRES_UNAVAILABLE" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const b = body as { email?: unknown; password?: unknown };
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const db = getDrizzleDb();
  const rows = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);
  const u = rows[0];
  if (!u || !(await verifyPassword(password, u.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = await signTalentBridgeSessionToken(u.id, u.email);
  if (!token) {
    return NextResponse.json({ code: "AUTH_UNAVAILABLE" }, { status: 503 });
  }

  const role: "candidate" | "recruiter" = u.role === "recruiter" ? "recruiter" : "candidate";
  const res = NextResponse.json({ user: { id: u.id, email: u.email, role } });
  res.headers.append("Set-Cookie", buildSessionSetCookie(token, SESSION_MAX_AGE_SECONDS));
  return res;
}
