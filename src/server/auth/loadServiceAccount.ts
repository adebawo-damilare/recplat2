import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

/**
 * Credential for Firebase Admin: inline JSON (Vercel-friendly) or JSON file on disk.
 * Precedence: FIREBASE_SERVICE_ACCOUNT_JSON → FIREBASE_SERVICE_ACCOUNT_PATH → GOOGLE_APPLICATION_CREDENTIALS
 */
export function loadFirebaseServiceAccount(): Record<string, unknown> | null {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

  const pathCandidates = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim(),
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim(),
  ].filter(Boolean) as string[];

  if (inline) {
    try {
      const parsed = JSON.parse(inline) as Record<string, unknown>;
      if (parsed && typeof parsed === "object" && "private_key" in parsed) {
        return parsed;
      }
    } catch {
      // Often a path was mistakenly set in FIREBASE_SERVICE_ACCOUNT_JSON — try as file.
      pathCandidates.unshift(inline);
    }
  }

  const cwd = process.cwd();

  for (const p of pathCandidates) {
    const abs = isAbsolute(p) ? p : resolve(cwd, p);
    try {
      if (!existsSync(abs)) continue;
      const raw = readFileSync(abs, "utf8");
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      continue;
    }
  }

  return null;
}

export function isFirebaseServiceAccountConfigured() {
  const o = loadFirebaseServiceAccount();
  return o != null && typeof o === "object" && "private_key" in o;
}
