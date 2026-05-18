import { NextRequest, NextResponse } from "next/server";

import { requireTalentBridgeSession } from "../../../../../src/server/auth/requireSession";
import { hasPostgresConfigured } from "../../../../../src/server/db/postgres";
import { enforceJobsApiRateLimit } from "../../../../../src/server/distributedRateLimit";
import { markNotificationRead } from "../../../../../src/server/notifications/postgresNotifications";
import { getClientKey } from "../../../../../src/server/rateLimit";

type RouteParams = Promise<{ id: string }>;

export async function POST(_request: NextRequest, context: { params: RouteParams }) {
  const auth = await requireTalentBridgeSession(_request);
  if (auth.ok === false) return auth.response;

  if (!hasPostgresConfigured()) {
    return NextResponse.json({ code: "POSTGRES_UNAVAILABLE" }, { status: 503 });
  }

  const { id } = await context.params;
  const ok = await markNotificationRead(id.trim(), auth.user.userId);
  if (!ok) {
    return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
