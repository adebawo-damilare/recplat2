import { config } from "dotenv";
import postgres from "postgres";
import { postgresOptions } from "./postgres-url-options.mjs";

config({ path: ".env.release" });

const base = (process.env.SMOKE_BASE_URL || "").replace(/\/$/, "");
if (!base) throw new Error("SMOKE_BASE_URL missing in .env.release");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing in .env.release");

/** Same logical site as SMOKE_BASE_URL (protocol + host). Set in .env.release for production. */
function originKey(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`.toLowerCase();
  } catch {
    return url.replace(/\/$/, "").toLowerCase();
  }
}

const prodChecklistOrigin = process.env.PROD_CHECKLIST_ORIGIN?.trim();
if (prodChecklistOrigin) {
  const isProdTarget = originKey(base) === originKey(prodChecklistOrigin);
  const mutationsOk = process.env.ALLOW_PROD_CHECKLIST_MUTATIONS === "1";
  if (isProdTarget && !mutationsOk) {
    console.error(`
Refusing to run: SMOKE_BASE_URL matches PROD_CHECKLIST_ORIGIN (production checklist target).

This script creates real users, jobs, and applications. To confirm intentional production
mutations, set in .env.release (or the shell):

  ALLOW_PROD_CHECKLIST_MUTATIONS=1

See docs/PROD_CHECKLIST.md (automation + production mutations).
`);
    process.exit(1);
  }
}

const dbUrl = process.env.DATABASE_URL;
const sql = postgres(dbUrl, postgresOptions(dbUrl));

const out = [];
function ok(name, details = "") {
  out.push({ name, status: "PASS", details });
}
function fail(name, details = "") {
  out.push({ name, status: "FAIL", details });
}

async function fetchJson(path, init = {}) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { _raw: text };
  }
  return { res, body };
}

const candidateEmail = `prod-check-candidate-${Date.now()}@example.test`;
const recruiterEmail = `prod-check-recruiter-${Date.now()}@example.test`;
const password = "ProdCheck!23456";
let candidateCookie = "";
let recruiterCookie = "";
let createdVacancyId = "";
let pipelineApplicationId = "";

try {
  // 1) Public checks
  {
    const { res, body } = await fetchJson("/api/health", { method: "GET", headers: {} });
    if (res.status === 200 && body?.ok === true) ok("GET /api/health", "200 + ok:true");
    else fail("GET /api/health", `${res.status} ${JSON.stringify(body)}`);
  }
  {
    const { res, body } = await fetchJson("/api/jobs?limit=5", { method: "GET", headers: {} });
    if (res.status === 200 && Array.isArray(body?.jobs)) ok("GET /api/jobs?limit=5", `jobs=${body.jobs.length}`);
    else fail("GET /api/jobs?limit=5", `${res.status} ${JSON.stringify(body)}`);
  }
  {
    const { res, body } = await fetchJson("/api/categories", { method: "GET", headers: {} });
    if (res.status === 200 && Array.isArray(body?.categories)) ok("GET /api/categories", `categories=${body.categories.length}`);
    else fail("GET /api/categories", `${res.status} ${JSON.stringify(body)}`);
  }

  // 2) Auth flow via API
  {
    const { res, body } = await fetchJson("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: candidateEmail, password, role: "candidate" }),
      headers: {},
    });
    const setCookie = res.headers.get("set-cookie") || "";
    candidateCookie = setCookie.split(";")[0];
    if (res.status === 200 && body?.user?.email === candidateEmail && body?.user?.role === "candidate" && candidateCookie) {
      ok("POST /api/auth/register (candidate)", `user=${body.user.email}`);
    } else fail("POST /api/auth/register (candidate)", `${res.status} ${JSON.stringify(body)} cookie=${Boolean(candidateCookie)}`);
  }
  {
    const { res, body } = await fetchJson("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: recruiterEmail, password, role: "recruiter" }),
      headers: {},
    });
    const setCookie = res.headers.get("set-cookie") || "";
    recruiterCookie = setCookie.split(";")[0];
    if (res.status === 200 && body?.user?.email === recruiterEmail && body?.user?.role === "recruiter" && recruiterCookie) {
      ok("POST /api/auth/register (recruiter)", `user=${body.user.email}`);
    } else fail("POST /api/auth/register (recruiter)", `${res.status} ${JSON.stringify(body)} cookie=${Boolean(recruiterCookie)}`);
  }
  {
    const { res, body } = await fetchJson("/api/auth/session", {
      method: "GET",
      headers: { cookie: candidateCookie },
    });
    if (res.status === 200 && body?.user?.email === candidateEmail && body?.user?.role === "candidate") {
      ok("GET /api/auth/session (candidate)", body.user.id);
    } else fail("GET /api/auth/session (candidate)", `${res.status} ${JSON.stringify(body)}`);
  }
  {
    const { res, body } = await fetchJson("/api/auth/session", {
      method: "GET",
      headers: { cookie: recruiterCookie },
    });
    if (res.status === 200 && body?.user?.email === recruiterEmail && body?.user?.role === "recruiter") {
      ok("GET /api/auth/session (recruiter)", body.user.id);
    } else fail("GET /api/auth/session (recruiter)", `${res.status} ${JSON.stringify(body)}`);
  }

  // 3) Candidate profile save/load
  {
    const patch = {
      firstName: "Prod",
      lastName: "Checklist User",
      email: candidateEmail,
      headline: "QA candidate",
      summary: "Profile save check",
      skills: "Testing, QA, Node",
      experience: "Manual and API verification",
      portfolioUrl: "https://example.test/portfolio",
      portfolioContent: "# Portfolio\n\nSmoke profile check.",
    };
    const { res, body } = await fetchJson("/api/candidates/me", {
      method: "PATCH",
      headers: { cookie: candidateCookie },
      body: JSON.stringify(patch),
    });
    if (
      res.status === 200 &&
      body?.profile?.firstName === patch.firstName &&
      body?.profile?.lastName === patch.lastName
    )
      ok("PATCH /api/candidates/me", "profile persisted");
    else fail("PATCH /api/candidates/me", `${res.status} ${JSON.stringify(body)}`);
  }
  {
    const { res, body } = await fetchJson("/api/candidates/me", {
      method: "GET",
      headers: { cookie: candidateCookie },
    });
    if (res.status === 200 && body?.profile?.email === candidateEmail) ok("GET /api/candidates/me", "profile reload OK");
    else fail("GET /api/candidates/me", `${res.status} ${JSON.stringify(body)}`);
  }

  // 4) Recruiter vacancy create/edit/close + mine
  {
    const createPayload = {
      jobTitle: "Prod Checklist Vacancy",
      companyName: "Checklist Labs",
      location: "Remote",
      salary: "$100k-$120k",
      description: "Created by automated production checklist run.",
      requirements: "Attention to detail",
      categorySlug: "designers",
    };
    const { res, body } = await fetchJson("/api/jobs", {
      method: "POST",
      headers: { cookie: recruiterCookie },
      body: JSON.stringify(createPayload),
    });
    createdVacancyId = body?.job?.id || "";
    if (res.status === 200 && createdVacancyId) ok("POST /api/jobs", `vacancy=${createdVacancyId}`);
    else fail("POST /api/jobs", `${res.status} ${JSON.stringify(body)}`);
  }
  {
    if (createdVacancyId) {
      const { res, body } = await fetchJson(`/api/jobs/${createdVacancyId}`, {
        method: "PATCH",
        headers: { cookie: recruiterCookie },
        body: JSON.stringify({ salary: "$110k-$130k", status: "open", categorySlug: "sales" }),
      });
      if (res.status === 200 && body?.job?.salary === "$110k-$130k") ok("PATCH /api/jobs/[id]", "edit succeeded");
      else fail("PATCH /api/jobs/[id]", `${res.status} ${JSON.stringify(body)}`);
    } else {
      fail("PATCH /api/jobs/[id]", "skipped: no vacancy id");
    }
  }
  {
    const { res, body } = await fetchJson("/api/jobs/mine", {
      method: "GET",
      headers: { cookie: recruiterCookie },
    });
    const found = Array.isArray(body?.jobs) && body.jobs.some((j) => j.id === createdVacancyId);
    if (res.status === 200 && found) ok("GET /api/jobs/mine", "created vacancy found");
    else fail("GET /api/jobs/mine", `${res.status} found=${found} ${JSON.stringify(body)}`);
  }

  // 5) Apply + applications/mine authenticated
  {
    if (createdVacancyId) {
      const { res, body } = await fetchJson("/api/applications", {
        method: "POST",
        headers: { cookie: candidateCookie },
        body: JSON.stringify({ vacancyId: createdVacancyId }),
      });
      if (res.status === 200) ok("POST /api/applications", "apply succeeded");
      else fail("POST /api/applications", `${res.status} ${JSON.stringify(body)}`);
    } else {
      fail("POST /api/applications", "skipped: no vacancy id");
    }
  }
  {
    const { res, body } = await fetchJson("/api/applications/mine", {
      method: "GET",
      headers: { cookie: candidateCookie },
    });
    const found = Array.isArray(body?.applications) && body.applications.some((a) => a.vacancyId === createdVacancyId);
    if (res.status === 200 && found) ok("GET /api/applications/mine (authenticated)", "application present");
    else fail("GET /api/applications/mine (authenticated)", `${res.status} found=${found} ${JSON.stringify(body)}`);
  }

  // 5b) Application pipeline: recruiter board, PATCH status, candidate sees update
  {
    const { res, body } = await fetchJson("/api/applications/board", {
      method: "GET",
      headers: { cookie: recruiterCookie },
    });
    const rows = Array.isArray(body?.applications) ? body.applications : [];
    const row = rows.find((a) => a.vacancyId === createdVacancyId);
    pipelineApplicationId = row?.id || "";
    if (res.status === 200 && pipelineApplicationId && row?.status === "applied") {
      ok("GET /api/applications/board", `id=${pipelineApplicationId}`);
    } else {
      fail("GET /api/applications/board", `${res.status} rows=${rows.length} id=${pipelineApplicationId} ${JSON.stringify(body)}`);
    }
  }
  {
    if (pipelineApplicationId) {
      const { res, body } = await fetchJson(`/api/applications/${pipelineApplicationId}`, {
        method: "PATCH",
        headers: { cookie: recruiterCookie },
        body: JSON.stringify({ status: "viewed" }),
      });
      if (res.status === 200 && body?.status === "viewed") ok("PATCH /api/applications/[id]", "status=viewed");
      else fail("PATCH /api/applications/[id]", `${res.status} ${JSON.stringify(body)}`);
    } else {
      fail("PATCH /api/applications/[id]", "skipped: no application id from board");
    }
  }
  {
    const { res, body } = await fetchJson("/api/applications/mine", {
      method: "GET",
      headers: { cookie: candidateCookie },
    });
    const app = Array.isArray(body?.applications)
      ? body.applications.find((a) => a.vacancyId === createdVacancyId)
      : null;
    if (res.status === 200 && app?.status === "viewed") {
      ok("GET /api/applications/mine (after pipeline status)", app.status);
    } else {
      fail("GET /api/applications/mine (after pipeline status)", `${res.status} ${JSON.stringify(app)}`);
    }
  }
  {
    const { res, body } = await fetchJson(
      `/api/applications/board?vacancyId=${encodeURIComponent(createdVacancyId)}`,
      { method: "GET", headers: { cookie: recruiterCookie } },
    );
    const rows = Array.isArray(body?.applications) ? body.applications : [];
    const okFilter =
      res.status === 200 && rows.length >= 1 && rows.every((r) => r.vacancyId === createdVacancyId);
    if (okFilter) ok("GET /api/applications/board?vacancyId=…", `count=${rows.length}`);
    else fail("GET /api/applications/board?vacancyId=…", `${res.status} ${JSON.stringify(body)}`);
  }
  {
    const { res, body } = await fetchJson("/api/applications/board", {
      method: "GET",
      headers: { cookie: candidateCookie },
    });
    if (res.status === 403 && body?.code === "FORBIDDEN_ROLE") {
      ok("GET /api/applications/board (candidate forbidden)", "403 role guard");
    } else {
      fail("GET /api/applications/board (candidate forbidden)", `${res.status} ${JSON.stringify(body)}`);
    }
  }

  // 6b) Role mismatch checks
  {
    const { res, body } = await fetchJson("/api/jobs", {
      method: "POST",
      headers: { cookie: candidateCookie },
      body: JSON.stringify({
        jobTitle: "Wrong Role Check",
        companyName: "Checklist Labs",
        location: "Remote",
        salary: "$100k",
        description: "Should fail",
        requirements: "N/A",
      }),
    });
    if (res.status === 403 && body?.code === "FORBIDDEN_ROLE") ok("POST /api/jobs (candidate forbidden)", "403 role guard");
    else fail("POST /api/jobs (candidate forbidden)", `${res.status} ${JSON.stringify(body)}`);
  }
  {
    const { res, body } = await fetchJson("/api/applications", {
      method: "POST",
      headers: { cookie: recruiterCookie },
      body: JSON.stringify({ vacancyId: createdVacancyId }),
    });
    if (res.status === 403 && body?.code === "FORBIDDEN_ROLE") ok("POST /api/applications (recruiter forbidden)", "403 role guard");
    else fail("POST /api/applications (recruiter forbidden)", `${res.status} ${JSON.stringify(body)}`);
  }

  // 6) Protected route unauth behavior
  {
    const { res, body } = await fetchJson("/api/applications/mine", {
      method: "GET",
      headers: {},
    });
    if (res.status === 401) ok("GET /api/applications/mine (unauthenticated)", "401 as expected");
    else fail("GET /api/applications/mine (unauthenticated)", `${res.status} ${JSON.stringify(body)}`);
  }

  // 7) DB spot checks
  {
    const users = await sql`
      select id, email, role
      from users
      where lower(email) in (lower(${candidateEmail}), lower(${recruiterEmail}))
    `;
    const candidateOk = users.some((u) => u.email.toLowerCase() === candidateEmail.toLowerCase() && u.role === "candidate");
    const recruiterOk = users.some((u) => u.email.toLowerCase() === recruiterEmail.toLowerCase() && u.role === "recruiter");
    if (candidateOk && recruiterOk) ok("DB users check", "candidate + recruiter rows present");
    else fail("DB users check", `candidateOk=${candidateOk} recruiterOk=${recruiterOk}`);
  }
  {
    const vacancies = await sql`select id, posted_by_user_id, status from vacancies where id=${createdVacancyId} limit 1`;
    if (vacancies.length === 1) ok("DB vacancies check", `status=${vacancies[0].status}`);
    else fail("DB vacancies check", "vacancy not found");
  }
  {
    const apps = await sql`
      select id, vacancy_id, candidate_user_id, status
      from applications
      where vacancy_id=${createdVacancyId}
      limit 1
    `;
    if (apps.length === 1 && apps[0].status === "viewed") ok("DB applications check", `${apps[0].id} status=viewed`);
    else fail("DB applications check", apps.length ? `status=${apps[0]?.status}` : "application not found");
  }
  {
    const profiles = await sql`
      select user_id, email_snapshot
      from candidate_profiles
      where lower(email_snapshot)=lower(${candidateEmail})
      limit 1
    `;
    if (profiles.length === 1) ok("DB candidate_profiles check", profiles[0].user_id);
    else fail("DB candidate_profiles check", "profile not found");
  }
} catch (e) {
  fail("Checklist runner exception", e instanceof Error ? e.message : String(e));
} finally {
  await sql.end();
}

console.log("\n=== PROD CHECKLIST RESULTS ===");
for (const row of out) {
  console.log(`${row.status.padEnd(4)} ${row.name}${row.details ? ` -> ${row.details}` : ""}`);
}

const failed = out.filter((r) => r.status === "FAIL").length;
if (failed > 0) {
  console.log(`\nFAILED: ${failed} check(s)`);
  process.exit(1);
}
console.log("\nALL CHECKS PASSED");
