export const TALENTBRIDGE_SESSION_COOKIE = "talentbridge_session";

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
  const secure = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
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
  const secure = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  const parts = [`${TALENTBRIDGE_SESSION_COOKIE}=`, "Path=/", "HttpOnly", "Max-Age=0", "SameSite=Lax"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}
