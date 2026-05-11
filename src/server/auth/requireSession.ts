import { NextResponse } from "next/server";

import { verifyRequestSession } from "./verifySession";

export type SessionUser = { userId: string; email?: string };

export async function requireTalentBridgeSession(
  request: Request,
): Promise<{ ok: true; user: SessionUser } | { ok: false; response: NextResponse }> {
  const auth = await verifyRequestSession(request);
  if (auth.ok === false) {
    if (auth.reason === "AUTH_UNAVAILABLE") {
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: "Authentication is not configured on this server.", code: "AUTH_UNAVAILABLE" },
          { status: 503 },
        ),
      };
    }
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Authentication required.", code: "UNAUTHORIZED" }, { status: 401 }),
    };
  }
  return { ok: true as const, user: { userId: auth.userId, email: auth.email } };
}
