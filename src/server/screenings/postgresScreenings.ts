import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import {
  isScreeningEnabledCategorySlug,
  SCREENING_ENABLED_CATEGORY_SLUGS,
  screeningLaneLabel,
  type ScreeningInvitationStatus,
} from "../../shared/screeningPilot";
import { formatCandidateFullName } from "../../lib/candidateName";
import type { ScreeningReviewDto } from "./postgresScreeningReviews";
import {
  listCompanyIdsForUser,
  userCanAccessApplication,
  userHasCompanyAccess,
} from "../companies";
import { getDrizzleDb } from "../db/postgres";
import {
  applications,
  candidateProfiles,
  categories,
  categoryScreeningQuestions,
  screeningAnswers,
  screeningInvitations,
  screeningReviews,
  vacancies,
} from "../schema";

export type ScreeningQuestionDto = {
  id: string;
  sortOrder: number;
  prompt: string;
  responseType: string;
};

export type ScreeningAnswerDto = {
  questionId: string;
  prompt: string;
  answerText: string;
};

export type ScreeningInvitationSummary = {
  id: string;
  applicationId: string;
  vacancyId: string;
  status: ScreeningInvitationStatus;
  invitedAt: string;
  submittedAt: string | null;
  vacancy: { jobTitle: string; companyName: string; categorySlug: string | null };
};

export type ScreeningCandidateSummary = {
  name: string;
  email: string;
};

export type ScreeningInvitationDetail = ScreeningInvitationSummary & {
  questions: ScreeningQuestionDto[];
  answers: ScreeningAnswerDto[];
  /** Present when a recruiter loads the invitation (review page). */
  candidate?: ScreeningCandidateSummary;
  /** Recruiter scores for a submitted screening, when saved. */
  review?: ScreeningReviewDto | null;
};

type ApplicationContext = {
  applicationId: string;
  vacancyId: string;
  companyId: string;
  candidateUserId: string;
  postedByUserId: string;
  categorySlug: string | null;
};

async function loadApplicationContext(applicationId: string): Promise<ApplicationContext | null> {
  const db = getDrizzleDb();
  const rows = await db
    .select({
      applicationId: applications.id,
      vacancyId: applications.vacancyId,
      candidateUserId: applications.candidateUserId,
      companyId: vacancies.companyId,
      postedByUserId: vacancies.postedByUserId,
      categorySlug: categories.slug,
    })
    .from(applications)
    .innerJoin(vacancies, eq(applications.vacancyId, vacancies.id))
    .leftJoin(categories, eq(vacancies.categoryId, categories.id))
    .where(eq(applications.id, applicationId))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return r;
}

export async function listActiveQuestionsForCategorySlug(
  categorySlug: string,
): Promise<ScreeningQuestionDto[]> {
  const slug = categorySlug.trim().toLowerCase();
  if (!isScreeningEnabledCategorySlug(slug)) return [];

  const db = getDrizzleDb();
  const rows = await db
    .select({
      id: categoryScreeningQuestions.id,
      sortOrder: categoryScreeningQuestions.sortOrder,
      prompt: categoryScreeningQuestions.prompt,
      responseType: categoryScreeningQuestions.responseType,
    })
    .from(categoryScreeningQuestions)
    .innerJoin(categories, eq(categoryScreeningQuestions.categoryId, categories.id))
    .where(and(eq(categories.slug, slug), eq(categoryScreeningQuestions.isActive, true)))
    .orderBy(asc(categoryScreeningQuestions.sortOrder));

  return rows.map((r) => ({
    id: r.id,
    sortOrder: r.sortOrder,
    prompt: r.prompt,
    responseType: r.responseType,
  }));
}

/** @deprecated use listActiveQuestionsForCategorySlug */
export async function listActiveQuestionsForPilotCategory(): Promise<ScreeningQuestionDto[]> {
  return listActiveQuestionsForCategorySlug("marketers");
}

function mapInvitationSummary(
  row: {
    id: string;
    applicationId: string;
    vacancyId: string;
    status: string;
    invitedAt: Date;
    submittedAt: Date | null;
    jobTitle: string;
    companyName: string;
    categorySlug: string | null;
  },
): ScreeningInvitationSummary {
  return {
    id: row.id,
    applicationId: row.applicationId,
    vacancyId: row.vacancyId,
    status: row.status === "submitted" ? "submitted" : "pending",
    invitedAt: row.invitedAt.toISOString(),
    submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
    vacancy: {
      jobTitle: row.jobTitle,
      companyName: row.companyName,
      categorySlug: row.categorySlug,
    },
  };
}

