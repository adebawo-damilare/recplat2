import { NextRequest, NextResponse } from "next/server";

import { hasPostgresConfigured } from "../../../../../src/server/db/postgres";
import { enforceJobsApiRateLimit } from "../../../../../src/server/distributedRateLimit";
import { listActiveFieldsForCategorySlug } from "../../../../../src/server/categoryFields/postgresCategoryFields";
import { getClientKey } from "../../../../../src/server/rateLimit";

type RouteParams = Promise<{ slug: string }>;

export async function GET(request: NextRequest, context: { params: RouteParams }) {
  const key = getClientKey(
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    "/api/categories/[slug]/profile-fields",
  );
  const rate = await enforceJobsApiRateLimit(key);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  if (!hasPostgresConfigured()) {
    return NextResponse.json({ code: "POSTGRES_UNAVAILABLE" }, { status: 503 });
  }

  const { slug } = await context.params;
  const fields = await listActiveFieldsForCategorySlug(slug);
  return NextResponse.json({ fields }, { headers: { "X-RateLimit-Remaining": String(rate.remaining) } });
}
