import { verifyTalentBridgeSessionToken, isAuthSecretConfigured } from "./sessionJwt";
import { parseCookie, TALENTBRIDGE_SESSION_COOKIE } from "./authCookie";

export type VerifySessionOk = { ok: true; userId: string; email?: string };

export type VerifySessionFail =
  | { ok: false; reason: "NO_CREDENTIALS" | "INVALID_TOKEN" | "AUTH_UNAVAILABLE" };

export async function verifyRequestSession(request: Request): Promise<VerifySessionOk | VerifySessionFail> {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    if (token) {
      const decoded = await verifyTalentBridgeSessionToken(token);
      if (decoded?.sub) {
        return { ok: true, userId: decoded.sub, email: decoded.email };
      }
      return { ok: false, reason: "INVALID_TOKEN" };
    }
  }

  const cookieTok = parseCookie(request.headers.get("cookie"), TALENTBRIDGE_SESSION_COOKIE);
  if (cookieTok) {
    const decoded = await verifyTalentBridgeSessionToken(cookieTok);
    if (decoded?.sub) {
      return { ok: true, userId: decoded.sub, email: decoded.email };
    }
    return { ok: false, reason: "INVALID_TOKEN" };
  }

  if (!isAuthSecretConfigured()) {
    return { ok: false, reason: "AUTH_UNAVAILABLE" };
  }

  return { ok: false, reason: "NO_CREDENTIALS" };
}
