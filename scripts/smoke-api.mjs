/**
 * Hit public API routes against a running app (dev or prod).
 * Usage: npm run smoke:api
 *        SMOKE_BASE_URL=https://example.com npm run smoke:api
 */
/** Default localhost (not 127.0.0.1): Node fetch on some Windows setups hangs on IPv4 loopback.) */
const base = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

async function check(label, path, { expectJson = true } = {}) {
  const res = await fetch(`${base}${path}`, { cache: "no-store" });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${label} ${path} -> ${res.status}: ${text.slice(0, 200)}`);
  }
  if (expectJson && body && typeof body === "object" && !Array.isArray(body)) {
    return body;
  }
  return body;
}

try {
  await check("health", "/api/health");
  const jobs = await check("jobs", "/api/jobs?limit=1");
  if (!Array.isArray(jobs.jobs)) {
    throw new Error("GET /api/jobs: expected { jobs: array }");
  }
  const ai = await check("ai health", "/api/ai/health");
  if (!ai || typeof ai.provider !== "string") {
    throw new Error("GET /api/ai/health: expected { provider: string }");
  }
  console.log("smoke-api: ok", base);
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
