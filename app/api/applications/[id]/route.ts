import { NextRequest, NextResponse } from "next/server";

import { requireTalentBridgeSession } from "../../../../src/server/auth/requireSession";
import { requireRole } from "../../../../src/server/auth/requireRole";
import { hasPostgresConfigured } from "../../../../src/server/db/postgres";
import { enforceJobsApiRateLimit } from "../../../../src/server/distributedRateLimit";
import { updateApplicationStatusForVacancyOwner } from "../../../../src/server/applications/postgresApplications";
import { getClientKey } from "../../../../src/server/rateLimit";
import { normalizeApplicationStatus } from "../../../../src/lib/applicationStatus";
import { recordAiAudit } from "../../../../src/server/ai/audit";

type RouteParams = Promise<{ id: string }>;

export async function PATCH(request: NextRequest, context: { params: RouteParams }) {
  const { id } = await context.params;
  const key = getClientKey(
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    `/api/applications/${id}`,
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const status = normalizeApplicationStatus((body as { status?: unknown }).status);
  const result = await updateApplicationStatusForVacancyOwner(id, authResult.user.userId, status);

  if (result.ok === false) {
    if (result.reason === "NOT_FOUND") {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "You cannot update this application.", code: "FORBIDDEN" }, { status: 403 });
  }

  await recordAiAudit({
    actorUserId: authResult.user.userId,
    eventType: "application.status_updated",
    provider: "system",
    model: null,
    payload: { applicationId: id, status },
  });

  return NextResponse.json({ id, status });
}
