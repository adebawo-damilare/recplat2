import { and, asc, desc, eq } from "drizzle-orm";

import {
  SCREENING_PILOT_CATEGORY_SLUG,
  type ScreeningInvitationStatus,
} from "../../shared/screeningPilot";
import { getDrizzleDb } from "../db/postgres";
import {
  applications,
  categories,
  categoryScreeningQuestions,
  screeningAnswers,
  screeningInvitations,
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

export type ScreeningInvitationDetail = ScreeningInvitationSummary & {
  questions: ScreeningQuestionDto[];
  answers: ScreeningAnswerDto[];
};

type ApplicationContext = {
  applicationId: string;
  vacancyId: string;
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

export async function listActiveQuestionsForPilotCategory(): Promise<ScreeningQuestionDto[]> {
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
    .where(
      and(
        eq(categories.slug, SCREENING_PILOT_CATEGORY_SLUG),
        eq(categoryScreeningQuestions.isActive, true),
      ),
    )
    .orderBy(asc(categoryScreeningQuestions.sortOrder));

  return rows.map((r) => ({
    id: r.id,
    sortOrder: r.sortOrder,
    prompt: r.prompt,
    responseType: r.responseType,
  }));
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
    })
    .from(screeningInvitations)
    .innerJoin(vacancies, eq(screeningInvitations.vacancyId, vacancies.id))
    .leftJoin(categories, eq(vacancies.categoryId, categories.id))
    .where(eq(screeningInvitations.id, invitationId))
    .limit(1);

  const r = rows[0];
  if (!r) return { ok: false, reason: "NOT_FOUND" };

  const allowed =
    role === "candidate"
      ? r.candidateUserId === userId
      : r.postedByUserId === userId;
  if (!allowed) return { ok: false, reason: "FORBIDDEN" };

  const questions = await listActiveQuestionsForPilotCategory();
  const answers =
    r.status === "submitted" ? await loadAnswersForInvitation(invitationId) : [];

  return {
    ok: true,
    invitation: {
      ...mapInvitationSummary(r),
      questions,
      answers,
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
  if (ctx.postedByUserId !== recruiterUserId) return { ok: false, reason: "FORBIDDEN" };
  if (ctx.categorySlug !== SCREENING_PILOT_CATEGORY_SLUG) {
    return { ok: false, reason: "NOT_PILOT_LANE" };
  }

  const questions = await listActiveQuestionsForPilotCategory();
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

  const questions = await listActiveQuestionsForPilotCategory();
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
