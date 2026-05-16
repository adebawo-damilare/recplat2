import { NextRequest, NextResponse } from "next/server";
import { requireTalentBridgeSession } from "../../../src/server/auth/requireSession";
import { requireRole } from "../../../src/server/auth/requireRole";
import { isJobsPostgresOnly } from "../../../src/server/config/jobsBackendMode";
import { hasPostgresConfigured } from "../../../src/server/db/postgres";
import { enforceJobsApiRateLimit } from "../../../src/server/distributedRateLimit";
import { getVacancyById, recordApplicationPostgres } from "../../../src/server/jobs";
import { recordAiAudit } from "../../../src/server/ai/audit";
import { getClientKey } from "../../../src/server/rateLimit";

export async function POST(request: NextRequest) {
  const key = getClientKey(
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    "/api/applications",
  );
  const rate = await enforceJobsApiRateLimit(key);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  if (!hasPostgresConfigured()) {
    return NextResponse.json(
      {
        code: isJobsPostgresOnly() ? "JOBS_POSTGRES_REQUIRED" : "POSTGRES_UNAVAILABLE",
      },
      { status: 503 },
    );
  }

  const authResult = await requireTalentBridgeSession(request);
  if (authResult.ok === false) return authResult.response;
  const roleCheck = requireRole(authResult.user, "candidate");
  if (roleCheck.ok === false) return roleCheck.response;

  const body = await request.json();
  const vacancyId = typeof body.vacancyId === "string" ? body.vacancyId.trim() : "";
  if (!vacancyId) {
    return NextResponse.json({ error: "vacancyId is required." }, { status: 400 });
  }

  const vacancy = await getVacancyById(vacancyId);
  if (!vacancy) {
    return NextResponse.json(
      { error: "Job not found. It may have been removed.", code: "VACANCY_NOT_FOUND" },
      { status: 404 },
    );
  }
  if (vacancy.status !== "open") {
    return NextResponse.json(
      { error: "This job is no longer accepting applications.", code: "VACANCY_CLOSED" },
      { status: 400 },
    );
  }

  const recorded = await recordApplicationPostgres(vacancyId, authResult.user.userId);
  if (recorded.created) {
    await recordAiAudit({
      actorUserId: authResult.user.userId,
      eventType: "application.created",
      payload: { vacancyId, applicationId: recorded.applicationId },
      provider: "system",
      model: null,
    });
  }

  return NextResponse.json({
    ok: true,
    created: recorded.created,
    applicationId: recorded.applicationId,
    vacancyId,
    ...(recorded.created
      ? {}
      : { message: "You have already applied to this job." }),
  });
}
