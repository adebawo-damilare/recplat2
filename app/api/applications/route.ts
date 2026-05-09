import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../../src/server/auth/firebaseAdmin";
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
    return NextResponse.json({ code: "POSTGRES_UNAVAILABLE" }, { status: 503 });
  }

  const authResult = await verifyFirebaseIdToken(request.headers.get("authorization"));
  if (authResult.ok === false) {
    if (authResult.reason === "ADMIN_UNAVAILABLE") {
      return NextResponse.json({ code: "FIREBASE_ADMIN_UNAVAILABLE" }, { status: 503 });
    }
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = await request.json();
  const vacancyId = typeof body.vacancyId === "string" ? body.vacancyId.trim() : "";
  if (!vacancyId) {
    return NextResponse.json({ error: "vacancyId is required." }, { status: 400 });
  }

  const vacancy = await getVacancyById(vacancyId);
  if (!vacancy || vacancy.status !== "open") {
    return NextResponse.json({ error: "Vacancy is not available." }, { status: 400 });
  }

  await recordApplicationPostgres(vacancyId, authResult.uid);
  await recordAiAudit({
    actorFirebaseUid: authResult.uid,
    eventType: "application.created",
    payload: { vacancyId },
    provider: "system",
    model: null,
  });

  return NextResponse.json({ ok: true, vacancyId });
}
