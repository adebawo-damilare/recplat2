import { NextRequest, NextResponse } from "next/server";

import { requireTalentBridgeSession } from "../../../../../src/server/auth/requireSession";
import { requireRole } from "../../../../../src/server/auth/requireRole";
import { hasPostgresConfigured } from "../../../../../src/server/db/postgres";
import { enforceJobsApiRateLimit } from "../../../../../src/server/distributedRateLimit";
import { getInvitationByApplicationId } from "../../../../../src/server/screenings";
import { getClientKey } from "../../../../../src/server/rateLimit";

type RouteParams = Promise<{ applicationId: string }>;

export async function GET(request: NextRequest, context: { params: RouteParams }) {
  const { applicationId } = await context.params;
  const key = getClientKey(
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    "/api/screenings/by-application",
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

  const invitation = await getInvitationByApplicationId(applicationId.trim());
  return NextResponse.json({ invitation: invitation ?? null });
}
