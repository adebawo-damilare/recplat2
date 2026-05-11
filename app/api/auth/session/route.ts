import { NextResponse } from "next/server";

import { verifyRequestSession } from "../../../../src/server/auth/verifySession";

/** Returns the current session user when the JWT cookie/header is valid; otherwise `{ user: null }`. */
export async function GET(request: Request) {
  const r = await verifyRequestSession(request);
  if (r.ok) {
    return NextResponse.json({ user: { id: r.userId, email: r.email ?? "" } });
  }
  return NextResponse.json({ user: null });
}
