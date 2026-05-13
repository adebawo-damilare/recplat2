import { test, expect } from "@playwright/test";

test.describe("Candidate job detail (authenticated)", () => {
  test("opens public job detail from board and can apply", async ({ page }) => {
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    await page.goto("/jobs", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("job-board")).toBeVisible({ timeout: 30_000 });

    const firstCard = page.locator("[data-testid^='job-card-']").first();
    await expect(firstCard).toBeVisible({ timeout: 30_000 });
    const tid = await firstCard.getAttribute("data-testid");
    expect(tid).toMatch(/^job-card-[0-9a-f-]{36}$/i);
    const vacancyId = tid!.slice("job-card-".length);

    await page.goto(`/jobs/${vacancyId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("job-detail-page")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("job-detail-apply")).toBeVisible();

    await page.getByTestId("job-detail-apply").click();
    await expect(page.getByTestId("job-detail-apply")).toContainText(/Application sent|Sending/i, { timeout: 30_000 });
  });
});
