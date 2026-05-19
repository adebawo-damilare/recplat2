import { NextRequest, NextResponse } from "next/server";

import { requireTalentBridgeSession } from "../../../../../src/server/auth/requireSession";
import { requireRole } from "../../../../../src/server/auth/requireRole";
import { hasPostgresConfigured } from "../../../../../src/server/db/postgres";
import { listApplicationPipelineAudit } from "../../../../../src/server/applications/postgresApplicationPipeline";
import { enforceJobsApiRateLimit } from "../../../../../src/server/distributedRateLimit";
import { getClientKey } from "../../../../../src/server/rateLimit";

type RouteParams = Promise<{ id: string }>;

export async function GET(request: NextRequest, context: { params: RouteParams }) {
  const { id } = await context.params;
  const key = getClientKey(
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    `/api/applications/${id}/audit`,
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

  const result = await listApplicationPipelineAudit(id, authResult.user.userId);
  if (result.ok === false) {
    const status = result.reason === "NOT_FOUND" ? 404 : 403;
    return NextResponse.json({ error: result.reason }, { status });
  }

  return NextResponse.json({
    statusEvents: result.statusEvents,
    notes: result.notes,
  });
}
