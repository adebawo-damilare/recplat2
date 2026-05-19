import { NextRequest, NextResponse } from "next/server";

import { requireTalentBridgeSession } from "../../../../src/server/auth/requireSession";
import { hasPostgresConfigured } from "../../../../src/server/db/postgres";
import { enforceJobsApiRateLimit } from "../../../../src/server/distributedRateLimit";
import {
  countUnreadNotifications,
  listNotificationsForUser,
} from "../../../../src/server/notifications/postgresNotifications";
import { getClientKey } from "../../../../src/server/rateLimit";

export async function GET(request: NextRequest) {
  const key = getClientKey(
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    "/api/notifications/mine",
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

  const limitRaw = request.nextUrl.searchParams.get("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 30;
  const includeDelivery = request.nextUrl.searchParams.get("includeDelivery") === "1";
  const [notifications, unreadCount] = await Promise.all([
    listNotificationsForUser(auth.user.userId, Number.isFinite(limit) ? limit : 30, {
      includeDelivery,
    }),
    countUnreadNotifications(auth.user.userId),
  ]);

  return NextResponse.json(
    { notifications, unreadCount },
    { headers: { "X-RateLimit-Remaining": String(rate.remaining) } },
  );
}
