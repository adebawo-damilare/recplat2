import type { CandidateProfile } from "./domainTypes";
import { refreshTalentBridgeSession } from "./authBrowser";

export async function fetchAllCandidatesPublic(): Promise<CandidateProfile[]> {
  try {
    const res = await fetch("/api/candidates", { credentials: "same-origin", cache: "no-store" });
    const raw = (await res.json().catch(() => ({}))) as { candidates?: CandidateProfile[] };
    if (res.ok && raw.candidates) return raw.candidates;
  } catch (e) {
    console.warn("[candidatesApi] list failed", e);
  }
  return [];
}

export async function fetchMyCandidateProfile(): Promise<CandidateProfile | null> {
  await refreshTalentBridgeSession();
  try {
    const res = await fetch("/api/candidates/me", { credentials: "same-origin", cache: "no-store" });
    const raw = (await res.json().catch(() => ({}))) as { profile?: CandidateProfile };
    if (res.ok && raw.profile) return raw.profile;
  } catch (e) {
    console.warn("[candidatesApi] me GET failed", e);
  }
  return null;
}

export async function saveMyCandidateProfile(
  patch: Partial<
    Pick<
      CandidateProfile,
      "fullName" | "email" | "headline" | "summary" | "skills" | "experience" | "portfolioUrl" | "portfolioContent"
    >
  >,
): Promise<CandidateProfile | null> {
  await refreshTalentBridgeSession();
  try {
    const res = await fetch("/api/candidates/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(patch),
    });
    const raw = (await res.json().catch(() => ({}))) as { profile?: CandidateProfile };
    if (res.ok && raw.profile) return raw.profile;
  } catch (e) {
    console.warn("[candidatesApi] me PATCH failed", e);
  }
  return null;
}

export async function seedSampleCandidatesViaApi(): Promise<{ created: number; skipped: number } | null> {
  await refreshTalentBridgeSession();
  try {
    const res = await fetch("/api/candidates/seed-samples", {
      method: "POST",
      credentials: "same-origin",
    });
    const raw = (await res.json().catch(() => ({}))) as { created?: number; skipped?: number };
    if (res.ok && typeof raw.created === "number" && typeof raw.skipped === "number") {
      return { created: raw.created, skipped: raw.skipped };
    }
  } catch (e) {
    console.warn("[candidatesApi] seed failed", e);
  }
  return null;
}
