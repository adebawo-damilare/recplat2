import { NextRequest, NextResponse } from "next/server";

import { requireTalentBridgeSession } from "../../../../src/server/auth/requireSession";
import { hasPostgresConfigured } from "../../../../src/server/db/postgres";
import { enforceJobsApiRateLimit } from "../../../../src/server/distributedRateLimit";
import { seedSampleCandidatesIfMissing } from "../../../../src/server/candidates/postgresCandidates";
import { getClientKey } from "../../../../src/server/rateLimit";

export async function POST(request: NextRequest) {
  const key = getClientKey(
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    "/api/candidates/seed-samples",
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

  const summary = await seedSampleCandidatesIfMissing();
  return NextResponse.json(summary, { headers: { "X-RateLimit-Remaining": String(rate.remaining) } });
}
