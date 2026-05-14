import { test, expect } from "@playwright/test";

test.describe("Candidate my applications (authenticated)", () => {
  test("applications page loads for signed-in candidate", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/dashboard/applications", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("my-applications-page")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "My applications", exact: true })).toBeVisible({
      timeout: 90_000,
    });
    await expect(page.getByTestId("my-applications-list")).toBeVisible({ timeout: 60_000 });
  });
});
