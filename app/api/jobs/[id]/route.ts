import { NextRequest, NextResponse } from "next/server";
import { requireTalentBridgeSession } from "../../../../src/server/auth/requireSession";
import { requireRole } from "../../../../src/server/auth/requireRole";
import { hasPostgresConfigured } from "../../../../src/server/db/postgres";
import { enforceJobsApiRateLimit } from "../../../../src/server/distributedRateLimit";
import { isMvpTalentCategorySlug } from "../../../../src/shared/mvpCategories";
import { parseCategorySlugForPatch } from "../../../../src/server/jobs/vacancyPayload";
import { getOpenVacancyById, updateVacancyForOwner } from "../../../../src/server/jobs";
import { parseJobTypeRequired } from "../../../../src/shared/jobTypes";
import { getClientKey } from "../../../../src/server/rateLimit";

type RouteParams = Promise<{ id: string }>;

export async function GET(request: NextRequest, context: { params: RouteParams }) {
  const { id } = await context.params;
  const trimmed = id?.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "Invalid job id.", code: "BAD_REQUEST" }, { status: 400 });
  }

  const key = getClientKey(
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    `/api/jobs/${trimmed}#get`,
  );
  const rate = await enforceJobsApiRateLimit(key);

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please retry shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Backend": rate.backend,
        },
      },
    );
  }

  if (!hasPostgresConfigured()) {
    return NextResponse.json({ code: "POSTGRES_UNAVAILABLE" }, { status: 503 });
  }

  try {
    const job = await getOpenVacancyById(trimmed);
    if (!job) {
      return NextResponse.json({ error: "Job not found.", code: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json(
      { job },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
          "X-RateLimit-Remaining": String(rate.remaining),
          "X-RateLimit-Backend": rate.backend,
        },
      },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "JOBS_POSTGRES_REQUIRED") {
      return NextResponse.json(
        { error: "Vacancy detail requires Postgres.", code: "JOBS_POSTGRES_REQUIRED" },
        { status: 503 },
      );
    }
    console.error("[GET /api/jobs/[id]]", error);
    return NextResponse.json({ error: "Unable to fetch job." }, { status: 500 });
  }
}

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
    jobType: string;
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

  const { categorySlug: _ignoredCategory, jobType: _ignoredJobType, ...restFields } = body;
  const patch: Parameters<typeof updateVacancyForOwner>[2] = { ...restFields };

  if (Object.prototype.hasOwnProperty.call(raw, "jobType")) {
    const jt = parseJobTypeRequired((raw as { jobType?: unknown }).jobType);
    if (jt.ok === false) {
      return NextResponse.json({ error: jt.message }, { status: 400 });
    }
    patch.jobType = jt.value;
  }

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
