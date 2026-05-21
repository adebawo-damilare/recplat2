/**
 * Prod UI smoke: recruiter login → review page shows saved scores after reload.
 *
 * Usage:
 *   dotenv -o -e .env.release -- node scripts/smoke-screening-review-ui-prod.mjs
 *
 * Requires SMOKE_RECRUITER_EMAIL, SMOKE_RECRUITER_PASSWORD in .env.release
 */
import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, ".env.release") });

const base = (process.env.SMOKE_BASE_URL ?? "https://recplat2.vercel.app").replace(/\/$/, "");
const invitationId = process.env.SMOKE_SCREENING_INVITATION_ID ?? "7e28dcd0-cef5-492b-b9c4-1c0c554a8845";
const email = process.env.SMOKE_RECRUITER_EMAIL?.trim();
const password = process.env.SMOKE_RECRUITER_PASSWORD?.trim();

if (!email || !password) {
  console.error("SMOKE_RECRUITER_EMAIL and SMOKE_RECRUITER_PASSWORD required in .env.release");
  process.exit(1);
}

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

try {
  await page.goto(`${base}/sign-in`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByTestId("sign-in-heading").waitFor({ state: "visible", timeout: 30_000 });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes("/sign-in"), { timeout: 45_000 }),
    page.getByRole("button", { name: /^Sign In$/i }).click(),
  ]);

  const reviewUrl = `${base}/dashboard/screenings/${invitationId}`;
  await page.goto(reviewUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByTestId("recruiter-screening-review").waitFor({ state: "visible", timeout: 45_000 });
  await page.getByTestId("recruiter-screening-overall-score").waitFor({ state: "visible", timeout: 20_000 });
  const overallText = await page.getByTestId("recruiter-screening-overall-score").textContent();
  if (!overallText?.includes("saved")) {
    throw new Error(`expected saved overall score on review page, got: ${overallText}`);
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByTestId("recruiter-screening-review").waitFor({ state: "visible", timeout: 45_000 });
  const afterReload = await page.getByTestId("recruiter-screening-overall-score").textContent();
  if (!afterReload?.match(/Overall\s+4\s+\/\s+5/i) || !afterReload.includes("saved")) {
    throw new Error(`scores did not persist after refresh: ${afterReload}`);
  }

  const score4Selected = page.locator("[data-testid$='-4'].bg-neutral-900");
  const selectedCount = await score4Selected.count();
  if (selectedCount < 4) {
    throw new Error(`expected 4 questions scored 4 in UI, saw ${selectedCount} selected buttons`);
  }

  console.log(
    JSON.stringify({
      reviewUrl,
      overallAfterReload: afterReload?.trim(),
      selectedScoreButtons: selectedCount,
    }),
  );
  console.log("smoke-screening-review-ui-prod: ok");
} finally {
  await browser.close();
}
