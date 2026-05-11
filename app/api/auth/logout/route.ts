import { NextResponse } from "next/server";

import { buildSessionClearCookie } from "../../../../src/server/auth/authCookie";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", buildSessionClearCookie());
  return res;
}
