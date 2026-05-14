import { test, expect } from "@playwright/test";

test.describe("Recruiter post vacancy (authenticated)", () => {
  test("creates a vacancy from the dashboard modal (happy path)", async ({ page }) => {
    test.setTimeout(90_000);

    const uniqueTitle = `E2E UI Post ${Date.now()}`;

    const mineLoaded = page.waitForResponse(
      (r) => r.url().includes("/api/jobs/mine") && r.request().method() === "GET" && r.ok(),
      { timeout: 45_000 },
    );
    await page.goto("/dashboard/company", { waitUntil: "domcontentloaded" });
    await mineLoaded;

    await expect(page.getByTestId("recruiter-dashboard-page")).toBeVisible({ timeout: 30_000 });

    await page.getByTestId("recruiter-post-vacancy-open").click();
    await expect(page.getByRole("heading", { name: "Post New Vacancy" })).toBeVisible();

    const form = page.locator("form").filter({
      has: page.getByPlaceholder("Describe the role and day-to-day responsibilities"),
    });

    await expect(form.locator("#vacancy-category")).toBeVisible();
    await expect(form.locator("#vacancy-category option[value='designers']")).toBeAttached({
      timeout: 20_000,
    });
    await form.locator("#vacancy-category").selectOption("designers");
    await form.locator("select").nth(1).selectOption("remote");

    await form.getByPlaceholder("e.g. Senior Frontend Engineer").fill(uniqueTitle);
    await form.getByPlaceholder("e.g. TechFlow Systems").fill("E2E Posted Co");
    await form.getByPlaceholder("e.g. Remote / London, UK").fill("Remote");
    await form.getByPlaceholder("e.g. $120k - $150k").fill("$130k-$150k");
    await form.getByPlaceholder("Describe the role and day-to-day responsibilities").fill("E2E posted role body.");
    await form.getByPlaceholder("List required skills, experience, and qualifications").fill("E2E requirements line.");

    const postResPromise = page.waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        r.url().includes("/api/jobs") &&
        !r.url().includes("/mine"),
      { timeout: 45_000 },
    );
    await form.getByRole("button", { name: /^Post Vacancy$/ }).click();
    const postRes = await postResPromise;
    expect(postRes.ok(), await postRes.text()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "Post New Vacancy" })).toBeHidden({ timeout: 30_000 });

    await expect(
      page.getByTestId("recruiter-dashboard-page").getByRole("heading", { level: 4, name: uniqueTitle }),
    ).toBeVisible({ timeout: 30_000 });
  });
});
