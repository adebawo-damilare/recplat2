import { getDrizzleDb } from "../db/postgres";
import { aiAuditEvents } from "../schema";
import { getTalentBridgeAiBackend, getTalentBridgeAiModel } from "./config";

export async function recordAiAudit(entry: {
  actorUserId?: string | null;
  eventType: string;
  payload?: unknown;
  provider?: string;
  model?: string | null;
}) {
  if (!process.env.DATABASE_URL?.trim()) {
    return null;
  }

  try {
    const db = getDrizzleDb();
    const [row] = await db
      .insert(aiAuditEvents)
      .values({
        actorUserId: entry.actorUserId ?? null,
        provider: entry.provider ?? getTalentBridgeAiBackend(),
        model: entry.model ?? getTalentBridgeAiModel(),
        eventType: entry.eventType,
        payloadJson: entry.payload ?? null,
      })
      .returning({ id: aiAuditEvents.id });
    return row?.id ?? null;
  } catch (error) {
    console.warn("Unable to persist AI audit event", error);
    return null;
  }
}
