import { NextRequest, NextResponse } from "next/server";

import { requireTalentBridgeSession } from "../../../../../src/server/auth/requireSession";
import { requirePlatformAdmin } from "../../../../../src/server/auth/requirePlatformAdmin";
import { hasPostgresConfigured } from "../../../../../src/server/db/postgres";
import { updateAdminCategory } from "../../../../../src/server/admin/postgresAdmin";
import { recordAiAudit } from "../../../../../src/server/ai/audit";

type RouteParams = Promise<{ slug: string }>;

export async function PATCH(request: NextRequest, context: { params: RouteParams }) {
  const { slug } = await context.params;

  if (!hasPostgresConfigured()) {
    return NextResponse.json({ code: "POSTGRES_UNAVAILABLE" }, { status: 503 });
  }

  const authResult = await requireTalentBridgeSession(request);
  if (authResult.ok === false) return authResult.response;
  const adminCheck = requirePlatformAdmin(authResult.user);
  if (adminCheck.ok === false) return adminCheck.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const b = body as { label?: unknown; isActive?: unknown; sortOrder?: unknown };
  const category = await updateAdminCategory(slug, {
    label: typeof b.label === "string" ? b.label : undefined,
    isActive: typeof b.isActive === "boolean" ? b.isActive : undefined,
    sortOrder: typeof b.sortOrder === "number" ? b.sortOrder : undefined,
  });

  if (!category) {
    return NextResponse.json({ error: "Category not found or no changes." }, { status: 404 });
  }

  await recordAiAudit({
    actorUserId: authResult.user.userId,
    eventType: "admin.category_updated",
    provider: "system",
    model: null,
    payload: { slug: category.slug, patch: b },
  });

  return NextResponse.json({ category });
}
