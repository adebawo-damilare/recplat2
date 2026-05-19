import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

import { test, expect } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, "..", ".auth", "seed.json");

test.describe("Notification email delivery ledger (authenticated)", () => {
  test("screening invite records in_app and email delivery on candidate notification", async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000);

    const seed = JSON.parse(await readFile(seedPath, "utf8")) as {
      screeningApplicationId?: string;
    };
    expect(seed.screeningApplicationId).toBeTruthy();

    const inviteRes = await page.request.post("/api/screenings/invite", {
      headers: { "content-type": "application/json" },
      data: { applicationId: seed.screeningApplicationId },
    });
    expect(inviteRes.ok(), await inviteRes.text()).toBeTruthy();

    const candidateContext = await browser.newContext({
      storageState: "e2e/.auth/candidate.json",
    });
    const candidatePage = await candidateContext.newPage();
    const notifRes = await candidatePage.request.get("/api/notifications/mine?includeDelivery=1");
    expect(notifRes.ok(), await notifRes.text()).toBeTruthy();
    const body = (await notifRes.json()) as {
      notifications?: { delivery?: { channel: string; status: string }[] }[];
    };
    const withEmail = body.notifications?.find((n) =>
      n.delivery?.some((d) => d.channel === "email" && d.status === "sent"),
    );
    expect(withEmail, "expected email delivery ledger row (e2e_fake)").toBeTruthy();
  });
});
