import { NextRequest, NextResponse } from "next/server";

import { requireTalentBridgeSession } from "../../../src/server/auth/requireSession";
import { requireRole } from "../../../src/server/auth/requireRole";
import { hasPostgresConfigured } from "../../../src/server/db/postgres";
import { listAllCandidateProfiles } from "../../../src/server/candidates/postgresCandidates";

export async function GET(request: NextRequest) {
  if (!hasPostgresConfigured()) {
    return NextResponse.json({ code: "POSTGRES_UNAVAILABLE" }, { status: 503 });
  }

  const authResult = await requireTalentBridgeSession(request);
  if (authResult.ok === false) return authResult.response;
  const roleCheck = requireRole(authResult.user, "recruiter");
  if (roleCheck.ok === false) return roleCheck.response;

  try {
    const candidates = await listAllCandidateProfiles();
    return NextResponse.json({ candidates, count: candidates.length });
  } catch {
    return NextResponse.json({ error: "Unable to load candidates." }, { status: 500 });
  }
}
