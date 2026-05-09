import { NextRequest, NextResponse } from "next/server";
import { fetchOpenVacanciesPage } from "../../../src/server/jobs";
import { enforceJobsApiRateLimit } from "../../../src/server/distributedRateLimit";
import { getClientKey } from "../../../src/server/rateLimit";

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