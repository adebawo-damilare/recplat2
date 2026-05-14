import { test, expect } from "@playwright/test";

test.describe("Recruiter vacancies (authenticated)", () => {
  test("lists seeded E2E vacancies from auth setup", async ({ page }) => {
    test.setTimeout(90_000);

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/jobs/mine") && r.request().method() === "GET" && r.ok(),
        { timeout: 90_000 },
      ),
      page.goto("/dashboard/company", { waitUntil: "domcontentloaded" }),
    ]);

    await expect(page.getByTestId("recruiter-dashboard-page")).toBeVisible({ timeout: 30_000 });

    await expect(page.getByRole("heading", { name: "Your Vacancies" })).toBeVisible();
    const root = page.getByTestId("recruiter-dashboard-page");
    await expect(root.getByRole("heading", { level: 4, name: /E2E Candidate Apply/ })).toBeVisible({ timeout: 45_000 });
    await expect(root.getByRole("heading", { level: 4, name: /E2E Job Detail/ })).toBeVisible();
  });
});
