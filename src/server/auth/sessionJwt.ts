import { SignJWT, jwtVerify } from "jose";
export const SESSION_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;

function secretKey(): Uint8Array | null {
  const s = process.env.TALENTBRIDGE_AUTH_SECRET?.trim();
  if (!s || s.length < 32) return null;
  return new TextEncoder().encode(s);
}

export type SessionJwtPayload = {
  sub: string;
  email?: string;
};

export async function signTalentBridgeSessionToken(userId: string, email: string): Promise<string | null> {
  const secret = secretKey();
  if (!secret) return null;

  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secret);
}

export async function verifyTalentBridgeSessionToken(token: string): Promise<SessionJwtPayload | null> {
  const secret = secretKey();
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    if (!sub) return null;
    const email = typeof payload.email === "string" ? payload.email : undefined;
    return { sub, email };
  } catch {
    return null;
  }
}

export function isAuthSecretConfigured(): boolean {
  return Boolean(secretKey());
}
