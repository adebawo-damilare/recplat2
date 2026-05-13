import { NextRequest, NextResponse } from "next/server";
import { isMvpTalentCategorySlug } from "../../../src/shared/mvpCategories";
import { fetchOpenVacanciesPage, insertVacancyForOwner, countOpenVacancies } from "../../../src/server/jobs";
import { extractCategorySlugForCreate } from "../../../src/server/jobs/vacancyPayload";
import { enforceJobsApiRateLimit } from "../../../src/server/distributedRateLimit";
import { getClientKey } from "../../../src/server/rateLimit";
import { requireTalentBridgeSession } from "../../../src/server/auth/requireSession";
import { requireRole } from "../../../src/server/auth/requireRole";
import { hasPostgresConfigured } from "../../../src/server/db/postgres";
import { parseJobTypeRequired } from "../../../src/shared/jobTypes";

export const revalidate = 30;

export async function GET(request: NextRequest) {
  const key = getClientKey(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"), "/api/jobs");
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

  const { searchParams } = request.nextUrl;
  const limitParam = Number(searchParams.get("limit") || "20");
  const cursor = searchParams.get("cursor");
  const categoryParam = searchParams.get("category")?.trim().toLowerCase();
  const categorySlug =
    categoryParam && categoryParam !== "all"
      ? isMvpTalentCategorySlug(categoryParam)
        ? categoryParam
        : null
      : null;

  if (categoryParam && categorySlug === null && categoryParam !== "all") {
    return NextResponse.json({ error: "Unknown category filter." }, { status: 400 });
  }

  const qParam = request.nextUrl.searchParams.get("q")?.trim().slice(0, 200) || null;
  const includeTotal = request.nextUrl.searchParams.get("includeTotal") === "1";

  try {
    let jobs: Awaited<ReturnType<typeof fetchOpenVacanciesPage>>["jobs"];
    let nextCursor: string | null;
    let totalOpen: number | undefined;

    if (includeTotal) {
      const [page, total] = await Promise.all([
        fetchOpenVacanciesPage(limitParam, cursor, categorySlug, qParam),
        countOpenVacancies(categorySlug, qParam),
      ]);
      jobs = page.jobs;
      nextCursor = page.nextCursor;
      totalOpen = total;
    } else {
      const page = await fetchOpenVacanciesPage(limitParam, cursor, categorySlug, qParam);
      jobs = page.jobs;
      nextCursor = page.nextCursor;
    }

    return NextResponse.json(
      {
        jobs,
        count: jobs.length,
        ...(includeTotal && totalOpen !== undefined ? { totalOpen } : {}),
        pagination: {
          nextCursor,
          limit: Math.max(1, Math.min(limitParam, 50)),
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
          "X-RateLimit-Remaining": String(rate.remaining),
          "X-RateLimit-Backend": rate.backend,
        },
      },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CURSOR") {
      return NextResponse.json({ error: "Invalid cursor." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "JOBS_POSTGRES_REQUIRED") {
      return NextResponse.json(
        {
          error: "Vacancy listing requires Postgres. Set DATABASE_URL and apply migrations.",
          code: "JOBS_POSTGRES_REQUIRED",
        },
        { status: 503 },
      );
    }

    // Diagnostic log for production debugging (no secrets included).
    console.error("[/api/jobs] unexpected failure", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : undefined,
      categoryParam,
      cursor,
      limitParam,
    });

    return NextResponse.json(
      {
        error: "Unable to fetch jobs right now.",
        hint: "Ensure DATABASE_URL is set and migrations are applied (see docs/MVP_JOBS_SLICE_V1.md).",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const key = getClientKey(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"), "/api/jobs#create");
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

  const authResult = await requireTalentBridgeSession(request);
  if (authResult.ok === false) return authResult.response;
  const roleCheck = requireRole(authResult.user, "recruiter");
  if (roleCheck.ok === false) return roleCheck.response;

  const body = await request.json();
  const payload = body as Partial<{
    jobTitle: string;
    jobType: string;
    companyName: string;
    location: string;
    salary: string;
    description: string;
    requirements: string;
    categorySlug: string;
  }>;

  if (
    !payload.jobTitle?.trim() ||
    !payload.companyName?.trim() ||
    !payload.location?.trim() ||
    !payload.salary?.trim() ||
    !payload.description?.trim() ||
    !payload.requirements?.trim()
  ) {
    return NextResponse.json({ error: "Incomplete vacancy payload." }, { status: 400 });
  }

  const jobTypeParse = parseJobTypeRequired(payload.jobType);
  if (jobTypeParse.ok === false) {
    return NextResponse.json({ error: jobTypeParse.message }, { status: 400 });
  }

  const catParse = extractCategorySlugForCreate(payload as Partial<Record<string, unknown>>);
  if (!catParse.ok) {
    return NextResponse.json({ error: "categorySlug must be a string when provided." }, { status: 400 });
  }
  if (catParse.slug && !isMvpTalentCategorySlug(catParse.slug)) {
    return NextResponse.json({ error: "Unknown category slug." }, { status: 400 });
  }

  let vacancy;
  try {
    vacancy = await insertVacancyForOwner({
      ownerUserId: authResult.user.userId,
      companyName: payload.companyName.trim(),
      jobTitle: payload.jobTitle.trim(),
      jobType: jobTypeParse.value,
      location: payload.location.trim(),
      salary: payload.salary.trim(),
      description: payload.description.trim(),
      requirements: payload.requirements.trim(),
      categorySlug: catParse.slug,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CATEGORY_SLUG") {
      return NextResponse.json(
        { error: "Category is not provisioned yet. Apply migration 0002_categories.sql." },
        { status: 400 },
      );
    }
    throw error;
  }

  return NextResponse.json(
    { job: vacancy },
    {
      headers: {
        "X-RateLimit-Remaining": String(rate.remaining),
        "X-RateLimit-Backend": rate.backend,
      },
    },
  );
}
