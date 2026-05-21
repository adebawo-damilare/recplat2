import { test, expect } from "@playwright/test";

test.describe("Recruiter talent board", () => {
  test("talent page hydrates search q from URL query", async ({ page }) => {
    await page.goto("/talent?q=engineer", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("talent-board")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("talent-board-search")).toHaveValue("engineer", { timeout: 10_000 });
  });

  test("talent page hydrates page from URL query", async ({ page }) => {
    await page.goto("/talent", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("talent-board")).toBeVisible({ timeout: 30_000 });
    const totalLine = page.getByTestId("talent-board-total");
    const totalText = await totalLine.textContent({ timeout: 20_000 }).catch(() => "");
    const match = totalText?.match(/of (\d+)/);
    if (!match || Number(match[1]) <= 10) return;

    await page.goto("/talent?page=2", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/[?&]page=2/);
    await expect(page.getByText("Page 2")).toBeVisible({ timeout: 20_000 });
    await expect(totalLine).toContainText(/Showing 11/, { timeout: 20_000 });
  });
});
