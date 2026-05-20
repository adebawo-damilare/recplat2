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

  test("GET /api/candidates without session is rejected (401 or 503 when DB/auth off)", async ({ request }) => {
    const res = await request.get("/api/candidates?limit=10&offset=0");
    if (res.status() === 401) return;
    expect(res.status()).toBe(503);
    const body = await res.json();
    expect(["POSTGRES_UNAVAILABLE", "AUTH_UNAVAILABLE"]).toContain(body?.code);
  });

  test("GET /api/jobs?includeTotal=1 returns totalOpen when jobs API is available", async ({ request }) => {
    const res = await request.get("/api/jobs?limit=6&includeTotal=1");
    if (res.status() === 503) return;
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("jobs");
    expect(typeof body.totalOpen).toBe("number");
    expect(body.totalOpen).toBeGreaterThanOrEqual(body.jobs.length);
  });

  test("GET /api/jobs/{id} returns 404 for unknown id when jobs API is up", async ({ request }) => {
    const res = await request.get("/api/jobs/00000000-0000-4000-8000-000000000001");
    if (res.status() === 503) return;
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body?.code).toBe("NOT_FOUND");
  });

  test("GET /api/jobs returns pagination metadata for limit=10", async ({ request }) => {
    const res = await request.get("/api/jobs?limit=10");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("jobs");
    expect(body).toHaveProperty("pagination");
    expect(body.pagination).toHaveProperty("limit");
    expect(typeof body.pagination?.nextCursor === "string" || body.pagination?.nextCursor === null).toBeTruthy();
  });

  test("GET /api/jobs offset=10 returns page 2 when enough open jobs exist", async ({ request }) => {
    const first = await request.get("/api/jobs?limit=10&includeTotal=1");
    if (first.status() === 503) return;
    expect(first.ok()).toBeTruthy();
    const firstBody = (await first.json()) as { totalOpen?: number; jobs?: unknown[] };
    if ((firstBody.totalOpen ?? 0) <= 10) return;

    const second = await request.get("/api/jobs?limit=10&offset=10&includeTotal=1");
    expect(second.ok(), await second.text()).toBeTruthy();
    const secondBody = (await second.json()) as { jobs?: { id?: string }[] };
    expect(secondBody.jobs?.length ?? 0).toBeGreaterThan(0);
  });

  test("GET /api/jobs rejects unknown jobType filter with 400", async ({ request }) => {
    const res = await request.get("/api/jobs?limit=1&jobType=not_a_real_type");
    if (res.status() === 503) return;
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body?.error).toBe("Unknown jobType filter.");
  });
});
