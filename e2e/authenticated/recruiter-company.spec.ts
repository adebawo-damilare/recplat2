import { test, expect } from "@playwright/test";

const password = "E2eTestUser!23456";

test.describe("Recruiter company workspace (authenticated)", () => {
  test("creates company, invites teammate, and posts vacancy under companyId", async ({ page, request }) => {
    test.setTimeout(180_000);

    const companyName = `E2E Workspace ${Date.now()}`;
    const teammateEmail = `e2e-teammate-${Date.now()}@example.test`;
    const vacancyTitle = `E2E Company Vacancy ${Date.now()}`;

    await page.goto("/dashboard/company", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("recruiter-dashboard-page")).toBeVisible({ timeout: 30_000 });

    const createRes = await page.request.post("/api/companies", {
      headers: { "content-type": "application/json" },
      data: { name: companyName },
    });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
    const createBody = (await createRes.json()) as { company?: { id?: string } };
    const companyId = createBody.company?.id;
    expect(companyId).toBeTruthy();

    const mineRes = await page.request.get("/api/companies/mine");
    expect(mineRes.ok(), await mineRes.text()).toBeTruthy();
    const mine = (await mineRes.json()) as { companies?: { id?: string }[] };
    expect(mine.companies?.some((c) => c.id === companyId)).toBeTruthy();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("recruiter-company-workspace")).toBeVisible();
    await expect(page.getByTestId("recruiter-company-select")).toContainText(companyName, {
      timeout: 15_000,
    });
    await page.getByTestId("recruiter-company-select").selectOption(companyId!);
    await expect(page.getByTestId("recruiter-company-select")).toHaveValue(companyId!, {
      timeout: 15_000,
    });
    await expect(page.getByTestId("recruiter-company-invite-email")).toBeVisible({
      timeout: 15_000,
    });

    const registerRes = await request.post("/api/auth/register", {
      headers: { "content-type": "application/json" },
      data: { email: teammateEmail, password, role: "recruiter" },
    });
    expect(registerRes.ok(), await registerRes.text()).toBeTruthy();

    const inviteResPromise = page.waitForResponse(
      (r) =>
        r.url().includes(`/api/companies/${companyId}/members`) && r.request().method() === "POST",
      { timeout: 60_000 },
    );
    await page.getByTestId("recruiter-company-invite-email").fill(teammateEmail);
    await page.getByTestId("recruiter-company-invite-submit").click();
    const inviteRes = await inviteResPromise;
    expect(inviteRes.ok(), await inviteRes.text()).toBeTruthy();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("recruiter-company-members")).toContainText(teammateEmail, {
      timeout: 15_000,
    });

    await page.getByTestId("recruiter-post-vacancy-open").click();
    await expect(page.getByRole("heading", { name: "Post New Vacancy" })).toBeVisible();
    await expect(page.getByTestId("recruiter-vacancy-company")).toContainText(companyName);

    const form = page.locator("form").filter({
      has: page.getByPlaceholder("Describe the role and day-to-day responsibilities"),
    });
    await form.locator("#vacancy-category").selectOption("designers");
    await form.locator("select").nth(1).selectOption("remote");
    await form.getByPlaceholder("e.g. Senior Frontend Engineer").fill(vacancyTitle);
    await form.getByPlaceholder("e.g. Remote / London, UK").fill("Remote");
    await form.getByPlaceholder("e.g. $120k - $150k").fill("$100k-$120k");
    await form.getByPlaceholder("Describe the role and day-to-day responsibilities").fill("E2E company scoped post.");
    await form.getByPlaceholder("List required skills, experience, and qualifications").fill("E2E req");

    const postResPromise = page.waitForResponse(async (r) => {
      if (r.request().method() !== "POST" || !r.url().includes("/api/jobs") || r.url().includes("/mine")) {
        return false;
      }
      const body = r.request().postDataJSON() as { companyId?: string };
      return body?.companyId === companyId;
    });
    await form.getByRole("button", { name: /^Post Vacancy$/ }).click();
    const postRes = await postResPromise;
    expect(postRes.ok(), await postRes.text()).toBeTruthy();

    await expect(
      page.getByTestId("recruiter-dashboard-page").getByRole("heading", { level: 4, name: vacancyTitle }),
    ).toBeVisible({ timeout: 30_000 });
  });
});
