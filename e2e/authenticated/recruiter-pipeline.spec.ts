import { test, expect } from "@playwright/test";

test.describe("Recruiter application pipeline (authenticated)", () => {
  test("shows seeded application and PATCH status from pipeline table", async ({ page }) => {
    test.setTimeout(90_000);

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/applications/board") && r.request().method() === "GET" && r.ok(),
        { timeout: 60_000 },
      ),
      page.goto("/dashboard/company", { waitUntil: "domcontentloaded" }),
    ]);
    await expect(page.getByTestId("recruiter-dashboard-page")).toBeVisible({ timeout: 30_000 });

    await expect(page.getByRole("heading", { name: "Application pipeline" })).toBeVisible();

    const row = page.locator("tbody tr").filter({ hasText: /E2E Candidate Apply/ });
    await expect(row).toBeVisible({ timeout: 60_000 });
    await expect(row.getByText(/e2e-candidate-.*@example\.test/)).toBeVisible();

    const statusSelect = row.locator("select").last();
    await expect(statusSelect).toHaveValue("applied");

    const patchPromise = page.waitForResponse(
      (res) => res.request().method() === "PATCH" && res.url().includes("/api/applications/"),
      { timeout: 45_000 },
    );
    await statusSelect.selectOption("interviewing");
    const patchRes = await patchPromise;
    expect(patchRes.ok(), await patchRes.text()).toBeTruthy();
    const patchBody = (await patchRes.json()) as { status?: string };
    expect(patchBody.status).toBe("interviewing");

    const statusAfter = page.locator("tbody tr").filter({ hasText: /E2E Candidate Apply/ }).locator("select").last();
    await expect(statusAfter).toHaveValue("interviewing", { timeout: 45_000 });
  });

  test("pipeline status filter hides non-matching rows", async ({ page }) => {
    test.setTimeout(90_000);

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/applications/board") && r.request().method() === "GET" && r.ok(),
        { timeout: 60_000 },
      ),
      page.goto("/dashboard/company", { waitUntil: "domcontentloaded" }),
    ]);
    await expect(page.getByTestId("recruiter-pipeline-section")).toBeVisible({ timeout: 30_000 });

    const row = page.locator("tbody tr").filter({ hasText: /E2E Candidate Apply/ });
    await expect(row).toBeVisible({ timeout: 60_000 });

    const statusFilter = page.getByTestId("recruiter-pipeline-status-filter");
    const stageSelect = row.locator("select").last();
    await stageSelect.selectOption("applied");
    await statusFilter.selectOption("applied");
    await expect(row).toBeVisible({ timeout: 30_000 });

    await statusFilter.selectOption("rejected");
    await expect(row).toHaveCount(0, { timeout: 30_000 });

    await page.getByTestId("recruiter-pipeline-clear-filters").click();
    await expect(statusFilter).toHaveValue("");
    await expect(row).toBeVisible({ timeout: 30_000 });

    const pipelineTable = page.getByTestId("recruiter-pipeline-table");
    const visibleRows = pipelineTable.locator("tbody tr");
    const total = await visibleRows.count();
    expect(total).toBeGreaterThanOrEqual(1);
    await expect(page.getByTestId("recruiter-pipeline-count")).toHaveText(
      total === 1 ? "1 application" : `${total} applications`,
    );
  });

  test("pipeline candidate name opens profile side panel", async ({ page }) => {
    test.setTimeout(90_000);

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/applications/board") && r.request().method() === "GET" && r.ok(),
        { timeout: 60_000 },
      ),
      page.goto("/dashboard/company", { waitUntil: "domcontentloaded" }),
    ]);
    await expect(page.getByTestId("recruiter-pipeline-section")).toBeVisible({ timeout: 30_000 });

    const row = page.locator("tbody tr").filter({ hasText: /E2E Candidate Apply/ });
    await expect(row).toBeVisible({ timeout: 60_000 });
    await row.getByRole("button", { name: /E2E Candidate Apply|View profile/i }).first().click();
    await expect(page.getByTestId("recruiter-pipeline-candidate-panel")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("recruiter-pipeline-candidate-panel")).toContainText(/E2E Candidate Apply/i);
  });
});
