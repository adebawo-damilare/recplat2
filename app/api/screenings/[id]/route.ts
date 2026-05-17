import { NextRequest, NextResponse } from "next/server";

import { requireTalentBridgeSession } from "../../../../src/server/auth/requireSession";
import { hasPostgresConfigured } from "../../../../src/server/db/postgres";
import { enforceJobsApiRateLimit } from "../../../../src/server/distributedRateLimit";
import { getInvitationDetailForUser } from "../../../../src/server/screenings";
import { getClientKey } from "../../../../src/server/rateLimit";

type RouteParams = Promise<{ id: string }>;

export async function GET(request: NextRequest, context: { params: RouteParams }) {
  const { id } = await context.params;
  const key = getClientKey(
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    `/api/screenings/${id}`,
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

  const result = await getInvitationDetailForUser(
    id.trim(),
    authResult.user.userId,
    authResult.user.role,
  );

  if (result.ok === false) {
    if (result.reason === "NOT_FOUND") {
      return NextResponse.json({ error: "Screening not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json({ invitation: result.invitation });
}
