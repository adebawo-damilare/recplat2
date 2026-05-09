import { NextRequest, NextResponse } from "next/server";
import { fetchOpenVacanciesPage, insertVacancyForOwner } from "../../../src/server/jobs";
import { enforceJobsApiRateLimit } from "../../../src/server/distributedRateLimit";
import { getClientKey } from "../../../src/server/rateLimit";
import { verifyFirebaseIdToken } from "../../../src/server/auth/firebaseAdmin";
import { hasPostgresConfigured } from "../../../src/server/db/postgres";

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

  try {
    const { jobs, nextCursor } = await fetchOpenVacanciesPage(limitParam, cursor);

    return NextResponse.json(
      {
        jobs,
        count: jobs.length,
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

    return NextResponse.json(
      {
        error: "Unable to fetch jobs right now.",
        hint: "If this is Firestore, ensure composite index on (status asc, createdAt desc).",
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

  const authResult = await verifyFirebaseIdToken(request.headers.get("authorization"));
  if (authResult.ok === false) {
    if (authResult.reason === "ADMIN_UNAVAILABLE") {
      return NextResponse.json({ code: "FIREBASE_ADMIN_UNAVAILABLE" }, { status: 503 });
    }
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = await request.json();
  const payload = body as Partial<{
    jobTitle: string;
    companyName: string;
    location: string;
    salary: string;
    description: string;
    requirements: string;
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

  const vacancy = await insertVacancyForOwner({
    ownerUid: authResult.uid,
    companyName: payload.companyName.trim(),
    jobTitle: payload.jobTitle.trim(),
    location: payload.location.trim(),
    salary: payload.salary.trim(),
    description: payload.description.trim(),
    requirements: payload.requirements.trim(),
  });

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
