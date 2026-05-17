import { NextRequest, NextResponse } from "next/server";

import { requireTalentBridgeSession } from "../../../../../src/server/auth/requireSession";
import { requireRole } from "../../../../../src/server/auth/requireRole";
import { hasPostgresConfigured } from "../../../../../src/server/db/postgres";
import { enforceJobsApiRateLimit } from "../../../../../src/server/distributedRateLimit";
import { submitScreeningInvitation } from "../../../../../src/server/screenings";
import { getClientKey } from "../../../../../src/server/rateLimit";
import { recordAiAudit } from "../../../../../src/server/ai/audit";

type RouteParams = Promise<{ id: string }>;

export async function POST(request: NextRequest, context: { params: RouteParams }) {
  try {
    const { id } = await context.params;
    const key = getClientKey(
      request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      `/api/screenings/${id}/submit`,
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
    const roleCheck = requireRole(authResult.user, "candidate");
    if (roleCheck.ok === false) return roleCheck.response;

    const body = await request.json();
    const rawAnswers = Array.isArray(body.answers) ? body.answers : [];
    const answers = rawAnswers
      .filter((a): a is { questionId: string; answerText: string } => {
        return (
          a &&
          typeof a === "object" &&
          typeof (a as { questionId?: unknown }).questionId === "string" &&
          typeof (a as { answerText?: unknown }).answerText === "string"
        );
      })
      .map((a) => ({ questionId: a.questionId, answerText: a.answerText }));

    const result = await submitScreeningInvitation(id.trim(), authResult.user.userId, answers);
    if (result.ok === false) {
      if (result.reason === "NOT_FOUND") {
        return NextResponse.json({ error: "Screening not found." }, { status: 404 });
      }
      if (result.reason === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
      if (result.reason === "ALREADY_SUBMITTED") {
        return NextResponse.json({ error: "Screening already submitted." }, { status: 400 });
      }
      if (result.reason === "MISSING_ANSWERS" || result.reason === "INVALID_ANSWERS") {
        return NextResponse.json(
          { error: "Please answer every screening question.", code: result.reason },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: "Unable to submit screening." }, { status: 500 });
    }

    await recordAiAudit({
      actorUserId: authResult.user.userId,
      eventType: "screening.submitted",
      provider: "system",
      model: null,
      payload: { invitationId: id, applicationId: result.invitation.applicationId },
    });

    return NextResponse.json({ ok: true, invitation: result.invitation });
  } catch (err) {
    console.error("[POST /api/screenings/[id]/submit]", err);
    return NextResponse.json({ error: "Could not submit screening." }, { status: 500 });
  }
}
