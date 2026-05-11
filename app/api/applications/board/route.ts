import { NextRequest, NextResponse } from "next/server";

import { requireTalentBridgeSession } from "../../../../src/server/auth/requireSession";
import { requireRole } from "../../../../src/server/auth/requireRole";
import { hasPostgresConfigured } from "../../../../src/server/db/postgres";
import { enforceJobsApiRateLimit } from "../../../../src/server/distributedRateLimit";
import { listApplicationsBoardForOwner } from "../../../../src/server/applications/postgresApplications";
import { getClientKey } from "../../../../src/server/rateLimit";

export async function GET(request: NextRequest) {
  const key = getClientKey(
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    "/api/applications/board",
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

  const vacancyId = request.nextUrl.searchParams.get("vacancyId")?.trim() || null;
  const rows = await listApplicationsBoardForOwner(authResult.user.userId, vacancyId);

  return NextResponse.json({
    applications: rows.map((r) => ({
      id: r.id,
      vacancyId: r.vacancyId,
      candidateUserId: r.candidateUserId,
      status: r.status,
      appliedAt: r.appliedAt.toISOString(),
      vacancy: r.vacancy,
      candidate: r.candidate,
    })),
    count: rows.length,
  });
}
