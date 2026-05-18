import { NextRequest, NextResponse } from "next/server";

import { requireTalentBridgeSession } from "../../../src/server/auth/requireSession";
import { requireRole } from "../../../src/server/auth/requireRole";
import { hasPostgresConfigured } from "../../../src/server/db/postgres";
import { createCompanyForRecruiter } from "../../../src/server/companies";
import { getClientKey } from "../../../src/server/rateLimit";
import { enforceJobsApiRateLimit } from "../../../src/server/distributedRateLimit";

export async function POST(request: NextRequest) {
  const key = getClientKey(
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    "/api/companies",
  );
  const rate = await enforceJobsApiRateLimit(key);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  if (!hasPostgresConfigured()) {
    return NextResponse.json({ code: "POSTGRES_UNAVAILABLE" }, { status: 503 });
  }

  const authResult = await requireTalentBridgeSession(request);
  if (authResult.ok === false) return authResult.response;
  const roleCheck = requireRole(authResult.user, "recruiter");
  if (roleCheck.ok === false) return roleCheck.response;

  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Company name is required." }, { status: 400 });
  }

  const company = await createCompanyForRecruiter(authResult.user.userId, name);
  if (!company) {
    return NextResponse.json({ error: "Could not create company." }, { status: 500 });
  }

  return NextResponse.json({ company }, { status: 201 });
}
