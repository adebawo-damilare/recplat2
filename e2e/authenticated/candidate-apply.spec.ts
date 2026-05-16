import { test, expect } from "@playwright/test";

test.describe("Candidate apply flow (authenticated)", () => {
  test("candidate can apply from job board", async ({ page }) => {
    test.setTimeout(90_000);

    page.on("dialog", (dialog) => {
      void dialog.accept().catch(() => {
        // Worker teardown or parallel runs can close the page while accept() is in flight.
      });
    });

    await page.goto("/jobs", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("job-board")).toBeVisible({ timeout: 30_000 });

    // Auth setup applies to "E2E Candidate Apply"; use the other seeded vacancy for a fresh apply click.
    const applyJobCard = page.locator("[data-testid^='job-card-']").filter({ hasText: /E2E Job Detail/ }).first();
    await expect(applyJobCard).toBeVisible({ timeout: 60_000 });
    await applyJobCard.click();

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

    await expect(applyBtn).toContainText(/Application Sent|Sending.../i, { timeout: 60_000 });
    await expect(page.getByTestId("application-sent-banner")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("application-sent-view-mine")).toBeVisible();
  });
});