export async function getInvitationByApplicationId(
  applicationId: string,
): Promise<ScreeningInvitationSummary | null> {
  const db = getDrizzleDb();
  const rows = await db
    .select({
      id: screeningInvitations.id,
      applicationId: screeningInvitations.applicationId,
      vacancyId: screeningInvitations.vacancyId,
      status: screeningInvitations.status,
      invitedAt: screeningInvitations.invitedAt,
      submittedAt: screeningInvitations.submittedAt,
      jobTitle: vacancies.jobTitle,
      companyName: vacancies.companyNameDenorm,
      categorySlug: categories.slug,
    })
    .from(screeningInvitations)
    .innerJoin(vacancies, eq(screeningInvitations.vacancyId, vacancies.id))
    .leftJoin(categories, eq(vacancies.categoryId, categories.id))
    .where(eq(screeningInvitations.applicationId, applicationId))
    .limit(1);
  const r = rows[0];
  return r ? mapInvitationSummary(r) : null;
}

export async function listInvitationsForCandidate(
  candidateUserId: string,
): Promise<ScreeningInvitationSummary[]> {
  const db = getDrizzleDb();
  const rows = await db
    .select({
      id: screeningInvitations.id,
      applicationId: screeningInvitations.applicationId,
      vacancyId: screeningInvitations.vacancyId,
      status: screeningInvitations.status,
      invitedAt: screeningInvitations.invitedAt,
      submittedAt: screeningInvitations.submittedAt,
      jobTitle: vacancies.jobTitle,
      companyName: vacancies.companyNameDenorm,
      categorySlug: categories.slug,
    })
    .from(screeningInvitations)
    .innerJoin(vacancies, eq(screeningInvitations.vacancyId, vacancies.id))
    .leftJoin(categories, eq(vacancies.categoryId, categories.id))
    .where(eq(screeningInvitations.candidateUserId, candidateUserId))
    .orderBy(desc(screeningInvitations.invitedAt));

  return rows.map(mapInvitationSummary);
}

async function loadAnswersForInvitation(invitationId: string): Promise<ScreeningAnswerDto[]> {
  const db = getDrizzleDb();
  const rows = await db
    .select({
      questionId: screeningAnswers.questionId,
      prompt: categoryScreeningQuestions.prompt,
      answerText: screeningAnswers.answerText,
    })
    .from(screeningAnswers)
    .innerJoin(
      categoryScreeningQuestions,
      eq(screeningAnswers.questionId, categoryScreeningQuestions.id),
    )
    .where(eq(screeningAnswers.invitationId, invitationId))
    .orderBy(asc(categoryScreeningQuestions.sortOrder));
  return rows.map((r) => ({
    questionId: r.questionId,
    prompt: r.prompt,
    answerText: r.answerText,
  }));
}

export async function getInvitationDetailForUser(
  invitationId: string,
  userId: string,
  role: "candidate" | "recruiter",
): Promise<
  | { ok: true; invitation: ScreeningInvitationDetail }
  | { ok: false; reason: "NOT_FOUND" | "FORBIDDEN" }
