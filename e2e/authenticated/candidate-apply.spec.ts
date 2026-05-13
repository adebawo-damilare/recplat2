import { test, expect } from "@playwright/test";

test.describe("Candidate apply flow (authenticated)", () => {
  test("candidate can apply from job board", async ({ page }) => {
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    await page.goto("/jobs", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("job-board")).toBeVisible({ timeout: 30_000 });

    const firstJobCard = page.locator("[data-testid^='job-card-']").first();
    await expect(firstJobCard).toBeVisible({ timeout: 30_000 });
    await firstJobCard.click();

    const applyBtn = page.getByTestId("apply-now-button");
    await expect(applyBtn).toBeVisible({ timeout: 30_000 });
    await applyBtn.click();

    await expect(applyBtn).toContainText(/Application Sent|Sending.../i, { timeout: 30_000 });
  });
});
