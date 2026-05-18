import { asc, count, eq, ilike, or, sql } from "drizzle-orm";

import type { CandidateProfile } from "../../lib/domainTypes";
import {
  getCandidateFieldValuesForLane,
  saveCandidateFieldValues,
} from "../categoryFields/postgresCategoryFields";
import { getDrizzleDb } from "../db/postgres";
import { candidateProfiles, users } from "../schema";
import { hashPassword } from "../auth/password";
import { SAMPLE_CANDIDATE_SEEDS } from "./sampleCandidateSeeds";

async function mapCandidateRow(
  row: typeof candidateProfiles.$inferSelect,
  includeFields = false,
): Promise<CandidateProfile> {
  const primaryTalentLaneSlug = row.primaryTalentLaneSlug?.trim() || null;
  const categoryFieldValues =
    includeFields && primaryTalentLaneSlug
      ? await getCandidateFieldValuesForLane(row.userId, primaryTalentLaneSlug)
      : undefined;
  return {
    userId: row.userId,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.emailSnapshot,
    headline: row.headline,
    summary: row.summary,
    skills: row.skills,
    experience: row.experience,
    portfolioUrl: row.portfolioUrl,
    portfolioContent: row.portfolioContent,
    primaryTalentLaneSlug,
    categoryFieldValues,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listAllCandidateProfiles(): Promise<CandidateProfile[]> {
  const db = getDrizzleDb();
  const rows = await db
    .select()
    .from(candidateProfiles)
    .orderBy(asc(candidateProfiles.lastName), asc(candidateProfiles.firstName));
  const out: CandidateProfile[] = [];
  for (const row of rows) out.push(await mapCandidateRow(row));
  return out;
}

function escapeIlikeFragment(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function listCandidateProfilesPaged(
  rawLimit: number,
  rawOffset: number,
  searchText?: string | null,
): Promise<{ candidates: CandidateProfile[]; total: number }> {
  const limit = Math.max(1, Math.min(50, rawLimit));
  const offset = Math.max(0, rawOffset);
  const db = getDrizzleDb();
  const qRaw = searchText?.trim().slice(0, 200) ?? "";
  const pattern = qRaw.length > 0 ? `%${escapeIlikeFragment(qRaw)}%` : null;
  const searchCond = pattern
    ? or(
        ilike(candidateProfiles.firstName, pattern),
        ilike(candidateProfiles.lastName, pattern),
        ilike(candidateProfiles.headline, pattern),
        ilike(candidateProfiles.skills, pattern),
        ilike(candidateProfiles.summary, pattern),
      )!
    : undefined;

  const countBase = db.select({ value: count() }).from(candidateProfiles);
  const countRows = searchCond ? await countBase.where(searchCond) : await countBase;
  const total = Number(countRows[0]?.value ?? 0);

  const rows = searchCond
    ? await db
        .select()
        .from(candidateProfiles)
        .where(searchCond)
        .orderBy(asc(candidateProfiles.lastName), asc(candidateProfiles.firstName))
        .limit(limit)
        .offset(offset)
    : await db
        .select()
        .from(candidateProfiles)
        .orderBy(asc(candidateProfiles.lastName), asc(candidateProfiles.firstName))
        .limit(limit)
        .offset(offset);

  const candidates: CandidateProfile[] = [];
  for (const row of rows) candidates.push(await mapCandidateRow(row));
  return { candidates, total };
}

export async function getCandidateProfileByUserId(userId: string): Promise<CandidateProfile | null> {
  const db = getDrizzleDb();
  const rows = await db
    .select()
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, userId))
    .limit(1);
  const row = rows[0];
  return row ? await mapCandidateRow(row, true) : null;
}

export async function upsertCandidateProfileForUser(
  userId: string,
  patch: Partial<
    Pick<
      CandidateProfile,
      | "firstName"
      | "lastName"
      | "email"
      | "headline"
      | "summary"
      | "skills"
      | "experience"
      | "portfolioUrl"
      | "portfolioContent"
      | "primaryTalentLaneSlug"
    >
  > & { categoryFieldValues?: Record<string, string> },
): Promise<CandidateProfile> {
  const db = getDrizzleDb();
  const existing = await db
    .select()
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, userId))
    .limit(1);

  const now = new Date();
  if (!existing[0]) {
    const [row] = await db
      .insert(candidateProfiles)
      .values({
        userId,
        firstName: patch.firstName ?? "",
        lastName: patch.lastName ?? "",
        emailSnapshot: patch.email ?? "",
        headline: patch.headline ?? "",
        summary: patch.summary ?? "",
        skills: patch.skills ?? "",
        experience: patch.experience ?? "",
        portfolioUrl: patch.portfolioUrl ?? null,
        portfolioContent: patch.portfolioContent ?? null,
        primaryTalentLaneSlug: patch.primaryTalentLaneSlug ?? null,
        updatedAt: now,
      })
      .returning();
    if (patch.primaryTalentLaneSlug && patch.categoryFieldValues) {
      await saveCandidateFieldValues(userId, patch.primaryTalentLaneSlug, patch.categoryFieldValues);
    }
    return await mapCandidateRow(row, true);
  }

  const cur = existing[0];
  const [row] = await db
    .update(candidateProfiles)
    .set({
      firstName: patch.firstName !== undefined ? patch.firstName : cur.firstName,
      lastName: patch.lastName !== undefined ? patch.lastName : cur.lastName,
      emailSnapshot: patch.email !== undefined ? patch.email : cur.emailSnapshot,
      headline: patch.headline !== undefined ? patch.headline : cur.headline,
      summary: patch.summary !== undefined ? patch.summary : cur.summary,
      skills: patch.skills !== undefined ? patch.skills : cur.skills,
      experience: patch.experience !== undefined ? patch.experience : cur.experience,
      portfolioUrl: patch.portfolioUrl !== undefined ? patch.portfolioUrl : cur.portfolioUrl,
      portfolioContent:
        patch.portfolioContent !== undefined ? patch.portfolioContent : cur.portfolioContent,
      primaryTalentLaneSlug:
        patch.primaryTalentLaneSlug !== undefined
          ? patch.primaryTalentLaneSlug
          : cur.primaryTalentLaneSlug,
      updatedAt: now,
    })
    .where(eq(candidateProfiles.userId, userId))
    .returning();

  const lane =
    patch.primaryTalentLaneSlug !== undefined
      ? patch.primaryTalentLaneSlug
      : cur.primaryTalentLaneSlug;
  if (lane && patch.categoryFieldValues) {
    await saveCandidateFieldValues(userId, lane, patch.categoryFieldValues);
  }

  return await mapCandidateRow(row, true);
}

