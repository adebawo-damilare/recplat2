import { test, expect } from "@playwright/test";

test.describe("Marketing shell / navigation", () => {
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

  test("talent route shows sign-in when logged out (board after auth)", async ({ page }) => {
    await page.goto("/talent", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
    await expect(page.getByText(/stored securely in Postgres/i)).toBeVisible();
    await expect(page.getByTestId("nav-find-candidates")).toBeVisible();
  });

  test("footer visible on home", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("app-footer")).toBeVisible();
    await expect(page.getByText("© 2026 TalentBridge Inc. All rights reserved.")).toBeVisible();
  });
});