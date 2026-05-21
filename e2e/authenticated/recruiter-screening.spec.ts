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
  test.describe.configure({ mode: "serial" });

  test("invite → candidate submit → matrix row + CSV export", async ({ page, browser }) => {
    test.setTimeout(180_000);

    const seedRaw = await readFile(seedPath, "utf8");
    const seed = JSON.parse(seedRaw) as {
      screeningVacancyTitle?: string;
      screeningApplicationId?: string;
    };
    const jobTitleFragment = seed.screeningVacancyTitle ?? "E2E Marketers Screening";
    const titlePattern = new RegExp(escapeRegExp(jobTitleFragment));
    expect(seed.screeningApplicationId).toBeTruthy();

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
    const panel = page.getByTestId("recruiter-pipeline-candidate-panel");
    await expect(panel).toBeVisible();

    const inviteBtn = page.getByTestId("recruiter-pipeline-invite-screening");
    let invitationId: string;

    if (await inviteBtn.isVisible()) {
      const invitePromise = page.waitForResponse(
        (r) => r.url().includes("/api/screenings/invite") && r.request().method() === "POST",
        { timeout: 45_000 },
      );
      await inviteBtn.click();
      const inviteRes = await invitePromise;
      expect(inviteRes.ok(), await inviteRes.text()).toBeTruthy();
      const inviteBody = (await inviteRes.json()) as { invitation?: { id: string } };
      invitationId = inviteBody.invitation?.id ?? "";
    } else {
      const inviteRes = await page.request.post("/api/screenings/invite", {
        data: { applicationId: seed.screeningApplicationId },
      });
      expect(inviteRes.ok(), await inviteRes.text()).toBeTruthy();
      const inviteBody = (await inviteRes.json()) as { invitation?: { id: string } };
      invitationId = inviteBody.invitation?.id ?? "";
    }
    expect(invitationId, "screening invitation id required").toBeTruthy();

    await panel.getByRole("button", { name: "Close", exact: true }).click();
    await expect(panel).toBeHidden({ timeout: 10_000 });

    const candidateContext = await browser.newContext({
      storageState: path.join(__dirname, "..", ".auth", "candidate.json"),
    });
    const candidatePage = await candidateContext.newPage();
    await candidatePage.addInitScript(() => {
      (window as unknown as { __TALENTBRIDGE_E2E_NO_ALERTS?: boolean }).__TALENTBRIDGE_E2E_NO_ALERTS = true;
    });

    const detailPromise = candidatePage.waitForResponse(
      (r) =>
        r.url().includes(`/api/screenings/${encodeURIComponent(invitationId)}`) &&
        r.request().method() === "GET",
      { timeout: 45_000 },
    );
    await candidatePage.goto(`/dashboard/screenings/${encodeURIComponent(invitationId)}`, {
      waitUntil: "domcontentloaded",
    });
    const detailRes = await detailPromise;
    expect(detailRes.ok(), await detailRes.text()).toBeTruthy();
    const detailJson = (await detailRes.json()) as {
      invitation?: { questions?: { id: string }[]; status?: string };
    };
    expect(
      detailJson.invitation?.questions?.length ?? 0,
      "marketers screening questions must exist (run db:apply through 0009+)",
    ).toBeGreaterThan(0);

    await expect(candidatePage.getByTestId("screening-detail-page")).toBeVisible({ timeout: 30_000 });

    if (detailJson.invitation?.status === "pending") {
      const questions = candidatePage.locator("[data-testid^='screening-question-']");
      await expect(questions.first()).toBeVisible({ timeout: 30_000 });
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
    }

    await candidateContext.close();

    const matrixSection = page.getByTestId("recruiter-screening-matrix-section");
    await matrixSection.scrollIntoViewIfNeeded();
    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/screenings/matrix") && r.request().method() === "GET",
        { timeout: 45_000 },
      ),
      matrixSection.getByRole("button", { name: "Refresh" }).click(),
    ]);

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

    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/api/screenings/${encodeURIComponent(invitationId)}`) &&
          r.request().method() === "GET" &&
          r.ok(),
        { timeout: 45_000 },
      ),
      page.goto(`/dashboard/screenings/${encodeURIComponent(invitationId)}`, {
        waitUntil: "domcontentloaded",
      }),
    ]);
    await expect(page.getByTestId("recruiter-screening-review")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/E2E answer 1/i)).toBeVisible({ timeout: 15_000 });

    const scoreButtons = page.locator("[data-testid^='recruiter-screening-score-'][data-testid$='-4']");
    const scoreCount = await scoreButtons.count();
    expect(scoreCount).toBeGreaterThan(0);
    for (let i = 0; i < scoreCount; i += 1) {
      await scoreButtons.nth(i).click();
    }

    await page.getByTestId("recruiter-screening-reviewer-note").fill("E2E recruiter overall note.");

    const reviewPatch = page.waitForResponse(
      (r) => r.url().includes("/review") && r.request().method() === "PATCH" && r.ok(),
      { timeout: 45_000 },
    );
    await page.getByTestId("recruiter-screening-save-scores").click();
    await reviewPatch;

    await expect(page.getByTestId("recruiter-screening-overall-score")).toContainText(/Overall 4 \/ 5/, {
      timeout: 15_000,
    });
    await expect(page.getByTestId("recruiter-screening-overall-score")).toContainText(/saved/i);

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/screenings/follow-up") && r.request().method() === "GET" && r.ok(),
        { timeout: 45_000 },
      ),
      page.goto("/dashboard/company", { waitUntil: "domcontentloaded" }),
    ]);
    const followUp = page.getByTestId("recruiter-screening-follow-up");
    await followUp.scrollIntoViewIfNeeded();
    const scoredRow = followUp
      .locator("li")
      .filter({ hasText: titlePattern })
      .filter({ has: page.getByTestId("recruiter-follow-up-score") });
    await expect(scoredRow.first()).toContainText(/Scored 4\/5/, { timeout: 30_000 });
  });
});
