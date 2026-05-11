import { asc, eq, sql } from "drizzle-orm";

import type { CandidateProfile } from "../../lib/domainTypes";
import { getDrizzleDb } from "../db/postgres";
import { candidateProfiles, users } from "../schema";
import { hashPassword } from "../auth/password";
import { SAMPLE_CANDIDATE_SEEDS } from "./sampleCandidateSeeds";

function mapCandidateRow(row: typeof candidateProfiles.$inferSelect): CandidateProfile {
  return {
    userId: row.userId,
    fullName: row.fullName,
    email: row.emailSnapshot,
    headline: row.headline,
    summary: row.summary,
    skills: row.skills,
    experience: row.experience,
    portfolioUrl: row.portfolioUrl,
    portfolioContent: row.portfolioContent,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listAllCandidateProfiles(): Promise<CandidateProfile[]> {
  const db = getDrizzleDb();
  const rows = await db.select().from(candidateProfiles).orderBy(asc(candidateProfiles.fullName));
  return rows.map(mapCandidateRow);
}

export async function getCandidateProfileByUserId(userId: string): Promise<CandidateProfile | null> {
  const db = getDrizzleDb();
  const rows = await db
    .select()
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, userId))
    .limit(1);
  const row = rows[0];
  return row ? mapCandidateRow(row) : null;
}

export async function upsertCandidateProfileForUser(
  userId: string,
  patch: Partial<
    Pick<
      CandidateProfile,
      "fullName" | "email" | "headline" | "summary" | "skills" | "experience" | "portfolioUrl" | "portfolioContent"
    >
  >,
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
        fullName: patch.fullName ?? "",
        emailSnapshot: patch.email ?? "",
        headline: patch.headline ?? "",
        summary: patch.summary ?? "",
        skills: patch.skills ?? "",
        experience: patch.experience ?? "",
        portfolioUrl: patch.portfolioUrl ?? null,
        portfolioContent: patch.portfolioContent ?? null,
        updatedAt: now,
      })
      .returning();
    return mapCandidateRow(row);
  }

  const cur = existing[0];
  const [row] = await db
    .update(candidateProfiles)
    .set({
      fullName: patch.fullName !== undefined ? patch.fullName : cur.fullName,
      emailSnapshot: patch.email !== undefined ? patch.email : cur.emailSnapshot,
      headline: patch.headline !== undefined ? patch.headline : cur.headline,
      summary: patch.summary !== undefined ? patch.summary : cur.summary,
      skills: patch.skills !== undefined ? patch.skills : cur.skills,
      experience: patch.experience !== undefined ? patch.experience : cur.experience,
      portfolioUrl: patch.portfolioUrl !== undefined ? patch.portfolioUrl : cur.portfolioUrl,
      portfolioContent: patch.portfolioContent !== undefined ? patch.portfolioContent : cur.portfolioContent,
      updatedAt: now,
    })
    .where(eq(candidateProfiles.userId, userId))
    .returning();
  return mapCandidateRow(row);
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
      fullName: s.fullName,
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
