export type PlatformSummary = {
  users: number;
  recruiters: number;
  candidates: number;
  openVacancies: number;
  applications: number;
  notifications: number;
  screeningInvitations: number;
};

export type AdminCategory = {
  slug: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  openVacancyCount: number;
};

export async function fetchPlatformSummary(): Promise<PlatformSummary | null> {
  const res = await fetch("/api/admin/summary", { credentials: "same-origin", cache: "no-store" });
  const raw = (await res.json().catch(() => ({}))) as { summary?: PlatformSummary };
  if (!res.ok || !raw.summary) return null;
  return raw.summary;
}

export async function fetchAdminCategories(): Promise<AdminCategory[]> {
  const res = await fetch("/api/admin/categories", { credentials: "same-origin", cache: "no-store" });
  const raw = (await res.json().catch(() => ({}))) as { categories?: AdminCategory[] };
  if (!res.ok || !Array.isArray(raw.categories)) return [];
  return raw.categories;
}

export async function patchAdminCategory(
  slug: string,
  patch: { label?: string; isActive?: boolean; sortOrder?: number },
): Promise<{ ok: boolean; category?: AdminCategory; error?: string }> {
  const res = await fetch(`/api/admin/categories/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(patch),
  });
  const raw = (await res.json().catch(() => ({}))) as { category?: AdminCategory; error?: string };
  if (!res.ok) return { ok: false, error: raw.error || "Update failed." };
  return { ok: true, category: raw.category };
}
