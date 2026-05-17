import { NextRequest, NextResponse } from "next/server";

import { requireTalentBridgeSession } from "../../../../src/server/auth/requireSession";
import { requireRole } from "../../../../src/server/auth/requireRole";
import { hasPostgresConfigured } from "../../../../src/server/db/postgres";
import { enforceJobsApiRateLimit } from "../../../../src/server/distributedRateLimit";
import { createScreeningInvitation } from "../../../../src/server/screenings";
import { getClientKey } from "../../../../src/server/rateLimit";
import { recordAiAudit } from "../../../../src/server/ai/audit";

export async function POST(request: NextRequest) {
  try {
    const key = getClientKey(
      request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      "/api/screenings/invite",
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

    const body = await request.json();
    const applicationId = typeof body.applicationId === "string" ? body.applicationId.trim() : "";
    if (!applicationId) {
      return NextResponse.json({ error: "applicationId is required." }, { status: 400 });
    }

    const result = await createScreeningInvitation(applicationId, authResult.user.userId);
    if (result.ok === false) {
      if (result.reason === "NOT_FOUND") {
        return NextResponse.json({ error: "Application not found." }, { status: 404 });
      }
      if (result.reason === "FORBIDDEN") {
        return NextResponse.json({ error: "You cannot invite for this application." }, { status: 403 });
      }
      if (result.reason === "NOT_PILOT_LANE") {
        return NextResponse.json(
          {
            error: "Screening invitations are only available for Marketers roles in this pilot.",
            code: "NOT_PILOT_LANE",
          },
          { status: 400 },
        );
      }
      if (result.reason === "NO_QUESTIONS") {
        return NextResponse.json(
          { error: "Screening questions are not configured for this lane." },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: "Unable to create invitation." }, { status: 500 });
    }

    if (result.created) {
      await recordAiAudit({
        actorUserId: authResult.user.userId,
        eventType: "screening.invited",
        provider: "system",
        model: null,
        payload: { applicationId, invitationId: result.invitation.id },
      });
    }

    return NextResponse.json({
      ok: true,
      created: result.created,
      invitation: result.invitation,
    });
  } catch (err) {
    console.error("[POST /api/screenings/invite]", err);
    return NextResponse.json({ error: "Could not create screening invitation." }, { status: 500 });
  }
}