> {
  const db = getDrizzleDb();
  const rows = await db
    .select({
      id: screeningInvitations.id,
      applicationId: screeningInvitations.applicationId,
      vacancyId: screeningInvitations.vacancyId,
      candidateUserId: screeningInvitations.candidateUserId,
      status: screeningInvitations.status,
      invitedAt: screeningInvitations.invitedAt,
      submittedAt: screeningInvitations.submittedAt,
      jobTitle: vacancies.jobTitle,
      companyName: vacancies.companyNameDenorm,
      categorySlug: categories.slug,
      postedByUserId: vacancies.postedByUserId,
      companyId: vacancies.companyId,
      firstName: candidateProfiles.firstName,
      lastName: candidateProfiles.lastName,
      emailSnapshot: candidateProfiles.emailSnapshot,
    })
    .from(screeningInvitations)
    .innerJoin(vacancies, eq(screeningInvitations.vacancyId, vacancies.id))
    .leftJoin(categories, eq(vacancies.categoryId, categories.id))
    .leftJoin(
      candidateProfiles,
      sql`${screeningInvitations.candidateUserId} = ${candidateProfiles.userId}::text`,
    )
    .where(eq(screeningInvitations.id, invitationId))
    .limit(1);

  const r = rows[0];
  if (!r) return { ok: false, reason: "NOT_FOUND" };

  const allowed =
    role === "candidate"
      ? r.candidateUserId === userId
      : r.postedByUserId === userId || (await userHasCompanyAccess(userId, r.companyId));
  if (!allowed) return { ok: false, reason: "FORBIDDEN" };

  const lane = r.categorySlug?.trim().toLowerCase() ?? "";
  const questions = lane ? await listActiveQuestionsForCategorySlug(lane) : [];
  const answers =
    r.status === "submitted" ? await loadAnswersForInvitation(invitationId) : [];

  const candidate =
    role === "recruiter"
      ? {
          name:
            formatCandidateFullName(r.firstName, r.lastName) ||
            r.emailSnapshot?.trim() ||
            "Candidate",
          email: r.emailSnapshot?.trim() || "",
        }
      : undefined;

  let review: ScreeningReviewDto | null | undefined;
  if (role === "recruiter" && r.status === "submitted") {
    const { loadScreeningReviewForInvitation } = await import("./postgresScreeningReviews");
    review = await loadScreeningReviewForInvitation(invitationId);
  }

  return {
    ok: true,
    invitation: {
      ...mapInvitationSummary(r),
      questions,
      answers,
      ...(candidate ? { candidate } : {}),
      ...(role === "recruiter" ? { review: review ?? null } : {}),
    },
  };
}

export async function createScreeningInvitation(
  applicationId: string,
  recruiterUserId: string,
): Promise<
  | { ok: true; invitation: ScreeningInvitationSummary; created: boolean }
  | {
      ok: false;
      reason:
        | "NOT_FOUND"
        | "FORBIDDEN"
        | "NOT_PILOT_LANE"
        | "NO_QUESTIONS"
        | "CANDIDATE_MISMATCH";
    }
> {
  const ctx = await loadApplicationContext(applicationId);
  if (!ctx) return { ok: false, reason: "NOT_FOUND" };
  if (!(await userCanAccessApplication(recruiterUserId, applicationId))) {
    return { ok: false, reason: "FORBIDDEN" };
  }
  if (!ctx.categorySlug || !isScreeningEnabledCategorySlug(ctx.categorySlug)) {
    return { ok: false, reason: "NOT_PILOT_LANE" };
  }

  const questions = await listActiveQuestionsForCategorySlug(ctx.categorySlug);
  if (questions.length === 0) return { ok: false, reason: "NO_QUESTIONS" };

  const existing = await getInvitationByApplicationId(applicationId);
  if (existing) return { ok: true, invitation: existing, created: false };

  const db = getDrizzleDb();
  const [row] = await db
    .insert(screeningInvitations)
    .values({
      applicationId,
      vacancyId: ctx.vacancyId,
      candidateUserId: ctx.candidateUserId,
      invitedByUserId: recruiterUserId,
      status: "pending",
    })
    .returning({ id: screeningInvitations.id });

  if (!row?.id) {
    const again = await getInvitationByApplicationId(applicationId);
    if (again) return { ok: true, invitation: again, created: false };
    return { ok: false, reason: "NOT_FOUND" };
  }

  const invitation = await getInvitationByApplicationId(applicationId);
  if (!invitation) return { ok: false, reason: "NOT_FOUND" };
  return { ok: true, invitation, created: true };
}

export async function submitScreeningInvitation(
  invitationId: string,
  candidateUserId: string,
  answersIn: { questionId: string; answerText: string }[],
): Promise<
  | { ok: true; invitation: ScreeningInvitationSummary }
  | {
      ok: false;
      reason:
        | "NOT_FOUND"
        | "FORBIDDEN"
        | "ALREADY_SUBMITTED"
        | "INVALID_ANSWERS"
        | "MISSING_ANSWERS";
    }
