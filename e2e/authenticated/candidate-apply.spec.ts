import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

import { test, expect } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, "..", ".auth", "seed.json");

test.describe("Candidate apply flow (authenticated)", () => {
  test("candidate can apply from job board", async ({ page }) => {
    test.setTimeout(90_000);

    await page.addInitScript(() => {
      (window as unknown as { __TALENTBRIDGE_E2E_NO_ALERTS?: boolean }).__TALENTBRIDGE_E2E_NO_ALERTS = true;
    });

    const seedRaw = await readFile(seedPath, "utf8");
    const seed = JSON.parse(seedRaw) as {
      jobBoardApplyVacancyId?: string;
      jobBoardApplyVacancyTitle?: string;
    };
    expect(seed.jobBoardApplyVacancyId).toBeTruthy();
    const vacancyId = seed.jobBoardApplyVacancyId!;
    const titlePattern = new RegExp(
      seed.jobBoardApplyVacancyTitle?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") ?? "E2E Job Board Apply",
    );

    await page.goto("/jobs", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("job-board")).toBeVisible({ timeout: 30_000 });

    const search = page.getByTestId("job-board-search");
    const jobsRefresh = page.waitForResponse(
      (r) => r.url().includes("/api/jobs") && r.request().method() === "GET" && r.ok(),
      { timeout: 45_000 },
    );
    await search.fill("E2E Job Board Apply");
    await jobsRefresh;
    await expect(page.getByTestId(`job-card-${vacancyId}`)).toBeVisible({ timeout: 60_000 });

    await page.goto(`/jobs/${vacancyId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("job-detail-page")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1, name: titlePattern })).toBeVisible();

    const sessionRes = await page.request.get("/api/auth/session");
    expect(sessionRes.ok(), await sessionRes.text()).toBeTruthy();
    const sessionBody = (await sessionRes.json()) as { user?: { role?: string } | null };
    expect(sessionBody.user?.role).toBe("candidate");

    const applyBtn = page.getByTestId("job-detail-apply");
    await expect(applyBtn).toBeVisible();
    await expect(applyBtn).toBeEnabled();

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
