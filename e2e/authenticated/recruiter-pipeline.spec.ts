import { test, expect } from "@playwright/test";

test.describe("Recruiter application pipeline (authenticated)", () => {
  test("shows seeded application and PATCH status from pipeline table", async ({ page }) => {
    test.setTimeout(90_000);

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/applications/board") && r.request().method() === "GET" && r.ok(),
        { timeout: 60_000 },
      ),
      page.goto("/dashboard/company", { waitUntil: "domcontentloaded" }),
    ]);
    await expect(page.getByTestId("recruiter-dashboard-page")).toBeVisible({ timeout: 30_000 });

    await expect(page.getByRole("heading", { name: "Application pipeline" })).toBeVisible();

    const row = page.locator("tbody tr").filter({ hasText: /E2E Candidate Apply/ });
    await expect(row).toBeVisible({ timeout: 60_000 });
    await expect(row.getByText(/e2e-candidate-.*@example\.test/)).toBeVisible();

    const statusSelect = row.locator("select").last();
    await expect(statusSelect).toHaveValue("applied");

    const patchPromise = page.waitForResponse(
      (res) => res.request().method() === "PATCH" && res.url().includes("/api/applications/"),
      { timeout: 45_000 },
    );
    await statusSelect.selectOption("interviewing");
    const patchRes = await patchPromise;
    expect(patchRes.ok(), await patchRes.text()).toBeTruthy();
    const patchBody = (await patchRes.json()) as { status?: string };
    expect(patchBody.status).toBe("interviewing");

    const statusAfter = page.locator("tbody tr").filter({ hasText: /E2E Candidate Apply/ }).locator("select").last();
    await expect(statusAfter).toHaveValue("interviewing", { timeout: 45_000 });
  });
});
