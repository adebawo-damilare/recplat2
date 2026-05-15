import { NextRequest, NextResponse } from "next/server";

import { requireTalentBridgeSession } from "../../../../src/server/auth/requireSession";
import { requireRole } from "../../../../src/server/auth/requireRole";
import { isJobsPostgresOnly } from "../../../../src/server/config/jobsBackendMode";
import { hasPostgresConfigured } from "../../../../src/server/db/postgres";
import { enforceJobsApiRateLimit } from "../../../../src/server/distributedRateLimit";
import { listApplicationsWithVacanciesForCandidate } from "../../../../src/server/applications/postgresApplications";
import { getClientKey } from "../../../../src/server/rateLimit";

export async function GET(request: NextRequest) {
  const key = getClientKey(
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    "/api/applications/mine",
  );
  const rate = await enforceJobsApiRateLimit(key);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  if (!hasPostgresConfigured()) {
    return NextResponse.json(
      { code: isJobsPostgresOnly() ? "JOBS_POSTGRES_REQUIRED" : "POSTGRES_UNAVAILABLE" },
      { status: 503 },
    );
  }

  const authResult = await requireTalentBridgeSession(request);
  if (authResult.ok === false) return authResult.response;
  const roleCheck = requireRole(authResult.user, "candidate");
  if (roleCheck.ok === false) return roleCheck.response;

  const rows = await listApplicationsWithVacanciesForCandidate(authResult.user.userId);

  const applications = rows.map((r) => ({
    id: r.id,
    vacancyId: r.vacancyId,
    candidateId: r.candidateId,
    status: r.status,
    appliedAt: r.appliedAt.toISOString(),
    statusUpdatedAt: r.statusUpdatedAt.toISOString(),
    vacancy: r.vacancy ?? undefined,
  }));

  return NextResponse.json({ applications, count: applications.length });
}
