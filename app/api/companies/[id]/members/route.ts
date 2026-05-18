import { NextRequest, NextResponse } from "next/server";

import { requireTalentBridgeSession } from "../../../../../src/server/auth/requireSession";
import { requireRole } from "../../../../../src/server/auth/requireRole";
import { hasPostgresConfigured } from "../../../../../src/server/db/postgres";
import {
  addCompanyMemberByEmail,
  listMembersForCompany,
  userHasCompanyAccess,
} from "../../../../../src/server/companies";
import type { CompanyMemberRole } from "../../../../../src/server/schema/companyMembers";
import { getClientKey } from "../../../../../src/server/rateLimit";
import { enforceJobsApiRateLimit } from "../../../../../src/server/distributedRateLimit";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { id: companyId } = await context.params;
  const key = getClientKey(
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    "/api/companies/[id]/members",
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

  const allowed = await userHasCompanyAccess(authResult.user.userId, companyId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const members = await listMembersForCompany(companyId);
  return NextResponse.json({ members });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: companyId } = await context.params;
  const key = getClientKey(
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    "/api/companies/[id]/members",
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
    email?: string;
    memberRole?: CompanyMemberRole;
  };

  const result = await addCompanyMemberByEmail({
    companyId,
    inviterUserId: authResult.user.userId,
    email: String(body.email ?? ""),
    memberRole: body.memberRole,
  });

  if (result.ok === false) {
    const { reason } = result;
    const status =
      reason === "FORBIDDEN"
        ? 403
        : reason === "USER_NOT_FOUND" || reason === "NOT_RECRUITER"
          ? 400
          : reason === "ALREADY_MEMBER" || reason === "INVALID_ROLE"
            ? 409
            : 400;
    const message =
      reason === "USER_NOT_FOUND"
        ? "No user found with that email."
        : reason === "NOT_RECRUITER"
          ? "That user must have a recruiter account."
          : reason === "ALREADY_MEMBER"
            ? "User is already on this company team."
            : reason === "INVALID_ROLE"
              ? "Cannot assign owner via invite."
              : "Forbidden.";
    return NextResponse.json({ error: message, code: reason }, { status });
  }

  return NextResponse.json({ member: result.member }, { status: 201 });
}
