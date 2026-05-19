import { eq } from "drizzle-orm";

import { getDrizzleDb } from "../db/postgres";
import { notificationDeliveryLog, users } from "../schema";

export type EmailDeliveryStatus = "sent" | "failed" | "skipped";

function emailEnabled(): boolean {
  return (
    process.env.TALENTBRIDGE_EMAIL_ENABLED === "1" &&
    Boolean(process.env.RESEND_API_KEY?.trim()) &&
    Boolean(process.env.TALENTBRIDGE_EMAIL_FROM?.trim())
  );
}

async function lookupUserEmail(userId: string): Promise<string | null> {
  const db = getDrizzleDb();
  const rows = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const email = rows[0]?.email?.trim();
  return email && email.includes("@") ? email : null;
}

async function recordEmailDelivery(
  notificationId: string,
  status: EmailDeliveryStatus,
  detail: string | null,
): Promise<void> {
  const db = getDrizzleDb();
  await db.insert(notificationDeliveryLog).values({
    notificationId,
    channel: "email",
    status,
    detail: detail ? detail.slice(0, 2000) : null,
  });
}

/**
 * Best-effort outbound email for a notification. Always writes a delivery-ledger row when
 * notificationId is set (sent, failed, or skipped).
 */
export async function deliverNotificationEmail(input: {
  notificationId: string;
  userId: string;
  title: string;
  body: string;
  linkPath?: string | null;
}): Promise<EmailDeliveryStatus> {
  if (!emailEnabled()) {
    await recordEmailDelivery(input.notificationId, "skipped", "email_disabled");
    return "skipped";
  }

  const to = await lookupUserEmail(input.userId);
  if (!to) {
    await recordEmailDelivery(input.notificationId, "skipped", "no_recipient_email");
    return "skipped";
  }

  const from = process.env.TALENTBRIDGE_EMAIL_FROM!.trim();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.TALENTBRIDGE_APP_URL || "").trim();
  const link = input.linkPath?.trim();
  const href = link && appUrl ? `${appUrl.replace(/\/$/, "")}${link.startsWith("/") ? link : `/${link}`}` : null;
  const textBody = [input.body, href ? `\n\nOpen: ${href}` : ""].join("").trim();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: input.title,
        text: textBody,
      }),
    });
    if (!res.ok) {
      const errText = (await res.text().catch(() => "")).slice(0, 500);
      await recordEmailDelivery(input.notificationId, "failed", `resend_${res.status}:${errText}`);
      return "failed";
    }
    await recordEmailDelivery(input.notificationId, "sent", null);
    return "sent";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await recordEmailDelivery(input.notificationId, "failed", message.slice(0, 500));
    return "failed";
  }
}
