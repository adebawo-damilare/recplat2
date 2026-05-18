import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import {
  isScreeningEnabledCategorySlug,
  type ScreeningInvitationStatus,
} from "../../shared/screeningPilot";
import { getDrizzleDb } from "../db/postgres";
import {
  applications,
  candidateProfiles,
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

  const lane = r.categorySlug?.trim().toLowerCase() ?? "";
  const questions = lane ? await listActiveQuestionsForCategorySlug(lane) : [];
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

  const db = getDrizzleDb();
  const filters = [eq(vacancies.postedByUserId, ownerUserId), eq(categories.slug, lane)];
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

/** @deprecated use listScreeningMatrixForOwner */
export async function listMarketersScreeningMatrixForOwner(
  ownerUserId: string,
  vacancyId?: string | null,
): Promise<ScreeningMatrix> {
  return listScreeningMatrixForOwner(ownerUserId, { vacancyId, categorySlug: "marketers" });
}
