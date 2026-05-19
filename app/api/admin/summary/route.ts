import { NextRequest, NextResponse } from "next/server";

import { requireTalentBridgeSession } from "../../../../src/server/auth/requireSession";
import { requirePlatformAdmin } from "../../../../src/server/auth/requirePlatformAdmin";
import { hasPostgresConfigured } from "../../../../src/server/db/postgres";
import { getPlatformSummary } from "../../../../src/server/admin/postgresAdmin";

export async function GET(request: NextRequest) {
  if (!hasPostgresConfigured()) {
    return NextResponse.json({ code: "POSTGRES_UNAVAILABLE" }, { status: 503 });
  }

  const authResult = await requireTalentBridgeSession(request);
  if (authResult.ok === false) return authResult.response;
  const adminCheck = requirePlatformAdmin(authResult.user);
  if (adminCheck.ok === false) return adminCheck.response;

  const summary = await getPlatformSummary();
  return NextResponse.json({ summary });
}