> {
  const db = getDrizzleDb();
  const rows = await db
    .select({
      id: screeningInvitations.id,
      applicationId: screeningInvitations.applicationId,
      vacancyId: screeningInvitations.vacancyId,
      candidateUserId: screeningInvitations.candidateUserId,
      status: screeningInvitations.status,
    })
    .from(screeningInvitations)
    .where(eq(screeningInvitations.id, invitationId))
    .limit(1);
  const inv = rows[0];
  if (!inv) return { ok: false, reason: "NOT_FOUND" };
  if (inv.candidateUserId !== candidateUserId) return { ok: false, reason: "FORBIDDEN" };
  if (inv.status === "submitted") return { ok: false, reason: "ALREADY_SUBMITTED" };

  const vacRows = await db
    .select({ categorySlug: categories.slug })
    .from(vacancies)
    .leftJoin(categories, eq(vacancies.categoryId, categories.id))
    .where(eq(vacancies.id, inv.vacancyId))
    .limit(1);
  const lane = vacRows[0]?.categorySlug?.trim().toLowerCase() ?? "";
  if (!isScreeningEnabledCategorySlug(lane)) {
    return { ok: false, reason: "INVALID_ANSWERS" };
  }

  const questions = await listActiveQuestionsForCategorySlug(lane);
  const questionIds = new Set(questions.map((q) => q.id));
  const byQuestion = new Map<string, string>();

  for (const a of answersIn) {
    const qid = a.questionId?.trim();
    const text = a.answerText?.trim() ?? "";
    if (!qid || !questionIds.has(qid)) return { ok: false, reason: "INVALID_ANSWERS" };
    if (!text) return { ok: false, reason: "MISSING_ANSWERS" };
    byQuestion.set(qid, text.slice(0, 8000));
  }

  if (byQuestion.size !== questions.length) {
    return { ok: false, reason: "MISSING_ANSWERS" };
  }

  await db.transaction(async (tx) => {
    for (const q of questions) {
      const answerText = byQuestion.get(q.id)!;
      await tx.insert(screeningAnswers).values({ invitationId, questionId: q.id, answerText });
    }
    await tx
      .update(screeningInvitations)
      .set({ status: "submitted", submittedAt: new Date() })
      .where(eq(screeningInvitations.id, invitationId));
  });

  const summary = await getInvitationByApplicationId(inv.applicationId);
  if (!summary) return { ok: false, reason: "NOT_FOUND" };
  return { ok: true, invitation: summary };
}

export type ScreeningMatrixRow = {
  applicationId: string;
  candidateUserId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  vacancyId: string;
  categorySlug: string;
  screeningStatus: "not_invited" | "pending" | "submitted";
  invitationId: string | null;
  answersByQuestionId: Record<string, string | null>;
};

export type ScreeningMatrix = {
  categorySlug: string;
  questions: ScreeningQuestionDto[];
  rows: ScreeningMatrixRow[];
};

/** Applicants on screening-enabled lanes; questions match selected lane. */
export async function listScreeningMatrixForOwner(
  ownerUserId: string,
  options?: { vacancyId?: string | null; categorySlug?: string | null },
): Promise<ScreeningMatrix> {
  const lane = options?.categorySlug?.trim().toLowerCase() || "marketers";
  if (!isScreeningEnabledCategorySlug(lane)) {
    return { categorySlug: lane, questions: [], rows: [] };
  }

  const questions = await listActiveQuestionsForCategorySlug(lane);
  if (questions.length === 0) {
    return { categorySlug: lane, questions: [], rows: [] };
  }

  const companyIds = await listCompanyIdsForUser(ownerUserId);
  if (companyIds.length === 0) {
    return { categorySlug: lane, questions: [], rows: [] };
  }

  const db = getDrizzleDb();
  const filters = [inArray(vacancies.companyId, companyIds), eq(categories.slug, lane)];
  const vid = options?.vacancyId?.trim();
  if (vid) filters.push(eq(applications.vacancyId, vid));

  const appRows = await db
    .select({
      applicationId: applications.id,
      candidateUserId: applications.candidateUserId,
      vacancyId: applications.vacancyId,
      jobTitle: vacancies.jobTitle,
      firstName: candidateProfiles.firstName,
      lastName: candidateProfiles.lastName,
      emailSnapshot: candidateProfiles.emailSnapshot,
      invitationId: screeningInvitations.id,
      invitationStatus: screeningInvitations.status,
    })
    .from(applications)
    .innerJoin(vacancies, eq(applications.vacancyId, vacancies.id))
    .innerJoin(categories, eq(vacancies.categoryId, categories.id))
    .leftJoin(candidateProfiles, sql`${applications.candidateUserId} = ${candidateProfiles.userId}::text`)
    .leftJoin(screeningInvitations, eq(screeningInvitations.applicationId, applications.id))
    .where(and(...filters)!)
    .orderBy(desc(applications.createdAt));

  const invitationIds = appRows
    .map((r) => r.invitationId)
    .filter((id): id is string => Boolean(id));

  const answersByInvitation = new Map<string, Map<string, string>>();
  if (invitationIds.length > 0) {
    const answerRows = await db
      .select({
        invitationId: screeningAnswers.invitationId,
        questionId: screeningAnswers.questionId,
        answerText: screeningAnswers.answerText,
      })
      .from(screeningAnswers)
      .where(inArray(screeningAnswers.invitationId, invitationIds));

    for (const a of answerRows) {
      if (!answersByInvitation.has(a.invitationId)) {
        answersByInvitation.set(a.invitationId, new Map());
      }
      answersByInvitation.get(a.invitationId)!.set(a.questionId, a.answerText);
    }
  }

  const rows: ScreeningMatrixRow[] = appRows.map((r) => {
    const screeningStatus: ScreeningMatrixRow["screeningStatus"] = !r.invitationId
      ? "not_invited"
      : r.invitationStatus === "submitted"
        ? "submitted"
        : "pending";

    const answerMap = r.invitationId ? answersByInvitation.get(r.invitationId) : undefined;
    const answersByQuestionId: Record<string, string | null> = {};
    for (const q of questions) {
      if (screeningStatus === "submitted" && answerMap?.has(q.id)) {
        answersByQuestionId[q.id] = answerMap.get(q.id) ?? null;
      } else if (screeningStatus === "pending") {
        answersByQuestionId[q.id] = null;
      } else {
        answersByQuestionId[q.id] = null;
      }
    }

    const name = [r.firstName?.trim(), r.lastName?.trim()].filter(Boolean).join(" ");

    return {
      applicationId: r.applicationId,
      candidateUserId: r.candidateUserId,
      candidateName: name || "(No profile)",
      candidateEmail: r.emailSnapshot?.trim() || "",
      jobTitle: r.jobTitle,
      vacancyId: r.vacancyId,
      categorySlug: lane,
      screeningStatus,
      invitationId: r.invitationId,
      answersByQuestionId,
    };
  });

  return { categorySlug: lane, questions, rows };
}

