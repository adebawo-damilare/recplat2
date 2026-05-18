import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

import { test, expect } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, "..", ".auth", "seed.json");

test.describe("Candidate apply flow (authenticated)", () => {
  test("candidate can apply from job board", async ({ page }) => {
    test.setTimeout(90_000);

    page.on("dialog", (dialog) => {
      void dialog.accept().catch(() => {
        // Worker teardown or parallel runs can close the page while accept() is in flight.
      });
    });

    const seedRaw = await readFile(seedPath, "utf8");
    const seed = JSON.parse(seedRaw) as { jobDetailVacancyId?: string; jobDetailVacancyTitle?: string };
    expect(seed.jobDetailVacancyId).toBeTruthy();

    await page.goto("/jobs", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("job-board")).toBeVisible({ timeout: 30_000 });

    // Paginated board may not show this run's vacancy on page 1; search narrows to the seeded job.
    const search = page.getByTestId("job-board-search");
    await search.fill("E2E Job Detail");
    const applyJobCard = page.getByTestId(`job-card-${seed.jobDetailVacancyId}`);
    await expect(applyJobCard).toBeVisible({ timeout: 60_000 });
    await applyJobCard.click();

    const applyBtn = page.getByTestId("apply-now-button");
    await expect(applyBtn).toBeVisible({ timeout: 30_000 });
    await expect(applyBtn).toBeEnabled({ timeout: 30_000 });

    const applyPost = page.waitForResponse(
      (r) =>
        r.url().includes("/api/applications") &&
        r.request().method() === "POST" &&
        !r.url().includes("/mine"),
      { timeout: 60_000 },
    );
    await applyBtn.click();
    const res = await applyPost;
    expect(res.ok(), await res.text()).toBeTruthy();

    await expect(applyBtn).toContainText(/Application Sent|Sending.../i, { timeout: 60_000 });
    await expect(page.getByTestId("application-sent-banner")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("application-sent-view-mine")).toBeVisible();
  });
});
