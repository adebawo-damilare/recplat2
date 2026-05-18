import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

import { test, expect } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, "..", ".auth", "seed.json");

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe("Recruiter screening flow (authenticated)", () => {
  test("invite → candidate submit → matrix row + CSV export", async ({ page, browser }) => {
    test.setTimeout(120_000);

    const seedRaw = await readFile(seedPath, "utf8");
    const seed = JSON.parse(seedRaw) as { screeningVacancyTitle?: string };
    const jobTitleFragment = seed.screeningVacancyTitle ?? "E2E Marketers Screening";
    const titlePattern = new RegExp(escapeRegExp(jobTitleFragment));

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/screenings/matrix") && r.request().method() === "GET",
        { timeout: 60_000 },
      ),
      page.goto("/dashboard/company", { waitUntil: "domcontentloaded" }),
    ]);
    await expect(page.getByTestId("recruiter-dashboard-page")).toBeVisible({ timeout: 30_000 });

    const pipelineRow = page
      .getByTestId("recruiter-pipeline-table")
      .locator("tbody tr")
      .filter({ hasText: titlePattern })
      .first();
    await expect(pipelineRow).toBeVisible({ timeout: 60_000 });
    await pipelineRow.getByRole("button", { name: "View profile" }).click();
    await expect(page.getByTestId("recruiter-pipeline-candidate-panel")).toBeVisible();

    const invitePromise = page.waitForResponse(
      (r) => r.url().includes("/api/screenings/invite") && r.request().method() === "POST",
      { timeout: 45_000 },
    );
    await page.getByTestId("recruiter-pipeline-invite-screening").click();
    const inviteRes = await invitePromise;
    expect(inviteRes.ok(), await inviteRes.text()).toBeTruthy();

    const candidateContext = await browser.newContext({
      storageState: path.join(__dirname, "..", ".auth", "candidate.json"),
    });
    const candidatePage = await candidateContext.newPage();

    await candidatePage.goto("/dashboard/screenings", { waitUntil: "domcontentloaded" });
    await expect(candidatePage.getByTestId("screenings-page")).toBeVisible({ timeout: 30_000 });

    const screeningLink = candidatePage
      .getByTestId(/^screening-row-/)
      .filter({ hasText: titlePattern })
      .first();
    await expect(screeningLink).toBeVisible({ timeout: 30_000 });
    await screeningLink.click();
    await expect(candidatePage.getByTestId("screening-detail-page")).toBeVisible();

    const questions = candidatePage.locator("[data-testid^='screening-question-']");
    const qCount = await questions.count();
    expect(qCount).toBeGreaterThan(0);
    for (let i = 0; i < qCount; i += 1) {
      await questions.nth(i).locator("textarea").fill(`E2E answer ${i + 1} for screening test.`);
    }

    const submitPromise = candidatePage.waitForResponse(
      (r) => r.url().includes("/submit") && r.request().method() === "POST",
      { timeout: 45_000 },
    );
    await candidatePage.getByTestId("screening-submit").click();
    const submitRes = await submitPromise;
    expect(submitRes.ok(), await submitRes.text()).toBeTruthy();
    await candidateContext.close();

    const matrixSection = page.getByTestId("recruiter-screening-matrix-section");
    await matrixSection.getByRole("button", { name: "Refresh" }).click();
    await expect(matrixSection).toBeVisible();
    const matrixRow = page
      .getByTestId("recruiter-screening-matrix-table")
      .locator("tbody tr")
      .filter({ hasText: /e2e-candidate-.*@example\.test/i })
      .first();
    await expect(matrixRow).toBeVisible({ timeout: 60_000 });
    await expect(matrixRow.getByText("Submitted")).toBeVisible();
    await expect(matrixRow.getByText(/E2E answer 1/)).toBeVisible();

    const exportBtn = page.getByTestId("recruiter-screening-matrix-export-csv");
    await expect(exportBtn).toBeEnabled();
    const downloadPromise = page.waitForEvent("download", { timeout: 15_000 });
    await exportBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/screening-marketers.*\.csv$/i);
  });
});
