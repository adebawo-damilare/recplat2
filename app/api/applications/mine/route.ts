import { NextRequest, NextResponse } from "next/server";

import { verifyFirebaseIdToken } from "../../../../src/server/auth/firebaseAdmin";
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

  const authResult = await verifyFirebaseIdToken(request.headers.get("authorization"));
  if (authResult.ok === false) {
    if (authResult.reason === "ADMIN_UNAVAILABLE") {
      return NextResponse.json({ code: "FIREBASE_ADMIN_UNAVAILABLE" }, { status: 503 });
    }
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const rows = await listApplicationsWithVacanciesForCandidate(authResult.uid);

  const applications = rows.map((r) => ({
    id: r.id,
    vacancyId: r.vacancyId,
    candidateId: r.candidateId,
    appliedAt: r.appliedAt.toISOString(),
    vacancy: r.vacancy ?? undefined,
  }));

  return NextResponse.json({ applications, count: applications.length });
}
