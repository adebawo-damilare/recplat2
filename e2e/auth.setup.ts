import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";

import { test as setup, expect } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(__dirname, ".auth");
const candidateStorage = path.join(authDir, "candidate.json");

setup.describe("seed sessions", () => {
  setup.describe.configure({ mode: "serial" });

  setup("register candidate and save storage", async ({ request }) => {
    await mkdir(authDir, { recursive: true });

    const email = `e2e-candidate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
    const password = "E2eTestUser!23456";

    const res = await request.post("/api/auth/register", {
      headers: { "content-type": "application/json" },
      data: { email, password, role: "candidate" },
    });

    if (res.status() === 503) {
      throw new Error(
        "Auth E2E setup: POST /api/auth/register returned 503. Ensure the dev server has Postgres " +
          "(DATABASE_URL) and TALENTBRIDGE_AUTH_SECRET (e.g. .env.local) and migrations applied.",
      );
    }

    expect(res.ok(), await res.text()).toBeTruthy();
    await request.storageState({ path: candidateStorage });
  });
});
