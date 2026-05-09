import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../../../src/server/auth/firebaseAdmin";
import { hasPostgresConfigured } from "../../../../src/server/db/postgres";
import { enforceJobsApiRateLimit } from "../../../../src/server/distributedRateLimit";
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

  const authResult = await verifyFirebaseIdToken(request.headers.get("authorization"));
  if (authResult.ok === false) {
    if (authResult.reason === "ADMIN_UNAVAILABLE") {
      return NextResponse.json({ code: "FIREBASE_ADMIN_UNAVAILABLE" }, { status: 503 });
    }
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = (await request.json()) as Partial<{
    jobTitle: string;
    companyName: string;
    location: string;
    salary: string;
    description: string;
    requirements: string;
    status: "open" | "closed";
  }>;

  const result = await updateVacancyForOwner(id, authResult.uid, body);
  if (!result.ok) {
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
