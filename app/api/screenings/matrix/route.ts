import { NextRequest, NextResponse } from "next/server";

import { requireTalentBridgeSession } from "../../../../src/server/auth/requireSession";
import { requireRole } from "../../../../src/server/auth/requireRole";
import { hasPostgresConfigured } from "../../../../src/server/db/postgres";
import { enforceJobsApiRateLimit } from "../../../../src/server/distributedRateLimit";
import { listScreeningMatrixForOwner } from "../../../../src/server/screenings";
import { SCREENING_ENABLED_CATEGORY_SLUGS } from "../../../../src/shared/screeningPilot";
import { getClientKey } from "../../../../src/server/rateLimit";

export async function GET(request: NextRequest) {
  const key = getClientKey(
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    "/api/screenings/matrix",
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

  const vacancyId = request.nextUrl.searchParams.get("vacancyId");
  const categorySlugParam = request.nextUrl.searchParams.get("categorySlug");
  const categorySlug =
    categorySlugParam?.trim().toLowerCase() || SCREENING_ENABLED_CATEGORY_SLUGS[0];

  const matrix = await listScreeningMatrixForOwner(authResult.user.userId, {
    vacancyId,
    categorySlug,
  });

  return NextResponse.json(matrix);
}
