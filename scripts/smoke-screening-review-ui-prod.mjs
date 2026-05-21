/**
 * Prod UI smoke (logged out): deployed review route responds.
 * Full score UI requires recruiter login in browser.
 */
import { chromium } from "@playwright/test";

const base = (process.env.SMOKE_BASE_URL ?? "https://recplat2.vercel.app").replace(/\/$/, "");
const invitationId = process.env.SMOKE_SCREENING_INVITATION_ID ?? "7e28dcd0-cef5-492b-b9c4-1c0c554a8845";

const browser = await chromium.launch();
const page = await browser.newPage();
try {
  await page.goto(`${base}/dashboard/screenings/${invitationId}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  const signIn = await page
    .getByTestId("sign-in-heading")
    .waitFor({ state: "visible", timeout: 45_000 })
    .then(() => true)
    .catch(() => false);
  const review = signIn
    ? false
    : await page
        .getByTestId("recruiter-screening-review")
        .waitFor({ state: "visible", timeout: 45_000 })
        .then(() => true)
        .catch(() => false);
  const loading = await page.getByTestId("talent-page-loading").isVisible().catch(() => false);
  const url = page.url();
  if (!signIn && !review) {
    const title = await page.title();
    throw new Error(
      `expected sign-in gate or review page; url=${url} title=${title} loading=${loading}`,
    );
  }
  console.log(
    JSON.stringify({
      url,
      signInGate: signIn,
      reviewVisible: review,
      note: signIn
        ? "log in as company recruiter, then re-open screening URL to score"
        : "review page visible (session already active in automation context)",
    }),
  );
  console.log("smoke-screening-review-ui-prod: ok");
} finally {
  await browser.close();
}
