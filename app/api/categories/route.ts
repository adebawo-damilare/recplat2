import { NextResponse } from "next/server";

import { enforceJobsApiRateLimit } from "../../../src/server/distributedRateLimit";
import { getClientKey } from "../../../src/server/rateLimit";
import { listPublicCategories } from "../../../src/server/categories/publicCatalog";

export const revalidate = 60;

export async function GET(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
  const key = getClientKey(forwarded, "/api/categories");
  const rate = await enforceJobsApiRateLimit(key);

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please retry shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  const categories = await listPublicCategories();

  return NextResponse.json(
    { categories },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        "X-RateLimit-Remaining": String(rate.remaining),
      },
    },
  );
}
