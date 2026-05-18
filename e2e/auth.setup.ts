import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";

import { test as setup, expect } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(__dirname, ".auth");
const candidateStorage = path.join(authDir, "candidate.json");
const recruiterStorage = path.join(authDir, "recruiter.json");

setup.describe("seed sessions", () => {
  setup.describe.configure({ mode: "serial", timeout: 120_000 });

  setup("register recruiter + candidate and seed vacancies", async ({ request }) => {
    await mkdir(authDir, { recursive: true });

    const password = "E2eTestUser!23456";
    const recruiterEmail = `e2e-recruiter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
    const candidateEmail = `e2e-candidate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;

    const recruiterRes = await request.post("/api/auth/register", {
      headers: { "content-type": "application/json" },
      data: { email: recruiterEmail, password, role: "recruiter" },
    });
    if (recruiterRes.status() === 503) {
      throw new Error(
        "Auth E2E setup: recruiter register returned 503. Ensure dev server has DATABASE_URL + TALENTBRIDGE_AUTH_SECRET and migrations.",
      );
    }
    expect(recruiterRes.ok(), await recruiterRes.text()).toBeTruthy();

    const vacancyApplyRes = await request.post("/api/jobs", {
      headers: { "content-type": "application/json" },
      data: {
        jobTitle: `E2E Candidate Apply ${Date.now()}`,
        companyName: "E2E Labs",
        location: "Remote",
        salary: "$120k-$140k",
        description: "Automated E2E vacancy for board apply flow",
        requirements: "Playwright setup",
        categorySlug: "designers",
        jobType: "remote",
      },
    });
    if (!vacancyApplyRes.ok()) {
      throw new Error(`seed vacancy (apply): ${vacancyApplyRes.status()} ${await vacancyApplyRes.text()}`);
    }
    const vacancyApplyBody = (await vacancyApplyRes.json()) as { job?: { id?: string } };
    const seededApplyVacancyId = vacancyApplyBody.job?.id;
    expect(seededApplyVacancyId).toBeTruthy();

    const jobDetailTitle = `E2E Job Detail ${Date.now()}`;
    const vacancyDetailRes = await request.post("/api/jobs", {
      headers: { "content-type": "application/json" },
      data: {
        jobTitle: jobDetailTitle,
        companyName: "E2E Labs",
        location: "Hybrid",
        salary: "$110k-$130k",
        description: "Automated E2E vacancy for public job detail page",
        requirements: "Playwright job detail",
        categorySlug: "designers",
        jobType: "hybrid",
      },
    });
    expect(vacancyDetailRes.ok(), await vacancyDetailRes.text()).toBeTruthy();
    const vacancyDetailBody = (await vacancyDetailRes.json()) as { job?: { id?: string } };
    const seededJobDetailVacancyId = vacancyDetailBody.job?.id;
    expect(seededJobDetailVacancyId).toBeTruthy();

    const screeningJobTitle = `E2E Marketers Screening ${Date.now()}`;
    const vacancyScreeningRes = await request.post("/api/jobs", {
      headers: { "content-type": "application/json" },
      data: {
        jobTitle: screeningJobTitle,
        companyName: "E2E Labs",
        location: "Remote",
        salary: "$100k-$120k",
        description: "Automated E2E vacancy for screening flow",
        requirements: "Playwright screening",
        categorySlug: "marketers",
        jobType: "remote",
      },
    });
    expect(vacancyScreeningRes.ok(), await vacancyScreeningRes.text()).toBeTruthy();
    const vacancyScreeningBody = (await vacancyScreeningRes.json()) as { job?: { id?: string } };
    const seededScreeningVacancyId = vacancyScreeningBody.job?.id;
    expect(seededScreeningVacancyId).toBeTruthy();

    await request.storageState({ path: recruiterStorage });

    const logoutRes = await request.post("/api/auth/logout", { headers: { "content-type": "application/json" } });
    expect(logoutRes.ok(), await logoutRes.text()).toBeTruthy();

    const candidateRes = await request.post("/api/auth/register", {
      headers: { "content-type": "application/json" },
      data: { email: candidateEmail, password, role: "candidate" },
    });
    expect(candidateRes.ok(), await candidateRes.text()).toBeTruthy();

    const applyRes = await request.post("/api/applications", {
      headers: { "content-type": "application/json" },
      data: { vacancyId: seededApplyVacancyId },
    });
    expect(applyRes.ok(), await applyRes.text()).toBeTruthy();

    const applyScreeningRes = await request.post("/api/applications", {
      headers: { "content-type": "application/json" },
      data: { vacancyId: seededScreeningVacancyId },
    });
    expect(applyScreeningRes.ok(), await applyScreeningRes.text()).toBeTruthy();

    await writeFile(
      path.join(authDir, "seed.json"),
      JSON.stringify({
        jobDetailVacancyTitle: jobDetailTitle,
        jobDetailVacancyId: seededJobDetailVacancyId,
        screeningVacancyTitle: screeningJobTitle,
        screeningVacancyId: seededScreeningVacancyId,
      }),
      "utf8",
    );

    await request.storageState({ path: candidateStorage });
  });
});