export async function getCandidateCategoryFieldsForRecruiterView(
  candidateUserId: string,
): Promise<CandidateProfile["categoryFieldValues"]> {
  const db = getDrizzleDb();
  const rows = await db
    .select({ slug: candidateProfiles.primaryTalentLaneSlug })
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, candidateUserId))
    .limit(1);
  const slug = rows[0]?.slug?.trim() || null;
  if (!slug) return [];
  return getCandidateFieldValuesForLane(candidateUserId, slug);
}

/** Inserts demo users + profiles for emails in SAMPLE_CANDIDATE_SEEDS that do not exist yet. */
export async function seedSampleCandidatesIfMissing(): Promise<{ created: number; skipped: number }> {
  const db = getDrizzleDb();
  let created = 0;
  let skipped = 0;

  for (const s of SAMPLE_CANDIDATE_SEEDS) {
    const email = s.email.trim().toLowerCase();
    const dup = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);

    if (dup[0]) {
      skipped += 1;
      continue;
    }

    const passwordHash = await hashPassword(crypto.randomUUID());
    const [u] = await db.insert(users).values({ email, passwordHash }).returning();

    await db.insert(candidateProfiles).values({
      userId: u.id,
      firstName: s.firstName,
      lastName: s.lastName,
      emailSnapshot: s.email,
      headline: s.headline,
      summary: s.summary,
      skills: s.skills,
      experience: s.experience,
      portfolioUrl: s.portfolioUrl ?? null,
      portfolioContent: s.portfolioContent ?? null,
    });

    created += 1;
  }

  return { created, skipped };
}
