import { NextRequest, NextResponse } from "next/server";

import { requireTalentBridgeSession } from "../../../../src/server/auth/requireSession";
import { requireRole } from "../../../../src/server/auth/requireRole";
import { hasPostgresConfigured } from "../../../../src/server/db/postgres";
import { listCompaniesForUser } from "../../../../src/server/companies";
import { getClientKey } from "../../../../src/server/rateLimit";
import { enforceJobsApiRateLimit } from "../../../../src/server/distributedRateLimit";

export async function GET(request: NextRequest) {
  const key = getClientKey(
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    "/api/companies/mine",
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

  const companies = await listCompaniesForUser(authResult.user.userId);
  return NextResponse.json({ companies });
}
