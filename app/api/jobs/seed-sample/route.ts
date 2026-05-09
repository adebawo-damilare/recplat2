import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../../../src/server/auth/firebaseAdmin";
import { hasPostgresConfigured } from "../../../../src/server/db/postgres";
import { enforceJobsApiRateLimit } from "../../../../src/server/distributedRateLimit";
import { insertVacancyForOwner } from "../../../../src/server/jobs";
import { recordAiAudit } from "../../../../src/server/ai/audit";
import { SAMPLE_VACANCY_TEMPLATES } from "../../../../src/server/jobs/sampleTemplates";
import { getClientKey } from "../../../../src/server/rateLimit";

export async function POST(request: NextRequest) {
  const key = getClientKey(
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    "/api/jobs/seed-sample",
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

  const created = [];
  for (const template of SAMPLE_VACANCY_TEMPLATES) {
    const vacancy = await insertVacancyForOwner({
      ownerUid: authResult.uid,
      companyName: template.companyName,
      jobTitle: template.jobTitle,
      location: template.location,
      salary: template.salary,
      description: template.description,
      requirements: template.requirements,
    });
    created.push(vacancy);
  }

  await recordAiAudit({
    actorFirebaseUid: authResult.uid,
    eventType: "vacancy.seed_sample",
    payload: { vacancyCount: SAMPLE_VACANCY_TEMPLATES.length },
    provider: "system",
    model: null,
  });

  return NextResponse.json({ jobs: created, count: created.length });
}
