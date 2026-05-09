import { test, expect } from "@playwright/test";

test.describe("Public API", () => {
  test("GET /api/jobs returns a jobs array", async ({ request }) => {
    const res = await request.get("/api/jobs?limit=2");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("jobs");
    expect(Array.isArray(body.jobs)).toBeTruthy();
  });

  test("GET /api/health responds OK", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
  });
});
