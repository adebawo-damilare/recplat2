import { NextRequest, NextResponse } from "next/server";

import { requireTalentBridgeSession } from "../../../src/server/auth/requireSession";
import { hasPostgresConfigured } from "../../../src/server/db/postgres";
import { listCandidateProfilesPaged } from "../../../src/server/candidates/postgresCandidates";

/** Any signed-in user (candidate or recruiter) may browse the talent directory. */
export async function GET(request: NextRequest) {
  if (!hasPostgresConfigured()) {
    return NextResponse.json({ code: "POSTGRES_UNAVAILABLE" }, { status: 503 });
  }

  const authResult = await requireTalentBridgeSession(request);
  if (authResult.ok === false) return authResult.response;

  const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? "10");
  const offsetRaw = Number(request.nextUrl.searchParams.get("offset") ?? "0");
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, Math.floor(limitRaw))) : 10;
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;
  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 200) || null;

  try {
    const { candidates, total } = await listCandidateProfilesPaged(limit, offset, q);
    return NextResponse.json({
      candidates,
      count: candidates.length,
      pagination: { limit, offset, total, hasMore: offset + candidates.length < total },
    });
  } catch {
    return NextResponse.json({ error: "Unable to load candidates." }, { status: 500 });
  }
}
