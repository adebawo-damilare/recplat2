import { NextRequest, NextResponse } from "next/server";

import { requireTalentBridgeSession } from "../../../../src/server/auth/requireSession";
import { hasPostgresConfigured } from "../../../../src/server/db/postgres";
import { enforceJobsApiRateLimit } from "../../../../src/server/distributedRateLimit";
import { markAllNotificationsRead } from "../../../../src/server/notifications/postgresNotifications";
import { getClientKey } from "../../../../src/server/rateLimit";

export async function POST(request: NextRequest) {
  const key = getClientKey(
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    "/api/notifications/read-all",
  );
  const rate = await enforceJobsApiRateLimit(key);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  if (!hasPostgresConfigured()) {
    return NextResponse.json({ code: "POSTGRES_UNAVAILABLE" }, { status: 503 });
  }

  const auth = await requireTalentBridgeSession(request);
  if (auth.ok === false) return auth.response;

  await markAllNotificationsRead(auth.user.userId);
  return NextResponse.json({ ok: true });
}
