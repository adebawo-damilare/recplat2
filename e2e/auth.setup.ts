import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";

import { test as setup, expect } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(__dirname, ".auth");
const candidateStorage = path.join(authDir, "candidate.json");
const recruiterStorage = path.join(authDir, "recruiter.json");

setup.describe("seed sessions", () => {
  setup.describe.configure({ mode: "serial" });

  setup("register recruiter + candidate and seed one vacancy", async ({ request }) => {
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

    const vacancyRes = await request.post("/api/jobs", {
      headers: { "content-type": "application/json" },
      data: {
        jobTitle: `E2E Candidate Apply ${Date.now()}`,
        companyName: "E2E Labs",
        location: "Remote",
        salary: "$120k-$140k",
        description: "Automated E2E vacancy",
        requirements: "Playwright setup",
        categorySlug: "designers",
        jobType: "remote",
      },
    });
    expect(vacancyRes.ok(), await vacancyRes.text()).toBeTruthy();
    await request.storageState({ path: recruiterStorage });

    const logoutRes = await request.post("/api/auth/logout", { headers: { "content-type": "application/json" } });
    expect(logoutRes.ok(), await logoutRes.text()).toBeTruthy();

    const candidateRes = await request.post("/api/auth/register", {
      headers: { "content-type": "application/json" },
      data: { email: candidateEmail, password, role: "candidate" },
    });
    expect(candidateRes.ok(), await candidateRes.text()).toBeTruthy();
    await request.storageState({ path: candidateStorage });
  });
});
