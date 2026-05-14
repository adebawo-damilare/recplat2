import { test, expect } from "@playwright/test";

test.describe("Candidate dashboard (authenticated)", () => {
  test("profile route loads for signed-in candidate", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/dashboard/profile", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("candidate-profile-dashboard")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Candidate Dashboard", level: 2 })).toBeVisible({
      timeout: 90_000,
    });
  });
});
