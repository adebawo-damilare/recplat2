export const TALENTBRIDGE_SESSION_COOKIE = "talentbridge_session";

/** When set to "1", omit Secure on session cookies (local HTTP / CI `next start` over http://127.0.0.1). Never set in production HTTPS. */
function sessionCookieSecureFlag(): boolean {
  if (process.env.TALENTBRIDGE_SESSION_ALLOW_HTTP === "1") return false;
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

export function parseCookie(header: string | null, name: string): string | undefined {
  if (!header?.trim()) return undefined;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return undefined;
}

/** Set-Cookie for HttpOnly JWT session */
export function buildSessionSetCookie(token: string, maxAgeSeconds: number): string {
  const secure = sessionCookieSecureFlag();
  const parts = [
    `${TALENTBRIDGE_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    `Max-Age=${maxAgeSeconds}`,
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

/** Clear cookie */
export function buildSessionClearCookie(): string {
  const secure = sessionCookieSecureFlag();
  const parts = [`${TALENTBRIDGE_SESSION_COOKIE}=`, "Path=/", "HttpOnly", "Max-Age=0", "SameSite=Lax"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}
