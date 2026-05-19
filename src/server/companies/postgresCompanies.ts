import { and, desc, eq, sql } from "drizzle-orm";

import { getDrizzleDb } from "../db/postgres";
import { applications, companies, companyMembers, users, vacancies } from "../schema";
import type { CompanyMemberRole } from "../schema/companyMembers";

export type CompanySummary = {
  id: string;
  name: string;
  memberRole: CompanyMemberRole;
  createdAt: string;
};

export type CompanyMemberDto = {
  id: string;
  userId: string;
  email: string;
  memberRole: CompanyMemberRole;
  createdAt: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuidString(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export async function listCompanyIdsForUser(userId: string): Promise<string[]> {
  if (!isUuidString(userId)) return [];
  const db = getDrizzleDb();
  const rows = await db
    .select({ companyId: companyMembers.companyId })
    .from(companyMembers)
    .where(eq(companyMembers.userId, userId));
  return rows.map((r) => r.companyId);
}

export async function userHasCompanyAccess(
  userId: string,
  companyId: string,
): Promise<boolean> {
  if (!isUuidString(userId)) return false;
  const db = getDrizzleDb();
  const rows = await db
    .select({ id: companyMembers.id })
    .from(companyMembers)
    .where(and(eq(companyMembers.userId, userId), eq(companyMembers.companyId, companyId)))
    .limit(1);
  return Boolean(rows[0]?.id);
}

export async function userCanManageCompanyMembers(
  userId: string,
  companyId: string,
): Promise<boolean> {
  if (!isUuidString(userId)) return false;
  const db = getDrizzleDb();
  const rows = await db
    .select({ memberRole: companyMembers.memberRole })
    .from(companyMembers)
    .where(and(eq(companyMembers.userId, userId), eq(companyMembers.companyId, companyId)))
    .limit(1);
  const role = rows[0]?.memberRole;
  return role === "owner" || role === "manager" || role === "admin";
}

function normalizeMemberRole(raw: string): CompanyMemberRole {
  if (raw === "owner") return "owner";
  if (raw === "manager" || raw === "admin") return "manager";
  return "recruiter";
}

export async function getCompanyForMember(
  userId: string,
  companyId: string,
): Promise<{ id: string; name: string } | null> {
  if (!isUuidString(userId) || !isUuidString(companyId)) return null;
  if (!(await userHasCompanyAccess(userId, companyId))) return null;
  const db = getDrizzleDb();
  const rows = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  return rows[0] ?? null;
}

export async function userCanAccessApplication(
  userId: string,
  applicationId: string,
): Promise<boolean> {
  const db = getDrizzleDb();
  const rows = await db
    .select({ vacancyId: applications.vacancyId })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  const vacancyId = rows[0]?.vacancyId;
  if (!vacancyId) return false;
  return userCanAccessVacancy(userId, vacancyId);
}

export async function userCanAccessVacancy(
  userId: string,
  vacancyId: string,
): Promise<boolean> {
  const db = getDrizzleDb();
  const rows = await db
    .select({ companyId: vacancies.companyId, postedByUserId: vacancies.postedByUserId })
    .from(vacancies)
    .where(eq(vacancies.id, vacancyId))
    .limit(1);
  const row = rows[0];
  if (!row) return false;
  if (row.postedByUserId === userId) return true;
  return userHasCompanyAccess(userId, row.companyId);
}

async function ensureMembership(
  companyId: string,
  userId: string,
  memberRole: CompanyMemberRole,
): Promise<void> {
  if (!isUuidString(userId)) return;
  const db = getDrizzleDb();
  await db
    .insert(companyMembers)
    .values({ companyId, userId, memberRole })
    .onConflictDoUpdate({
      target: [companyMembers.companyId, companyMembers.userId],
      set: { memberRole },
    });
}

export async function listCompaniesForUser(userId: string): Promise<CompanySummary[]> {
  if (!isUuidString(userId)) return [];
  const db = getDrizzleDb();
  const rows = await db
    .select({
      id: companies.id,
      name: companies.name,
      memberRole: companyMembers.memberRole,
      createdAt: companies.createdAt,
    })
    .from(companyMembers)
    .innerJoin(companies, eq(companyMembers.companyId, companies.id))
    .where(eq(companyMembers.userId, userId))
    .orderBy(desc(companies.createdAt));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    memberRole: normalizeMemberRole(r.memberRole),
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function listMembersForCompany(companyId: string): Promise<CompanyMemberDto[]> {
  const db = getDrizzleDb();
  const rows = await db
    .select({
      id: companyMembers.id,
      userId: companyMembers.userId,
      email: users.email,
      memberRole: companyMembers.memberRole,
      createdAt: companyMembers.createdAt,
    })
    .from(companyMembers)
    .innerJoin(users, eq(companyMembers.userId, users.id))
    .where(eq(companyMembers.companyId, companyId))
    .orderBy(desc(companyMembers.createdAt));

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    email: r.email,
    memberRole: normalizeMemberRole(r.memberRole),
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function findCompanyByOwnerAndName(ownerUserId: string, name: string) {
  const db = getDrizzleDb();
  const rows = await db
    .select()
    .from(companies)
    .where(
      and(
        eq(companies.ownerUserId, ownerUserId),
        sql`lower(${companies.name}) = lower(${name})`,
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function ensureCompanyForRecruiter(
  recruiterUserId: string,
  name: string,
): Promise<{ id: string; name: string }> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("COMPANY_NAME_REQUIRED");

  const existing = await findCompanyByOwnerAndName(recruiterUserId, trimmed);
  if (existing) {
    await ensureMembership(existing.id, recruiterUserId, "owner");
    return { id: existing.id, name: existing.name };
  }

  const db = getDrizzleDb();
  const [row] = await db
    .insert(companies)
    .values({ ownerUserId: recruiterUserId, name: trimmed })
    .returning({ id: companies.id, name: companies.name });

  if (!row?.id) throw new Error("COMPANY_CREATE_FAILED");
  await ensureMembership(row.id, recruiterUserId, "owner");
  return row;
}

export async function createCompanyForRecruiter(
  recruiterUserId: string,
  name: string,
): Promise<CompanySummary | null> {
  const company = await ensureCompanyForRecruiter(recruiterUserId, name);
  return {
    id: company.id,
    name: company.name,
    memberRole: "owner",
    createdAt: new Date().toISOString(),
  };
}

export async function addCompanyMemberByEmail(input: {
  companyId: string;
  inviterUserId: string;
  email: string;
  memberRole?: CompanyMemberRole;
}): Promise<
  | { ok: true; member: CompanyMemberDto }
  | {
      ok: false;
      reason: "FORBIDDEN" | "USER_NOT_FOUND" | "NOT_RECRUITER" | "ALREADY_MEMBER" | "INVALID_ROLE";
    }
> {
  const canManage = await userCanManageCompanyMembers(input.inviterUserId, input.companyId);
  if (!canManage) return { ok: false, reason: "FORBIDDEN" };

  const email = input.email.trim().toLowerCase();
  if (!email) return { ok: false, reason: "USER_NOT_FOUND" };

  const db = getDrizzleDb();
  const userRows = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);
  const target = userRows[0];
  if (!target) return { ok: false, reason: "USER_NOT_FOUND" };
  if (target.role !== "recruiter") return { ok: false, reason: "NOT_RECRUITER" };

  const rawRole = input.memberRole as string | undefined;
  const requested = rawRole === "admin" ? "manager" : input.memberRole;
  const role: CompanyMemberRole =
    requested === "manager" ? "manager" : requested === "owner" ? "owner" : "recruiter";
  if (role === "owner") return { ok: false, reason: "INVALID_ROLE" };

  const existing = await db
    .select({ id: companyMembers.id })
    .from(companyMembers)
    .where(and(eq(companyMembers.companyId, input.companyId), eq(companyMembers.userId, target.id)))
    .limit(1);
  if (existing[0]?.id) return { ok: false, reason: "ALREADY_MEMBER" };

  const [inserted] = await db
    .insert(companyMembers)
    .values({
      companyId: input.companyId,
      userId: target.id,
      memberRole: role,
    })
    .returning({ id: companyMembers.id });

  if (!inserted?.id) return { ok: false, reason: "ALREADY_MEMBER" };

  return {
    ok: true,
    member: {
      id: inserted.id,
      userId: target.id,
      email: target.email,
      memberRole: role,
      createdAt: new Date().toISOString(),
    },
  };
}
