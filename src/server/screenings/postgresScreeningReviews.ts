import { eq } from "drizzle-orm";

import { userHasCompanyAccess } from "../companies";
import { getDrizzleDb } from "../db/postgres";
import {
  screeningAnswers,
  screeningInvitations,
  screeningReviewScores,
  screeningReviews,
  vacancies,
} from "../schema";

export type ScreeningQuestionScoreDto = {
  questionId: string;
  score: number;
  note: string | null;
};

export type ScreeningReviewDto = {
  id: string;
  invitationId: string;
  reviewerUserId: string;
  overallScore: number | null;
  reviewerNote: string | null;
  questionScores: ScreeningQuestionScoreDto[];
  reviewedAt: string;
  updatedAt: string;
};

type ReviewAccessRow = {
  invitationId: string;
  status: string;
  postedByUserId: string;
  companyId: string;
};

async function loadReviewAccessRow(invitationId: string): Promise<ReviewAccessRow | null> {
  const db = getDrizzleDb();
  const rows = await db
    .select({
      invitationId: screeningInvitations.id,
      status: screeningInvitations.status,
      postedByUserId: vacancies.postedByUserId,
      companyId: vacancies.companyId,
    })
    .from(screeningInvitations)
    .innerJoin(vacancies, eq(screeningInvitations.vacancyId, vacancies.id))
    .where(eq(screeningInvitations.id, invitationId))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return r;
}

async function recruiterCanAccessInvitation(
  invitationId: string,
  recruiterUserId: string,
): Promise<ReviewAccessRow | null> {
  const row = await loadReviewAccessRow(invitationId);
  if (!row) return null;
  const allowed =
    row.postedByUserId === recruiterUserId ||
    (await userHasCompanyAccess(recruiterUserId, row.companyId));
  return allowed ? row : null;
}

function computeOverallScore(scores: number[]): number | null {
  if (scores.length === 0) return null;
  const sum = scores.reduce((a, b) => a + b, 0);
  return Math.min(5, Math.max(1, Math.round(sum / scores.length)));
}

export async function loadScreeningReviewForInvitation(
  invitationId: string,
): Promise<ScreeningReviewDto | null> {
  const db = getDrizzleDb();
  const reviewRows = await db
    .select({
      id: screeningReviews.id,
      invitationId: screeningReviews.invitationId,
      reviewerUserId: screeningReviews.reviewerUserId,
      overallScore: screeningReviews.overallScore,
      reviewerNote: screeningReviews.reviewerNote,
      reviewedAt: screeningReviews.reviewedAt,
      updatedAt: screeningReviews.updatedAt,
    })
    .from(screeningReviews)
    .where(eq(screeningReviews.invitationId, invitationId))
    .limit(1);
  const review = reviewRows[0];
  if (!review) return null;

  const scoreRows = await db
    .select({
      questionId: screeningReviewScores.questionId,
      score: screeningReviewScores.score,
      questionNote: screeningReviewScores.questionNote,
    })
    .from(screeningReviewScores)
    .where(eq(screeningReviewScores.reviewId, review.id));

  return {
    id: review.id,
    invitationId: review.invitationId,
    reviewerUserId: review.reviewerUserId,
    overallScore: review.overallScore,
    reviewerNote: review.reviewerNote?.trim() || null,
    questionScores: scoreRows.map((s) => ({
      questionId: s.questionId,
      score: s.score,
      note: s.questionNote?.trim() || null,
    })),
    reviewedAt: review.reviewedAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

export type UpsertScreeningReviewInput = {
  questionScores: { questionId: string; score: number; note?: string | null }[];
  reviewerNote?: string | null;
};

export async function upsertScreeningReviewForInvitation(
  invitationId: string,
  recruiterUserId: string,
  input: UpsertScreeningReviewInput,
): Promise<
  | { ok: true; review: ScreeningReviewDto }
  | {
      ok: false;
      reason: "NOT_FOUND" | "FORBIDDEN" | "NOT_SUBMITTED" | "INVALID_SCORES" | "INVALID_QUESTIONS";
    }
> {
  const access = await recruiterCanAccessInvitation(invitationId, recruiterUserId);
  if (!access) {
    const exists = await loadReviewAccessRow(invitationId);
    return { ok: false, reason: exists ? "FORBIDDEN" : "NOT_FOUND" };
  }
  if (access.status !== "submitted") {
    return { ok: false, reason: "NOT_SUBMITTED" };
  }

  const db = getDrizzleDb();
  const answerRows = await db
    .select({ questionId: screeningAnswers.questionId })
    .from(screeningAnswers)
    .where(eq(screeningAnswers.invitationId, invitationId));
  const expectedQuestionIds = new Set(answerRows.map((r) => r.questionId));
  if (expectedQuestionIds.size === 0) {
    return { ok: false, reason: "NOT_SUBMITTED" };
  }

  const normalized = input.questionScores.map((q) => ({
    questionId: q.questionId.trim(),
    score: Math.floor(Number(q.score)),
    note: (q.note ?? "").trim().slice(0, 500) || null,
  }));

  if (normalized.length !== expectedQuestionIds.size) {
    return { ok: false, reason: "INVALID_QUESTIONS" };
  }

  const seen = new Set<string>();
  for (const row of normalized) {
    if (!expectedQuestionIds.has(row.questionId) || seen.has(row.questionId)) {
      return { ok: false, reason: "INVALID_QUESTIONS" };
    }
    if (!Number.isFinite(row.score) || row.score < 1 || row.score > 5) {
      return { ok: false, reason: "INVALID_SCORES" };
    }
    seen.add(row.questionId);
  }

  const reviewerNote = (input.reviewerNote ?? "").trim().slice(0, 2000) || null;
  const overallScore = computeOverallScore(normalized.map((n) => n.score));
  const now = new Date();

  const existing = await db
    .select({ id: screeningReviews.id })
    .from(screeningReviews)
    .where(eq(screeningReviews.invitationId, invitationId))
    .limit(1);

  let reviewId = existing[0]?.id;

  await db.transaction(async (tx) => {
    if (reviewId) {
      await tx
        .update(screeningReviews)
        .set({
          reviewerUserId: recruiterUserId,
          overallScore,
          reviewerNote,
          updatedAt: now,
        })
        .where(eq(screeningReviews.id, reviewId));
      await tx.delete(screeningReviewScores).where(eq(screeningReviewScores.reviewId, reviewId));
    } else {
      const inserted = await tx
        .insert(screeningReviews)
        .values({
          invitationId,
          reviewerUserId: recruiterUserId,
          overallScore,
          reviewerNote,
          reviewedAt: now,
          updatedAt: now,
        })
        .returning({ id: screeningReviews.id });
      reviewId = inserted[0]!.id;
    }

    await tx.insert(screeningReviewScores).values(
      normalized.map((n) => ({
        reviewId: reviewId!,
        questionId: n.questionId,
        score: n.score,
        questionNote: n.note,
      })),
    );
  });

  const review = await loadScreeningReviewForInvitation(invitationId);
  if (!review) {
    return { ok: false, reason: "NOT_FOUND" };
  }
  return { ok: true, review };
}
