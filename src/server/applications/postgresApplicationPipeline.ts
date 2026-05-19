import { desc, eq } from "drizzle-orm";

import { userCanAccessApplication } from "../companies";
import { normalizeApplicationStatus, type PipelineApplicationStatus } from "../../lib/applicationStatus";
import { getDrizzleDb } from "../db/postgres";
import { applicationNotes, applicationStatusEvents, applications, users } from "../schema";

export type ApplicationStatusEventDto = {
  id: string;
  fromStatus: PipelineApplicationStatus | null;
  toStatus: PipelineApplicationStatus;
  note: string | null;
  actorEmail: string;
  createdAt: string;
};

export type ApplicationNoteDto = {
  id: string;
  body: string;
  authorEmail: string;
  createdAt: string;
};

export async function listApplicationPipelineAudit(
  applicationId: string,
  recruiterUserId: string,
): Promise<
  | { ok: true; statusEvents: ApplicationStatusEventDto[]; notes: ApplicationNoteDto[] }
  | { ok: false; reason: "NOT_FOUND" | "FORBIDDEN" }
> {
  const canAccess = await userCanAccessApplication(recruiterUserId, applicationId);
  if (!canAccess) {
    const db = getDrizzleDb();
    const exists = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);
    if (!exists[0]?.id) return { ok: false, reason: "NOT_FOUND" };
    return { ok: false, reason: "FORBIDDEN" };
  }

  const db = getDrizzleDb();
  const statusRows = await db
    .select({
      id: applicationStatusEvents.id,
      fromStatus: applicationStatusEvents.fromStatus,
      toStatus: applicationStatusEvents.toStatus,
      note: applicationStatusEvents.note,
      actorEmail: users.email,
      createdAt: applicationStatusEvents.createdAt,
    })
    .from(applicationStatusEvents)
    .innerJoin(users, eq(applicationStatusEvents.actorUserId, users.id))
    .where(eq(applicationStatusEvents.applicationId, applicationId))
    .orderBy(desc(applicationStatusEvents.createdAt));

  const noteRows = await db
    .select({
      id: applicationNotes.id,
      body: applicationNotes.body,
      authorEmail: users.email,
      createdAt: applicationNotes.createdAt,
    })
    .from(applicationNotes)
    .innerJoin(users, eq(applicationNotes.authorUserId, users.id))
    .where(eq(applicationNotes.applicationId, applicationId))
    .orderBy(desc(applicationNotes.createdAt));

  return {
    ok: true,
    statusEvents: statusRows.map((r) => ({
      id: r.id,
      fromStatus: r.fromStatus ? normalizeApplicationStatus(r.fromStatus) : null,
      toStatus: normalizeApplicationStatus(r.toStatus),
      note: r.note?.trim() || null,
      actorEmail: r.actorEmail,
      createdAt: r.createdAt.toISOString(),
    })),
    notes: noteRows.map((r) => ({
      id: r.id,
      body: r.body,
      authorEmail: r.authorEmail,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function addApplicationNoteForRecruiter(
  applicationId: string,
  authorUserId: string,
  body: string,
): Promise<
  | { ok: true; note: ApplicationNoteDto }
  | { ok: false; reason: "NOT_FOUND" | "FORBIDDEN" | "INVALID_BODY" }
> {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, reason: "INVALID_BODY" };

  const canAccess = await userCanAccessApplication(authorUserId, applicationId);
  if (!canAccess) {
    const db = getDrizzleDb();
    const exists = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);
    if (!exists[0]?.id) return { ok: false, reason: "NOT_FOUND" };
    return { ok: false, reason: "FORBIDDEN" };
  }

  const db = getDrizzleDb();
  const [inserted] = await db
    .insert(applicationNotes)
    .values({
      applicationId,
      authorUserId,
      body: trimmed.slice(0, 4000),
    })
    .returning({ id: applicationNotes.id, createdAt: applicationNotes.createdAt });

  if (!inserted?.id) return { ok: false, reason: "INVALID_BODY" };

  const authorRows = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, authorUserId))
    .limit(1);

  return {
    ok: true,
    note: {
      id: inserted.id,
      body: trimmed.slice(0, 4000),
      authorEmail: authorRows[0]?.email ?? "",
      createdAt: inserted.createdAt.toISOString(),
    },
  };
}

export async function recordApplicationStatusEvent(input: {
  applicationId: string;
  actorUserId: string;
  fromStatus: PipelineApplicationStatus | null;
  toStatus: PipelineApplicationStatus;
  note?: string | null;
}): Promise<void> {
  const db = getDrizzleDb();
  await db.insert(applicationStatusEvents).values({
    applicationId: input.applicationId,
    actorUserId: input.actorUserId,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    note: input.note?.trim().slice(0, 2000) || null,
  });
}
