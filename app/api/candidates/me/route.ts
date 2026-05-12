import { NextRequest, NextResponse } from "next/server";

import { requireTalentBridgeSession } from "../../../../src/server/auth/requireSession";
import { requireRole } from "../../../../src/server/auth/requireRole";
import { hasPostgresConfigured } from "../../../../src/server/db/postgres";
import { enforceJobsApiRateLimit } from "../../../../src/server/distributedRateLimit";
import { getCandidateProfileByUserId, upsertCandidateProfileForUser } from "../../../../src/server/candidates/postgresCandidates";
import { getClientKey } from "../../../../src/server/rateLimit";

export async function GET(request: NextRequest) {
  const key = getClientKey(
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    "/api/candidates/me",
  );
  const rate = await enforceJobsApiRateLimit(key);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  if (!hasPostgresConfigured()) {
    return NextResponse.json({ code: "POSTGRES_UNAVAILABLE" }, { status: 503 });
  }

  const auth = await requireTalentBridgeSession(request);
  if (auth.ok === false) return auth.response;
  const roleCheck = requireRole(auth.user, "candidate");
  if (roleCheck.ok === false) return roleCheck.response;

  const profile = await getCandidateProfileByUserId(auth.user.userId);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  return NextResponse.json({ profile }, { headers: { "X-RateLimit-Remaining": String(rate.remaining) } });
}

export async function PATCH(request: NextRequest) {
  const key = getClientKey(
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    "/api/candidates/me#patch",
  );
  const rate = await enforceJobsApiRateLimit(key);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  if (!hasPostgresConfigured()) {
    return NextResponse.json({ code: "POSTGRES_UNAVAILABLE" }, { status: 503 });
  }

  const auth = await requireTalentBridgeSession(request);
  if (auth.ok === false) return auth.response;
  const roleCheck = requireRole(auth.user, "candidate");
  if (roleCheck.ok === false) return roleCheck.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const patch = body as Partial<Record<string, unknown>>;
  const mapped: Parameters<typeof upsertCandidateProfileForUser>[1] = {};

  if (typeof patch.firstName === "string") mapped.firstName = patch.firstName;
  if (typeof patch.lastName === "string") mapped.lastName = patch.lastName;
  if (typeof patch.email === "string") mapped.email = patch.email;
  if (typeof patch.headline === "string") mapped.headline = patch.headline;
  if (typeof patch.summary === "string") mapped.summary = patch.summary;
  if (typeof patch.skills === "string") mapped.skills = patch.skills;
  if (typeof patch.experience === "string") mapped.experience = patch.experience;
  if (patch.portfolioUrl === null || typeof patch.portfolioUrl === "string") {
    mapped.portfolioUrl = patch.portfolioUrl as string | null;
  }
  if (patch.portfolioContent === null || typeof patch.portfolioContent === "string") {
    mapped.portfolioContent = patch.portfolioContent as string | null;
  }

  const profile = await upsertCandidateProfileForUser(auth.user.userId, mapped);
  return NextResponse.json({ profile }, { headers: { "X-RateLimit-Remaining": String(rate.remaining) } });
}
