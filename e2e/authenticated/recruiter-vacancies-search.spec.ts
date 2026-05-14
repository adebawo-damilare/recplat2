import { test, expect } from "@playwright/test";

test.describe("Recruiter Your Vacancies search (authenticated)", () => {
  test("filters vacancy rows by search query", async ({ page }) => {
    test.setTimeout(90_000);

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/jobs/mine") && r.request().method() === "GET" && r.ok(),
        { timeout: 90_000 },
      ),
      page.goto("/dashboard/company", { waitUntil: "domcontentloaded" }),
    ]);

    const root = page.getByTestId("recruiter-dashboard-page");
    await expect(root).toBeVisible({ timeout: 30_000 });

    const applyHeading = root.getByRole("heading", { level: 4, name: /E2E Candidate Apply/ });
    const detailHeading = root.getByRole("heading", { level: 4, name: /E2E Job Detail/ });
    await expect(applyHeading).toBeVisible({ timeout: 45_000 });
    await expect(detailHeading).toBeVisible();

    const search = page.getByTestId("recruiter-vacancies-search");
    await search.fill("E2E Job Detail");
    await expect(detailHeading).toBeVisible();
    await expect(applyHeading).toBeHidden();

    await search.fill("");
    await expect(applyHeading).toBeVisible();
    await expect(detailHeading).toBeVisible();

    await search.fill("__no_such_vacancy_query__");
    await expect(page.getByText("No vacancies match your search.")).toBeVisible();
    await expect(applyHeading).toBeHidden();
    await expect(detailHeading).toBeHidden();
  });
});
