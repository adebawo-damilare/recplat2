import { test, expect } from "@playwright/test";

test.describe("Candidate dashboard (authenticated)", () => {
  test("profile route loads for signed-in candidate", async ({ page }) => {
    await page.goto("/dashboard/profile", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("candidate-profile-dashboard")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Candidate Dashboard" })).toBeVisible({ timeout: 30_000 });
  });
});
