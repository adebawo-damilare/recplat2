export type CompanySummary = {
  id: string;
  name: string;
  memberRole: "owner" | "manager" | "recruiter";
  createdAt: string;
};

export type CompanyMember = {
  id: string;
  userId: string;
  email: string;
  memberRole: "owner" | "manager" | "recruiter";
  createdAt: string;
};

export async function fetchMyCompanies(): Promise<CompanySummary[]> {
  const res = await fetch("/api/companies/mine", { credentials: "same-origin", cache: "no-store" });
  const raw = (await res.json().catch(() => ({}))) as { companies?: CompanySummary[] };
  if (!res.ok || !Array.isArray(raw.companies)) return [];
  return raw.companies;
}

export async function createCompany(name: string): Promise<{
  ok: boolean;
  company?: CompanySummary;
  error?: string;
}> {
  const res = await fetch("/api/companies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ name }),
  });
  const raw = (await res.json().catch(() => ({}))) as { company?: CompanySummary; error?: string };
  if (!res.ok) return { ok: false, error: raw.error || "Could not create company." };
  return { ok: true, company: raw.company };
}

export async function fetchCompanyMembers(companyId: string): Promise<CompanyMember[]> {
  const res = await fetch(`/api/companies/${encodeURIComponent(companyId)}/members`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  const raw = (await res.json().catch(() => ({}))) as { members?: CompanyMember[] };
  if (!res.ok || !Array.isArray(raw.members)) return [];
  return raw.members;
}

export async function inviteCompanyMember(
  companyId: string,
  email: string,
  memberRole: "manager" | "recruiter" = "recruiter",
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/companies/${encodeURIComponent(companyId)}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ email, memberRole }),
  });
  const raw = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) return { ok: false, error: raw.error || "Could not add team member." };
  return { ok: true };
}
