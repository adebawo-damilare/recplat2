import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let app: App | null | undefined;

function initAdminApp(): App | null {
  if (app !== undefined) return app;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!json) {
    app = null;
    return app;
  }

  if (getApps().length > 0) {
    app = getApps()[0]!;
    return app;
  }

  const serviceAccount = JSON.parse(json);
  app = initializeApp({
    credential: cert(serviceAccount),
  });
  return app;
}

export function isFirebaseAdminConfigured() {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim());
}

export async function verifyFirebaseIdToken(authHeader: string | null): Promise<
  | { ok: true; uid: string; email?: string }
  | { ok: false; reason: "NO_BEARER" | "INVALID" | "ADMIN_UNAVAILABLE" }
> {
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, reason: "NO_BEARER" };
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return { ok: false, reason: "NO_BEARER" };
  }

  const adminApp = initAdminApp();
  if (!adminApp) {
    return { ok: false, reason: "ADMIN_UNAVAILABLE" };
  }

  try {
    const decoded = await getAuth(adminApp).verifyIdToken(token);
    return { ok: true, uid: decoded.uid, email: decoded.email ?? undefined };
  } catch {
    return { ok: false, reason: "INVALID" };
  }
}
