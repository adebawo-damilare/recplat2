import { test, expect } from "@playwright/test";

test.describe("Recruiter vacancies (authenticated)", () => {
  test("lists seeded E2E vacancies from auth setup", async ({ page }) => {
    await page.goto("/dashboard/company", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("recruiter-dashboard-page")).toBeVisible({ timeout: 30_000 });

    await expect(page.getByRole("heading", { name: "Your Vacancies" })).toBeVisible();
    const root = page.getByTestId("recruiter-dashboard-page");
    await expect(root.getByRole("heading", { level: 4, name: /E2E Candidate Apply/ })).toBeVisible({ timeout: 30_000 });
    await expect(root.getByRole("heading", { level: 4, name: /E2E Job Detail/ })).toBeVisible();
  });
});
