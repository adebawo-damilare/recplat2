/**
 * Dedicated role-authorization regression checks.
 *
 * Usage:
 *   ROLE_TEST_BASE_URL=http://127.0.0.1:3000 node scripts/test-role-guards.mjs
 */
const base = (process.env.ROLE_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

async function fetchJson(method, path, init = {}) {
  const { headers: initHeaders, ...restInit } = init;
  const res = await fetch(`${base}${path}`, {
    cache: "no-store",
    method,
    ...restInit,
    headers: {
      ...initHeaders,
    },
  });
  const text = await res.text();
  let body = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { _raw: text };
    }
  }
  return { res, body, text };
}

async function registerWithRole(role) {
  const email = `role-guard-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const password = "RoleGuard!23456";
  const { res, body, text } = await fetchJson("POST", "/api/auth/register", {
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, role }),
  });
  if (!res.ok || body?.user?.role !== role) {
    throw new Error(`register ${role} failed -> ${res.status}: ${text.slice(0, 200)}`);
  }
  const cookie = (res.headers.get("set-cookie") || "").split(";")[0];
  if (!cookie) throw new Error(`register ${role} missing cookie`);
  return { cookie };
}

async function run() {
  const recruiter = await registerWithRole("recruiter");
  const candidate = await registerWithRole("candidate");

  const badRole = await fetchJson("POST", "/api/auth/register", {
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: `role-guard-invalid-${Date.now()}@example.test`,
      password: "RoleGuard!23456",
      role: "admin",
    }),
  });
  if (badRole.res.status !== 400) {
    throw new Error(`invalid role should return 400, got ${badRole.res.status}`);
  }

  const createPayload = {
    jobTitle: "Role Guard CI Vacancy",
    companyName: "Role Guard CI",
    location: "Remote",
    salary: "$123k",
    description: "Role guard CI check",
    requirements: "None",
    categorySlug: "designers",
  };

  const recruiterCreate = await fetchJson("POST", "/api/jobs", {
    headers: { cookie: recruiter.cookie, "content-type": "application/json" },
    body: JSON.stringify(createPayload),
  });
  if (!recruiterCreate.res.ok || !recruiterCreate.body?.job?.id) {
    throw new Error(`recruiter create vacancy failed -> ${recruiterCreate.res.status}`);
  }
  const vacancyId = recruiterCreate.body.job.id;

  const candidateCreate = await fetchJson("POST", "/api/jobs", {
    headers: { cookie: candidate.cookie, "content-type": "application/json" },
    body: JSON.stringify(createPayload),
  });
  if (candidateCreate.res.status !== 403 || candidateCreate.body?.code !== "FORBIDDEN_ROLE") {
    throw new Error("candidate should be forbidden from creating jobs");
  }

  const recruiterApply = await fetchJson("POST", "/api/applications", {
    headers: { cookie: recruiter.cookie, "content-type": "application/json" },
    body: JSON.stringify({ vacancyId }),
  });
  if (recruiterApply.res.status !== 403 || recruiterApply.body?.code !== "FORBIDDEN_ROLE") {
    throw new Error("recruiter should be forbidden from applying");
  }

  const candidatesAnon = await fetchJson("GET", "/api/candidates");
  if (candidatesAnon.res.status !== 401) {
    throw new Error(`GET /api/candidates without session should be 401, got ${candidatesAnon.res.status}`);
  }

  const candidatesAsCandidate = await fetchJson("GET", "/api/candidates", {
    headers: { cookie: candidate.cookie },
  });
  if (candidatesAsCandidate.res.status !== 403 || candidatesAsCandidate.body?.code !== "FORBIDDEN_ROLE") {
    throw new Error("candidate should be forbidden from listing all candidates");
  }

  const candidatesAsRecruiter = await fetchJson("GET", "/api/candidates", {
    headers: { cookie: recruiter.cookie },
  });
  if (!candidatesAsRecruiter.res.ok || !Array.isArray(candidatesAsRecruiter.body?.candidates)) {
    throw new Error(`recruiter GET /api/candidates failed -> ${candidatesAsRecruiter.res.status}`);
  }

  console.log("role-guards: ok", base);
}

run().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
