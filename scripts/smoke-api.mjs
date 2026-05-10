/**
 * Hit public API routes against a running app (dev, staging, or prod).
 *
 * Usage:
 *   npm run smoke:api
 *   SMOKE_BASE_URL=https://example.com npm run smoke:api
 *
 * Strict Jobs Slice rehearsal (requires DATABASE_URL + server started with Postgres;
 * rejects Firestore/offline Postgres for jobs and applications/mine):
 *   SMOKE_EXPECT_POSTGRES_READY=1 SMOKE_BASE_URL=http://127.0.0.1:3000 npm run smoke:api
 *
 * Vercel Deployment Protection bypass (optional — same secret as automation bypass docs):
 *   VERCEL_AUTOMATION_BYPASS_SECRET=... npm run smoke:api
 */
/** Default localhost (not 127.0.0.1): Node fetch on some Windows setups hangs on IPv4 loopback.) */
const base = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const strictPostgres = process.env.SMOKE_EXPECT_POSTGRES_READY === "1";

function vercelProtectionBypassHeaders() {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  if (!secret) return {};
  return { "x-vercel-protection-bypass": secret };
}

async function fetchJson(method, path, init = {}) {
  const { headers: initHeaders, ...restInit } = init;
  const res = await fetch(`${base}${path}`, {
    cache: "no-store",
    method,
    ...restInit,
    headers: {
      ...vercelProtectionBypassHeaders(),
      ...initHeaders,
    },
  });
  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { _raw: text };
    }
  } else {
    body = {};
  }
  return { res, body, text };
}

async function check(label, path, { expectJson = true } = {}) {
  const { res, body, text } = await fetchJson("GET", path);

  if (!res.ok) {
    throw new Error(`${label} ${path} -> ${res.status}: ${text.slice(0, 200)}`);
  }

  if (expectJson && body && typeof body === "object" && !Array.isArray(body)) {
    return body;
  }
  return body;
}

/**
 * GET /api/applications/mine without Authorization should not 5xx.
 * With Postgres + auth route order, expect 401 (NO_BEARER) even if Firebase Admin is unset.
 */
async function checkApplicationsMineUnauthenticated() {
  const { res, body, text } = await fetchJson("GET", "/api/applications/mine");

  if (res.status === 401) {
    return;
  }

  if (res.status === 503) {
    const code = body?.code;
    const allowedRelaxed =
      code === "POSTGRES_UNAVAILABLE" || code === "JOBS_POSTGRES_REQUIRED" || code === "FIREBASE_ADMIN_UNAVAILABLE";

    if (strictPostgres) {
      throw new Error(
        `strict: GET /api/applications/mine expected 401 (auth required), got 503 code=${code ?? "?"}. ` +
          `Is DATABASE_URL set on the server?`,
      );
    }

    if (allowedRelaxed) {
      return;
    }

    throw new Error(`GET /api/applications/mine -> 503 unexpected body: ${text.slice(0, 200)}`);
  }

  if (res.status >= 500) {
    throw new Error(`GET /api/applications/mine -> ${res.status}: ${text.slice(0, 200)}`);
  }

  if (res.ok) {
    throw new Error(`GET /api/applications/mine: unexpected success ${res.status} without auth`);
  }

  throw new Error(`GET /api/applications/mine -> ${res.status}: ${text.slice(0, 200)}`);
}

try {
  await check("health", "/api/health");

  const cats = await check("categories", "/api/categories");
  if (!Array.isArray(cats.categories)) {
    throw new Error("GET /api/categories: expected { categories: array }");
  }

  const jobs = await check("jobs", "/api/jobs?limit=1");
  if (!Array.isArray(jobs.jobs)) {
    throw new Error("GET /api/jobs: expected { jobs: array }");
  }

  const ai = await check("ai health", "/api/ai/health");
  if (!ai || typeof ai.provider !== "string") {
    throw new Error("GET /api/ai/health: expected { provider: string }");
  }

  if (strictPostgres && ai.postgresConfigured !== true) {
    throw new Error(
      "strict: GET /api/ai/health expected postgresConfigured: true — server is not seeing DATABASE_URL",
    );
  }

  await checkApplicationsMineUnauthenticated();

  console.log("smoke-api: ok", base, strictPostgres ? "(strict Postgres)" : "");
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
