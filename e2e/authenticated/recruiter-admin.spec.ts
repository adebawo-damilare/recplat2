import { test, expect } from "@playwright/test";

test.describe("Platform admin cockpit (authenticated recruiter)", () => {
  test("shows summary and category governance for E2E allowlisted recruiter", async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto("/dashboard/company", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("recruiter-dashboard-page")).toBeVisible({ timeout: 30_000 });

    const sessionRes = await page.request.get("/api/auth/session");
    expect(sessionRes.ok()).toBeTruthy();
    const session = (await sessionRes.json()) as { user?: { canManageUserRoles?: boolean } };
    expect(session.user?.canManageUserRoles).toBe(true);

    const summaryRes = await page.request.get("/api/admin/summary");
    expect(summaryRes.ok(), await summaryRes.text()).toBeTruthy();
    const summaryBody = (await summaryRes.json()) as { summary?: { users?: number } };
    expect((summaryBody.summary?.users ?? 0) > 0).toBeTruthy();

    const categoriesRes = await page.request.get("/api/admin/categories");
    expect(categoriesRes.ok(), await categoriesRes.text()).toBeTruthy();
    const categoriesBody = (await categoriesRes.json()) as {
      categories?: { slug: string; isActive: boolean }[];
    };
    const designersRow = categoriesBody.categories?.find((c) => c.slug === "designers");
    expect(designersRow).toBeTruthy();
    const wasActive = designersRow?.isActive ?? true;
    const patchRes = await page.request.patch("/api/admin/categories/designers", {
      headers: { "content-type": "application/json" },
      data: { isActive: !wasActive },
    });
    expect(patchRes.ok(), await patchRes.text()).toBeTruthy();
    const patched = (await patchRes.json()) as { category?: { isActive?: boolean } };
    expect(patched.category?.isActive).toBe(!wasActive);

    await page.request.patch("/api/admin/categories/designers", {
      headers: { "content-type": "application/json" },
      data: { isActive: wasActive },
    });

    await expect(page.getByTestId("platform-admin-cockpit")).toBeVisible({ timeout: 15_000 });
  });
});
