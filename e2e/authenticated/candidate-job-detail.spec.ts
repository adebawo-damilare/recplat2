import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

import { test, expect } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, "..", ".auth", "seed.json");

test.describe("Candidate job detail (authenticated)", () => {
  test("public job detail loads and apply works from the UI", async ({ page }) => {
    test.setTimeout(90_000);

    await page.addInitScript(() => {
      (window as unknown as { __TALENTBRIDGE_E2E_NO_ALERTS?: boolean }).__TALENTBRIDGE_E2E_NO_ALERTS = true;
    });

    const seedRaw = await readFile(seedPath, "utf8");
    const seed = JSON.parse(seedRaw) as {
      jobDetailVacancyId?: string;
      jobDetailVacancyTitle?: string;
    };
    expect(seed.jobDetailVacancyId).toBeTruthy();
    const vacancyId = seed.jobDetailVacancyId!;
    const titlePattern = new RegExp(
      seed.jobDetailVacancyTitle?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") ?? "E2E Job Detail",
    );

    await page.goto(`/jobs/${vacancyId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("job-detail-page")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1, name: titlePattern })).toBeVisible();
    const applyBtn = page.getByTestId("job-detail-apply");
    await expect(applyBtn).toBeVisible();
    await expect(applyBtn).toBeEnabled();

    const sessionRes = await page.request.get("/api/auth/session");
    expect(sessionRes.ok(), await sessionRes.text()).toBeTruthy();
    const sessionBody = (await sessionRes.json()) as { user?: { role?: string } | null };
    expect(sessionBody.user?.role).toBe("candidate");

    const applyPost = page.waitForResponse(
      (r) =>
        r.url().includes("/api/applications") &&
        r.request().method() === "POST" &&
        !r.url().includes("/mine"),
      { timeout: 60_000 },
    );
    await applyBtn.click();
    const res = await applyPost;
    expect(res.status(), await res.text()).toBe(200);

    await expect(applyBtn).toContainText(/Application sent|Sending/i, { timeout: 15_000 });
  });
});
