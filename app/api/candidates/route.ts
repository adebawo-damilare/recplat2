import { NextResponse } from "next/server";

import { hasPostgresConfigured } from "../../../src/server/db/postgres";
import { listAllCandidateProfiles } from "../../../src/server/candidates/postgresCandidates";

export async function GET() {
  if (!hasPostgresConfigured()) {
    return NextResponse.json({ code: "POSTGRES_UNAVAILABLE" }, { status: 503 });
  }

  try {
    const candidates = await listAllCandidateProfiles();
    return NextResponse.json({ candidates, count: candidates.length });
  } catch {
    return NextResponse.json({ error: "Unable to load candidates." }, { status: 500 });
  }
}
