import { test, expect } from "@playwright/test";

test.describe("Candidate dashboard (authenticated)", () => {
  test("profile route loads for signed-in candidate", async ({ page }) => {
    await page.goto("/dashboard/profile", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("candidate-profile-dashboard")).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText(/Loading your profile|No Profile Found|Create Profile|Your Applications/i).first(),
    ).toBeVisible({ timeout: 30_000 });
  });
});