export async function getScreeningNotificationTargets(
  applicationId: string,
): Promise<{
  candidateUserId: string;
  recruiterUserId: string;
  jobTitle: string;
  categorySlug: string | null;
} | null> {
  const ctx = await loadApplicationContext(applicationId);
  if (!ctx) return null;
  const db = getDrizzleDb();
  const rows = await db
    .select({ jobTitle: vacancies.jobTitle })
    .from(vacancies)
    .where(eq(vacancies.id, ctx.vacancyId))
    .limit(1);
  return {
    candidateUserId: ctx.candidateUserId,
    recruiterUserId: ctx.postedByUserId,
    jobTitle: rows[0]?.jobTitle ?? "Role",
    categorySlug: ctx.categorySlug,
  };
}

export type ScreeningFollowUpKind = "needs_invite" | "awaiting_candidate" | "awaiting_review";

export type ScreeningFollowUpItem = {
  kind: ScreeningFollowUpKind;
  applicationId: string;
  invitationId: string | null;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  companyName: string;
  vacancyId: string;
  categorySlug: string;
  invitedAt: string | null;
  submittedAt: string | null;
  reminderText: string;
  linkPath: string | null;
  /** Set when a recruiter saved scores for a submitted screening. */
  overallScore: number | null;
  reviewedAt: string | null;
};

function buildFollowUpReminderText(input: {
  kind: ScreeningFollowUpKind;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  categorySlug: string;
}): string {
  const name = input.candidateName.trim() || "there";
  const role = input.jobTitle.trim() || "the role";
  const company = input.companyName.trim() || "our team";
  const lane = screeningLaneLabel(input.categorySlug);

  if (input.kind === "needs_invite") {
    return `Invite ${name} to the ${lane} screening for ${role} (${company}).`;
  }
  if (input.kind === "awaiting_candidate") {
    return `Hi ${name}, please complete your ${lane} screening for ${role} at ${company}. You can finish it from your TalentBridge dashboard under Screenings.`;
  }
  return `Review ${name}'s submitted ${lane} screening for ${role} at ${company}.`;
}

const FOLLOW_UP_KIND_RANK: Record<ScreeningFollowUpKind, number> = {
  awaiting_review: 0,
  awaiting_candidate: 1,
  needs_invite: 2,
};

