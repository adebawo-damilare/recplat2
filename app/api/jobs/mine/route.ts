import { NextRequest, NextResponse } from "next/server";
import { requireTalentBridgeSession } from "../../../../src/server/auth/requireSession";
import { hasPostgresConfigured } from "../../../../src/server/db/postgres";
import { enforceJobsApiRateLimit } from "../../../../src/server/distributedRateLimit";
import { listVacanciesForOwner } from "../../../../src/server/jobs";
import { getClientKey } from "../../../../src/server/rateLimit";

export async function GET(request: NextRequest) {
  const key = getClientKey(
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    "/api/jobs/mine",
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

  const jobs = await listVacanciesForOwner(authResult.user.userId);
  return NextResponse.json({
    jobs,
    count: jobs.length,
  });
}
