import { NextRequest, NextResponse } from "next/server";
import { requireTalentBridgeSession } from "../../../../src/server/auth/requireSession";
import { requireRole } from "../../../../src/server/auth/requireRole";
import { hasPostgresConfigured } from "../../../../src/server/db/postgres";
import { enforceJobsApiRateLimit } from "../../../../src/server/distributedRateLimit";
import { isMvpTalentCategorySlug } from "../../../../src/shared/mvpCategories";
import { parseCategorySlugForPatch } from "../../../../src/server/jobs/vacancyPayload";
import { updateVacancyForOwner } from "../../../../src/server/jobs";
import { getClientKey } from "../../../../src/server/rateLimit";

type RouteParams = Promise<{ id: string }>;

export async function PATCH(request: NextRequest, context: { params: RouteParams }) {
  const { id } = await context.params;
  const key = getClientKey(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"), `/api/jobs/${id}`);
  const rate = await enforceJobsApiRateLimit(key);

  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests. Please retry shortly." }, { status: 429 });
  }

  if (!hasPostgresConfigured()) {
    return NextResponse.json({ code: "POSTGRES_UNAVAILABLE" }, { status: 503 });
  }

  const authResult = await requireTalentBridgeSession(request);
  if (authResult.ok === false) return authResult.response;
  const roleCheck = requireRole(authResult.user, "recruiter");
  if (roleCheck.ok === false) return roleCheck.response;

  const raw = await request.json();
  const body = raw as Partial<{
    jobTitle: string;
    companyName: string;
    location: string;
    salary: string;
    description: string;
    requirements: string;
    status: "open" | "closed";
    categorySlug: string | null;
  }>;

  const catParsed = parseCategorySlugForPatch(raw as Partial<Record<string, unknown>>);
  if (catParsed.kind === "invalid") {
    return NextResponse.json({ error: "categorySlug must be a string or null when provided." }, { status: 400 });
  }

  if (catParsed.kind === "set" && !isMvpTalentCategorySlug(catParsed.slug)) {
    return NextResponse.json({ error: "Unknown category slug." }, { status: 400 });
  }

  const { categorySlug: _ignoredCategory, ...restFields } = body;
  const patch: Parameters<typeof updateVacancyForOwner>[2] = { ...restFields };

  if (catParsed.kind === "set") {
    patch.categorySlug = catParsed.slug;
  } else if (catParsed.kind === "clear") {
    patch.categorySlug = null;
  }

  const result = await updateVacancyForOwner(id, authResult.user.userId, patch);

  if (result.ok === false) {
    if (result.reason === "INVALID_CATEGORY_SLUG") {
      return NextResponse.json(
        { error: "Category is not provisioned yet. Apply migration 0002_categories.sql." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Unable to update vacancy." }, { status: 403 });
  }

  return NextResponse.json(
    { job: result.vacancy },
    {
      headers: {
        "X-RateLimit-Remaining": String(rate.remaining),
      },
    },
  );
}
