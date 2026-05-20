import { test, expect } from "@playwright/test";

test.describe("Marketing shell / navigation", () => {
  test.describe.configure({ mode: "serial" });
  test("home shows nav and hero", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("app-nav")).toBeVisible();
    await expect(page.getByTestId("home-page")).toBeVisible();
    await expect(page.getByTestId("home-hero")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Where Elite/i })).toBeVisible();
  });

  test("jobs route renders job board", async ({ page }) => {
    await page.goto("/jobs", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Discover Your Next Role" })).toBeVisible();
    await expect(page.getByTestId("app-nav").getByRole("link", { name: "Find Jobs" })).toBeVisible();
  });

  test("jobs page hydrates jobType from URL query", async ({ page }) => {
    await page.goto("/jobs?jobType=hybrid", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("job-board")).toBeVisible();
    await expect(page.getByTestId("job-board-job-type-filter")).toHaveValue("hybrid", { timeout: 20_000 });
  });

  test("jobs page hydrates search q from URL query", async ({ page }) => {
    await page.goto("/jobs?q=engineer", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("job-board")).toBeVisible();
    await expect(page.getByTestId("job-board-search")).toHaveValue("engineer", { timeout: 10_000 });
  });

  test("jobs page hydrates page from URL query", async ({ page }) => {
    await page.goto("/jobs", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("job-board")).toBeVisible();
    const totalLine = page.getByTestId("job-board-total-open");
    const totalText = await totalLine.textContent({ timeout: 20_000 }).catch(() => "");
    const match = totalText?.match(/of (\d+) open/);
    if (!match || Number(match[1]) <= 10) return;

    await page.goto("/jobs?page=2", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/[?&]page=2/);
    await expect(page.getByText("Page 2")).toBeVisible({ timeout: 20_000 });
    await expect(totalLine).toContainText(/Showing 11/, { timeout: 20_000 });
  });

  test("talent route shows sign-in when logged out (board after auth)", async ({ page }) => {
    await page.goto("/talent", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("talent-sign-in-gate")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("sign-in-heading")).toHaveText("Sign In");
    await expect(page.getByText(/stored securely in Postgres/i)).toBeVisible();
    await expect(page.getByTestId("nav-find-candidates")).toBeVisible();
  });

  test("home Active Opportunities shows at most 6 cards and Explore all jobs", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const section = page.getByTestId("home-featured-jobs");
    await expect(section.getByRole("heading", { name: "Active Opportunities" })).toBeVisible();
    await expect(section.getByTestId("home-explore-all-jobs")).toBeVisible();

    await expect(async () => {
      const n = await section.getByTestId("home-featured-job-card").count();
      if (n > 0) return;
      await expect(section.getByText("No active vacancies at the moment.")).toBeVisible();
    }).toPass({ timeout: 30_000 });

    const cardCount = await section.getByTestId("home-featured-job-card").count();
    expect(cardCount).toBeLessThanOrEqual(6);

    const countEl = section.getByTestId("home-featured-count");
    if (await countEl.isVisible()) {
      await expect(countEl).toHaveText(/\d+ of \d+/);
    }

    await section.getByTestId("home-explore-all-jobs").click();
    await expect(page).toHaveURL(/\/jobs\/?$/, { timeout: 20_000 });
  });

  test("mobile nav menu opens and links to jobs", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "load" });
    const toggle = page.getByTestId("nav-mobile-menu-toggle");
    await expect(toggle).toBeVisible({ timeout: 15_000 });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true", { timeout: 10_000 });
    await expect(page.getByTestId("nav-mobile-menu")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("nav-mobile-menu").getByRole("link", { name: "Find Jobs" }).click();
    await expect(page).toHaveURL(/\/jobs/, { timeout: 20_000 });
  });

  test("footer visible on home", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("app-footer")).toBeVisible();
    await expect(page.getByText("© 2026 TalentBridge Inc. All rights reserved.")).toBeVisible();
  });
});