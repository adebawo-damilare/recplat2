import { NextResponse } from "next/server";

import { hashPassword } from "../../../../src/server/auth/password";
import { buildSessionSetCookie } from "../../../../src/server/auth/authCookie";
import { SESSION_MAX_AGE_SECONDS, signTalentBridgeSessionToken, isAuthSecretConfigured } from "../../../../src/server/auth/sessionJwt";
import { getDrizzleDb, hasPostgresConfigured } from "../../../../src/server/db/postgres";
import { candidateProfiles, users } from "../../../../src/server/schema";

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
  if (!email || !email.includes("@") || password.length < 8) {
    return NextResponse.json(
      { error: "Valid email and a password of at least 8 characters are required." },
      { status: 400 },
    );
  }

  const db = getDrizzleDb();
  const passwordHash = await hashPassword(password);

  let userId: string;
  try {
    const [inserted] = await db.insert(users).values({ email, passwordHash }).returning({ id: users.id });
    userId = inserted.id;
    await db.insert(candidateProfiles).values({
      userId,
      emailSnapshot: email,
      fullName: "",
      headline: "",
      summary: "",
      skills: "",
      experience: "",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("unique") || msg.includes("duplicate") || msg.includes("23505")) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    throw e;
  }

  const token = await signTalentBridgeSessionToken(userId, email);
  if (!token) {
    return NextResponse.json({ code: "AUTH_UNAVAILABLE" }, { status: 503 });
  }

  const res = NextResponse.json({ user: { id: userId, email } });
  res.headers.append("Set-Cookie", buildSessionSetCookie(token, SESSION_MAX_AGE_SECONDS));
  return res;
}
