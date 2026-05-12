import type { CandidateProfile } from "./domainTypes";
import { refreshTalentBridgeSession } from "./authBrowser";

export type CandidatesPageResult = {
  candidates: CandidateProfile[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

export async function fetchCandidatesPage(opts: {
  limit?: number;
  offset?: number;
  q?: string;
} = {}): Promise<CandidatesPageResult> {
  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;
  const qs = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (opts.q?.trim()) qs.set("q", opts.q.trim());
  try {
    const res = await fetch(`/api/candidates?${qs}`, { credentials: "same-origin", cache: "no-store" });
    const raw = (await res.json().catch(() => ({}))) as {
      candidates?: CandidateProfile[];
      pagination?: { total?: number; limit?: number; offset?: number; hasMore?: boolean };
    };
    if (res.ok && raw.candidates) {
      const p = raw.pagination;
      const total = typeof p?.total === "number" ? p.total : raw.candidates.length;
      return {
        candidates: raw.candidates,
        total,
        limit: typeof p?.limit === "number" ? p.limit : limit,
        offset: typeof p?.offset === "number" ? p.offset : offset,
        hasMore: Boolean(p?.hasMore),
      };
    }
  } catch (e) {
    console.warn("[candidatesApi] page failed", e);
  }
  return { candidates: [], total: 0, limit, offset, hasMore: false };
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
      "firstName" | "lastName" | "email" | "headline" | "summary" | "skills" | "experience" | "portfolioUrl" | "portfolioContent"
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

