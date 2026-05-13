import { test, expect } from "@playwright/test";

test.describe("Recruiter dashboard (authenticated)", () => {
  test("company route loads for signed-in recruiter", async ({ page }) => {
    await page.goto("/dashboard/company", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("recruiter-dashboard-page")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /Recruiter Dashboard/i })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: /Post Vacancy/i })).toBeVisible({ timeout: 30_000 });
  });
});
