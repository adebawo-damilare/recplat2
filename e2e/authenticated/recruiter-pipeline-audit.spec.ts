import { test, expect } from "@playwright/test";

import { resetPipelineApplicationToApplied } from "../helpers/pipelineSeed";

test.describe("Recruiter pipeline audit (authenticated)", () => {
  test("adds note and records status change in pipeline history", async ({ page }) => {
    test.setTimeout(120_000);

    await resetPipelineApplicationToApplied(page.request);

    const noteText = `E2E pipeline note ${Date.now()}`;

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/applications/board") && r.request().method() === "GET" && r.ok(),
        { timeout: 60_000 },
      ),
      page.goto("/dashboard/company", { waitUntil: "domcontentloaded" }),
    ]);
    await expect(page.getByTestId("recruiter-dashboard-page")).toBeVisible({ timeout: 30_000 });

    const row = page.locator("tbody tr").filter({ hasText: /E2E Candidate Apply/ });
    await expect(row).toBeVisible({ timeout: 60_000 });
    await row.getByRole("button", { name: /E2E Candidate Apply|View profile/i }).first().click();
    await expect(page.getByTestId("recruiter-pipeline-candidate-panel")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("recruiter-pipeline-audit")).toBeVisible();

    const noteResPromise = page.waitForResponse(
      (r) => r.url().includes("/api/applications/") && r.url().includes("/notes") && r.request().method() === "POST",
      { timeout: 45_000 },
    );
    await page.getByTestId("recruiter-pipeline-note-input").fill(noteText);
    await page.getByTestId("recruiter-pipeline-note-submit").click();
    const noteRes = await noteResPromise;
    expect(noteRes.ok(), await noteRes.text()).toBeTruthy();

    await expect(page.getByTestId("recruiter-pipeline-audit")).toContainText(noteText, {
      timeout: 15_000,
    });

    await page.getByLabel("Close candidate profile").click();
    const statusSelect = row.locator("select").last();
    const patchPromise = page.waitForResponse(
      (r) => r.request().method() === "PATCH" && r.url().includes("/api/applications/"),
      { timeout: 45_000 },
    );
    await statusSelect.selectOption("viewed");
    const patchRes = await patchPromise;
    expect(patchRes.ok(), await patchRes.text()).toBeTruthy();

    await row.getByRole("button", { name: /E2E Candidate Apply|View profile/i }).first().click();
    await expect(page.getByTestId("recruiter-pipeline-audit")).toContainText(/Under review/i, {
      timeout: 15_000,
    });

    await resetPipelineApplicationToApplied(page.request);
  });
});
