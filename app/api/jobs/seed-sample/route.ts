import { NextRequest, NextResponse } from "next/server";
import { requireTalentBridgeSession } from "../../../../src/server/auth/requireSession";
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

  const authResult = await requireTalentBridgeSession(request);
  if (authResult.ok === false) return authResult.response;

  const created = [];
  try {
    for (const template of SAMPLE_VACANCY_TEMPLATES) {
      const vacancy = await insertVacancyForOwner({
        ownerUserId: authResult.user.userId,
        companyName: template.companyName,
        jobTitle: template.jobTitle,
        location: template.location,
        salary: template.salary,
        description: template.description,
        requirements: template.requirements,
        categorySlug: template.categorySlug,
      });
      created.push(vacancy);
    }
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CATEGORY_SLUG") {
      return NextResponse.json(
        {
          error: "Sample categories missing. Apply database migration 0002_categories.sql.",
          hint: 'Run: node scripts/db-apply.mjs database/migrations/0002_categories.sql',
        },
        { status: 400 },
      );
    }
    throw error;
  }

  await recordAiAudit({
    actorUserId: authResult.user.userId,
    eventType: "vacancy.seed_sample",
    payload: { vacancyCount: SAMPLE_VACANCY_TEMPLATES.length },
    provider: "system",
    model: null,
  });

  return NextResponse.json({ jobs: created, count: created.length });
}
