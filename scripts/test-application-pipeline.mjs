/**
 * Application pipeline regression (board + PATCH + candidate mine).
 *
 * Usage:
 *   PIPELINE_TEST_BASE_URL=http://127.0.0.1:3000 node scripts/test-application-pipeline.mjs
 */
const base = (process.env.PIPELINE_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

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
  const email = `pipe-ci-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const password = "PipeCi!23456";
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

  const createPayload = {
    jobTitle: "Pipeline CI Vacancy",
    companyName: "Pipeline CI Co",
    location: "Remote",
    salary: "$100k",
    description: "CI pipeline test",
    requirements: "None",
    categorySlug: "designers",
    jobType: "full_time",
  };

  const { res: createRes, body: createBody } = await fetchJson("POST", "/api/jobs", {
    headers: { cookie: recruiter.cookie, "content-type": "application/json" },
    body: JSON.stringify(createPayload),
  });
  if (!createRes.ok || !createBody?.job?.id) {
    throw new Error(`POST /api/jobs failed -> ${createRes.status}`);
  }
  const vacancyId = createBody.job.id;

  const applyRes = await fetchJson("POST", "/api/applications", {
    headers: { cookie: candidate.cookie, "content-type": "application/json" },
    body: JSON.stringify({ vacancyId }),
  });
  if (!applyRes.res.ok) {
    throw new Error(`POST /api/applications failed -> ${applyRes.res.status}`);
  }

  const boardRes = await fetchJson("GET", "/api/applications/board", {
    headers: { cookie: recruiter.cookie },
  });
  const rows = Array.isArray(boardRes.body?.applications) ? boardRes.body.applications : [];
  const row = rows.find((a) => a.vacancyId === vacancyId);
  if (!boardRes.res.ok || !row?.id || row.status !== "applied") {
    throw new Error(`GET /api/applications/board failed -> ${boardRes.res.status} rows=${rows.length}`);
  }
  const applicationId = row.id;

  const patchRes = await fetchJson("PATCH", `/api/applications/${applicationId}`, {
    headers: { cookie: recruiter.cookie, "content-type": "application/json" },
    body: JSON.stringify({ status: "viewed" }),
  });
  if (!patchRes.res.ok || patchRes.body?.status !== "viewed") {
    throw new Error(`PATCH /api/applications/[id] failed -> ${patchRes.res.status}`);
  }

  const mineRes = await fetchJson("GET", "/api/applications/mine", {
    headers: { cookie: candidate.cookie },
  });
  const app = Array.isArray(mineRes.body?.applications)
    ? mineRes.body.applications.find((a) => a.vacancyId === vacancyId)
    : null;
  if (!mineRes.res.ok || app?.status !== "viewed") {
    throw new Error(`GET /api/applications/mine after patch failed -> ${mineRes.res.status}`);
  }

  const filterRes = await fetchJson(
    "GET",
    `/api/applications/board?vacancyId=${encodeURIComponent(vacancyId)}`,
    {
      headers: { cookie: recruiter.cookie },
    },
  );
  const fr = Array.isArray(filterRes.body?.applications) ? filterRes.body.applications : [];
  if (!filterRes.res.ok || fr.length < 1 || !fr.every((r) => r.vacancyId === vacancyId)) {
    throw new Error(`GET /api/applications/board?vacancyId failed -> ${filterRes.res.status}`);
  }

  const statusRes = await fetchJson("GET", "/api/applications/board?status=viewed", {
    headers: { cookie: recruiter.cookie },
  });
  const viewed = Array.isArray(statusRes.body?.applications) ? statusRes.body.applications : [];
  if (!statusRes.res.ok || !viewed.some((r) => r.id === applicationId)) {
    throw new Error(`GET /api/applications/board?status=viewed failed -> ${statusRes.res.status}`);
  }

  const laneRes = await fetchJson("GET", "/api/applications/board?category=designers", {
    headers: { cookie: recruiter.cookie },
  });
  const laneRows = Array.isArray(laneRes.body?.applications) ? laneRes.body.applications : [];
  if (!laneRes.res.ok || !laneRows.some((r) => r.id === applicationId)) {
    throw new Error(`GET /api/applications/board?category=designers failed -> ${laneRes.res.status}`);
  }

  const badStatus = await fetchJson("GET", "/api/applications/board?status=not_a_stage", {
    headers: { cookie: recruiter.cookie },
  });
  if (badStatus.res.status !== 400) {
    throw new Error(`GET /api/applications/board?status=invalid expected 400, got ${badStatus.res.status}`);
  }

  const candBoard = await fetchJson("GET", "/api/applications/board", {
    headers: { cookie: candidate.cookie },
  });
  if (candBoard.res.status !== 403 || candBoard.body?.code !== "FORBIDDEN_ROLE") {
    throw new Error(`candidate board should be 403 FORBIDDEN_ROLE, got ${candBoard.res.status}`);
  }

  console.log("application-pipeline: ok", base);
}

run().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
