import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

import { test, expect } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, "..", ".auth", "seed.json");

test.describe("Candidate apply flow (authenticated)", () => {
  test.describe.configure({ mode: "serial" });

  test("candidate can apply from job board", async ({ page }) => {
    test.setTimeout(90_000);

    page.on("dialog", (dialog) => {
      void dialog.accept().catch(() => {});
    });

    const seedRaw = await readFile(seedPath, "utf8");
    const seed = JSON.parse(seedRaw) as { jobBoardApplyVacancyId?: string };
    expect(seed.jobBoardApplyVacancyId).toBeTruthy();

    await page.goto("/jobs", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("job-board")).toBeVisible({ timeout: 30_000 });

    const search = page.getByTestId("job-board-search");
    const jobsRefresh = page.waitForResponse(
      (r) => r.url().includes("/api/jobs") && r.request().method() === "GET" && r.ok(),
      { timeout: 45_000 },
    );
    await search.fill("E2E Job Board Apply");
    await jobsRefresh;

    const applyJobCard = page.getByTestId(`job-card-${seed.jobBoardApplyVacancyId}`);
    await expect(applyJobCard).toBeVisible({ timeout: 60_000 });
    await applyJobCard.click();
    await expect(page.getByRole("heading", { level: 2, name: /E2E Job Board Apply/ })).toBeVisible({
      timeout: 30_000,
    });

    const applyBtn = page.getByTestId("apply-now-button");
    await expect(applyBtn).toBeVisible({ timeout: 30_000 });
    await expect(applyBtn).toBeEnabled({ timeout: 30_000 });

    const applyPost = page.waitForResponse(
      (r) =>
        r.url().includes("/api/applications") &&
        r.request().method() === "POST" &&
        !r.url().includes("/mine"),
      { timeout: 60_000 },
    );
    await applyBtn.click();
    const res = await applyPost;
    expect(res.ok(), await res.text()).toBeTruthy();

    await expect(applyBtn).toContainText(/Application Sent|Sending/i, { timeout: 60_000 });
    await expect(page.getByTestId("application-sent-banner")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("application-sent-view-mine")).toBeVisible();
  });
});
