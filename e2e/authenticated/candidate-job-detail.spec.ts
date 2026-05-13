import { test, expect } from "@playwright/test";

test.describe("Candidate job detail (authenticated)", () => {
  test("public job detail loads for seeded vacancy and apply API succeeds", async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto("/jobs", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("job-board")).toBeVisible({ timeout: 30_000 });

    const detailCard = page.locator("[data-testid^='job-card-']").filter({ hasText: /E2E Job Detail/ }).first();
    await expect(detailCard).toBeVisible({ timeout: 30_000 });
    const tid = await detailCard.getAttribute("data-testid");
    expect(tid).toMatch(/^job-card-[0-9a-f-]{36}$/i);
    const vacancyId = tid!.slice("job-card-".length);

    await page.goto(`/jobs/${vacancyId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("job-detail-page")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1, name: /E2E Job Detail/ })).toBeVisible();
    await expect(page.getByTestId("job-detail-apply")).toBeVisible();

    const sessionRes = await page.request.get("/api/auth/session");
    expect(sessionRes.ok(), await sessionRes.text()).toBeTruthy();
    const sessionBody = (await sessionRes.json()) as { user?: { role?: string } | null };
    expect(sessionBody.user?.role).toBe("candidate");

    const applyRes = await page.request.post("/api/applications", {
      data: { vacancyId },
    });
    expect(applyRes.ok(), await applyRes.text()).toBeTruthy();
  });
});
