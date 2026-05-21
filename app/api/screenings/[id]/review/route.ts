import { NextRequest, NextResponse } from "next/server";

import { requireTalentBridgeSession } from "../../../../../src/server/auth/requireSession";
import { requireRole } from "../../../../../src/server/auth/requireRole";
import { hasPostgresConfigured } from "../../../../../src/server/db/postgres";
import { enforceJobsApiRateLimit } from "../../../../../src/server/distributedRateLimit";
import { getClientKey } from "../../../../../src/server/rateLimit";
import { upsertScreeningReviewForInvitation } from "../../../../../src/server/screenings/postgresScreeningReviews";

type RouteParams = Promise<{ id: string }>;

export async function PATCH(request: NextRequest, context: { params: RouteParams }) {
  const { id: invitationId } = await context.params;
  const key = getClientKey(
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    `/api/screenings/${invitationId}/review`,
  );
  const rate = await enforceJobsApiRateLimit(key);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  if (!hasPostgresConfigured()) {
    return NextResponse.json({ code: "POSTGRES_UNAVAILABLE" }, { status: 503 });
  }

  const authResult = await requireTalentBridgeSession(request);
  if (authResult.ok === false) return authResult.response;
  const roleCheck = requireRole(authResult.user, "recruiter");
  if (roleCheck.ok === false) return roleCheck.response;

  const body = (await request.json().catch(() => ({}))) as {
    questionScores?: unknown;
    reviewerNote?: unknown;
  };

  const rawScores = body.questionScores;
  if (!Array.isArray(rawScores) || rawScores.length === 0) {
    return NextResponse.json({ error: "questionScores array is required." }, { status: 400 });
  }

  const questionScores = rawScores.map((item) => {
    const row = item as { questionId?: unknown; score?: unknown; note?: unknown };
    return {
      questionId: typeof row.questionId === "string" ? row.questionId : "",
      score: typeof row.score === "number" ? row.score : Number(row.score),
      note: typeof row.note === "string" ? row.note : row.note == null ? null : String(row.note),
    };
  });

  const reviewerNote =
    typeof body.reviewerNote === "string"
      ? body.reviewerNote
      : body.reviewerNote == null
        ? null
        : undefined;

  const result = await upsertScreeningReviewForInvitation(invitationId.trim(), authResult.user.userId, {
    questionScores,
    reviewerNote,
  });

  if (result.ok === false) {
    if (result.reason === "NOT_FOUND") {
      return NextResponse.json({ error: "Screening not found." }, { status: 404 });
    }
    if (result.reason === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    if (result.reason === "NOT_SUBMITTED") {
      return NextResponse.json({ error: "Screening must be submitted before scoring." }, { status: 400 });
    }
    if (result.reason === "INVALID_QUESTIONS") {
      return NextResponse.json({ error: "Scores must cover each submitted question exactly once." }, { status: 400 });
    }
    return NextResponse.json({ error: "Each score must be an integer from 1 to 5." }, { status: 400 });
  }

  return NextResponse.json({ review: result.review });
}
