import { NextResponse } from "next/server";

import { requireTalentBridgeSession } from "../../../../src/server/auth/requireSession";

/** Returns the current session user when the JWT cookie/header is valid; otherwise `{ user: null }`. */
export async function GET(request: Request) {
  const r = await requireTalentBridgeSession(request);
  if (r.ok) {
    return NextResponse.json({ user: { id: r.user.userId, email: r.user.email, role: r.user.role } });
  }
  return NextResponse.json({ user: null });
}
