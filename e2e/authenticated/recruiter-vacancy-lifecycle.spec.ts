import { test, expect } from "@playwright/test";

test.describe("Recruiter vacancy lifecycle (authenticated)", () => {
  test("updates a seeded vacancy from Edit Vacancy modal", async ({ page }) => {
    test.setTimeout(90_000);

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/jobs/mine") && r.request().method() === "GET" && r.ok(),
        { timeout: 90_000 },
      ),
      page.goto("/dashboard/company", { waitUntil: "domcontentloaded" }),
    ]);

    await expect(page.getByTestId("recruiter-dashboard-page")).toBeVisible({ timeout: 30_000 });

    const root = page.getByTestId("recruiter-dashboard-page");
    const jobHeading = root.getByRole("heading", { level: 4, name: /E2E Job Detail/ });
    await expect(jobHeading).toBeVisible({ timeout: 30_000 });
    const card = jobHeading.locator("..").locator("..").locator("..");

    await card.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { name: "Edit Vacancy" })).toBeVisible();

    const form = page.locator("form").filter({
      has: page.getByRole("button", { name: "Update Vacancy" }),
    });

    const titleInput = form.getByPlaceholder("e.g. Senior Frontend Engineer");
    await expect(titleInput).not.toHaveValue("");
    const before = await titleInput.inputValue();
    const nextTitle = `${before} — E2E saved`;
    await titleInput.fill(nextTitle);

    const patchPromise = page.waitForResponse(
      (r) =>
        r.request().method() === "PATCH" &&
        r.url().includes("/api/jobs/") &&
        !r.url().includes("/mine"),
      { timeout: 45_000 },
    );
    await form.getByRole("button", { name: "Update Vacancy" }).click();
    const patchRes = await patchPromise;
    expect(patchRes.ok(), await patchRes.text()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "Edit Vacancy" })).toBeHidden({ timeout: 30_000 });
    await expect(root.getByRole("heading", { level: 4, name: nextTitle })).toBeVisible({ timeout: 30_000 });
  });

  test("closes a disposable vacancy after confirm()", async ({ page }) => {
    test.setTimeout(90_000);

    const title = `E2E Close ${Date.now()}`;
    const createRes = await page.request.post("/api/jobs", {
      headers: { "content-type": "application/json" },
      data: {
        jobTitle: title,
        companyName: "E2E Labs",
        location: "Remote",
        salary: "$100k-$120k",
        description: "Disposable row for close-vacancy E2E.",
        requirements: "Playwright",
        categorySlug: "designers",
        jobType: "remote",
      },
    });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/jobs/mine") && r.request().method() === "GET" && r.ok(),
        { timeout: 90_000 },
      ),
      page.goto("/dashboard/company", { waitUntil: "domcontentloaded" }),
    ]);

    const root = page.getByTestId("recruiter-dashboard-page");
    await expect(root).toBeVisible({ timeout: 30_000 });

    const jobHeading = root.getByRole("heading", { level: 4, name: title });
    await expect(jobHeading).toBeVisible({ timeout: 30_000 });
    const card = jobHeading.locator("..").locator("..").locator("..");

    const patchPromise = page.waitForResponse(
      (r) =>
        r.request().method() === "PATCH" &&
        r.url().includes("/api/jobs/") &&
        !r.url().includes("/mine"),
      { timeout: 45_000 },
    );
    await card.getByRole("button", { name: /Close Vacancy/i }).click();
    await expect(page.getByTestId("app-alert")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("app-alert")).toContainText(/close this vacancy/i);
    await page.getByTestId("app-alert-confirm").click();
    const patchRes = await patchPromise;
    expect(patchRes.ok(), await patchRes.text()).toBeTruthy();

    await expect(card.getByText("closed", { exact: true })).toBeVisible({ timeout: 15_000 });
  });
});