/** Actionable screening items for a recruiter (invite, chase, review). */
export async function listRecruiterScreeningFollowUpForOwner(
  ownerUserId: string,
  options?: { categorySlug?: string | null; limit?: number },
): Promise<ScreeningFollowUpItem[]> {
  const laneFilter = options?.categorySlug?.trim().toLowerCase();
  const limit = Math.min(50, Math.max(1, options?.limit ?? 30));

  const laneSlugs =
    laneFilter && isScreeningEnabledCategorySlug(laneFilter)
      ? [laneFilter]
      : [...SCREENING_ENABLED_CATEGORY_SLUGS];

  const companyIds = await listCompanyIdsForUser(ownerUserId);
  if (companyIds.length === 0) return [];

  const db = getDrizzleDb();
  const appRows = await db
    .select({
      applicationId: applications.id,
      appliedAt: applications.createdAt,
      vacancyId: applications.vacancyId,
      jobTitle: vacancies.jobTitle,
      companyName: vacancies.companyNameDenorm,
      categorySlug: categories.slug,
      firstName: candidateProfiles.firstName,
      lastName: candidateProfiles.lastName,
      emailSnapshot: candidateProfiles.emailSnapshot,
      invitationId: screeningInvitations.id,
      invitationStatus: screeningInvitations.status,
      invitedAt: screeningInvitations.invitedAt,
      submittedAt: screeningInvitations.submittedAt,
      overallScore: screeningReviews.overallScore,
      reviewedAt: screeningReviews.reviewedAt,
    })
    .from(applications)
    .innerJoin(vacancies, eq(applications.vacancyId, vacancies.id))
    .innerJoin(categories, eq(vacancies.categoryId, categories.id))
    .leftJoin(
      candidateProfiles,
      sql`${applications.candidateUserId} = ${candidateProfiles.userId}::text`,
    )
    .leftJoin(screeningInvitations, eq(screeningInvitations.applicationId, applications.id))
    .leftJoin(screeningReviews, eq(screeningReviews.invitationId, screeningInvitations.id))
    .where(and(inArray(vacancies.companyId, companyIds), inArray(categories.slug, laneSlugs))!)
    .orderBy(desc(applications.createdAt));

  const items: ScreeningFollowUpItem[] = [];

  for (const r of appRows) {
    const categorySlug = r.categorySlug?.trim().toLowerCase() ?? "";
    if (!isScreeningEnabledCategorySlug(categorySlug)) continue;

    const candidateName =
      [r.firstName?.trim(), r.lastName?.trim()].filter(Boolean).join(" ") || "(No profile)";
    const candidateEmail = r.emailSnapshot?.trim() || "";

    let kind: ScreeningFollowUpKind;
    if (!r.invitationId) {
      kind = "needs_invite";
    } else if (r.invitationStatus === "submitted") {
      kind = "awaiting_review";
    } else {
      kind = "awaiting_candidate";
    }

    const linkPath =
      kind === "awaiting_review" && r.invitationId
        ? `/dashboard/screenings/${r.invitationId}`
        : null;

    items.push({
      kind,
      applicationId: r.applicationId,
      invitationId: r.invitationId,
      candidateName,
      candidateEmail,
      jobTitle: r.jobTitle,
      companyName: r.companyName ?? "",
      vacancyId: r.vacancyId,
      categorySlug,
      invitedAt: r.invitedAt ? r.invitedAt.toISOString() : null,
      submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
      reminderText: buildFollowUpReminderText({
        kind,
        candidateName,
        jobTitle: r.jobTitle,
        companyName: r.companyName ?? "",
        categorySlug,
      }),
      linkPath,
      overallScore:
        kind === "awaiting_review" && r.overallScore != null ? Number(r.overallScore) : null,
      reviewedAt:
        kind === "awaiting_review" && r.reviewedAt ? r.reviewedAt.toISOString() : null,
    });
  }

  items.sort((a, b) => {
    const rank = FOLLOW_UP_KIND_RANK[a.kind] - FOLLOW_UP_KIND_RANK[b.kind];
    if (rank !== 0) return rank;
    if (a.kind === "awaiting_review") {
      const aScored = a.overallScore != null ? 1 : 0;
      const bScored = b.overallScore != null ? 1 : 0;
      if (aScored !== bScored) return aScored - bScored;
      return (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "");
    }
    if (a.kind === "awaiting_candidate") {
      return (a.invitedAt ?? "").localeCompare(b.invitedAt ?? "");
    }
    return 0;
  });

  return items.slice(0, limit);
}

/** @deprecated use listScreeningMatrixForOwner */
export async function listMarketersScreeningMatrixForOwner(
  ownerUserId: string,
  vacancyId?: string | null,
): Promise<ScreeningMatrix> {
  return listScreeningMatrixForOwner(ownerUserId, { vacancyId, categorySlug: "marketers" });
}
