import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.release" });

const base = (process.env.SMOKE_BASE_URL || "").replace(/\/$/, "");
if (!base) throw new Error("SMOKE_BASE_URL missing in .env.release");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing in .env.release");

const sql = postgres(process.env.DATABASE_URL);

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

const email = `prod-check-${Date.now()}@example.test`;
const password = "ProdCheck!23456";
let cookie = "";
let createdVacancyId = "";

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
      body: JSON.stringify({ email, password }),
      headers: {},
    });
    const setCookie = res.headers.get("set-cookie") || "";
    cookie = setCookie.split(";")[0];
    if (res.status === 200 && body?.user?.email && cookie) ok("POST /api/auth/register", `user=${body.user.email}`);
    else fail("POST /api/auth/register", `${res.status} ${JSON.stringify(body)} cookie=${Boolean(cookie)}`);
  }
  {
    const { res, body } = await fetchJson("/api/auth/session", {
      method: "GET",
      headers: { cookie },
    });
    if (res.status === 200 && body?.user?.email === email) ok("GET /api/auth/session (authenticated)", body.user.id);
    else fail("GET /api/auth/session (authenticated)", `${res.status} ${JSON.stringify(body)}`);
  }

  // 3) Candidate profile save/load
  {
    const patch = {
      fullName: "Prod Checklist User",
      email,
      headline: "QA candidate",
      summary: "Profile save check",
      skills: "Testing, QA, Node",
      experience: "Manual and API verification",
      portfolioUrl: "https://example.test/portfolio",
      portfolioContent: "# Portfolio\n\nSmoke profile check.",
    };
    const { res, body } = await fetchJson("/api/candidates/me", {
      method: "PATCH",
      headers: { cookie },
      body: JSON.stringify(patch),
    });
    if (res.status === 200 && body?.profile?.fullName === patch.fullName) ok("PATCH /api/candidates/me", "profile persisted");
    else fail("PATCH /api/candidates/me", `${res.status} ${JSON.stringify(body)}`);
  }
  {
    const { res, body } = await fetchJson("/api/candidates/me", {
      method: "GET",
      headers: { cookie },
    });
    if (res.status === 200 && body?.profile?.email === email) ok("GET /api/candidates/me", "profile reload OK");
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
      headers: { cookie },
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
        headers: { cookie },
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
      headers: { cookie },
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
        headers: { cookie },
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
      headers: { cookie },
    });
    const found = Array.isArray(body?.applications) && body.applications.some((a) => a.vacancyId === createdVacancyId);
    if (res.status === 200 && found) ok("GET /api/applications/mine (authenticated)", "application present");
    else fail("GET /api/applications/mine (authenticated)", `${res.status} found=${found} ${JSON.stringify(body)}`);
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
    const users = await sql`select id, email from users where lower(email)=lower(${email}) limit 1`;
    if (users.length === 1) ok("DB users check", users[0].id);
    else fail("DB users check", "user not found");
  }
  {
    const vacancies = await sql`select id, posted_by_user_id, status from vacancies where id=${createdVacancyId} limit 1`;
    if (vacancies.length === 1) ok("DB vacancies check", `status=${vacancies[0].status}`);
    else fail("DB vacancies check", "vacancy not found");
  }
  {
    const apps = await sql`select id, vacancy_id, candidate_user_id from applications where vacancy_id=${createdVacancyId} limit 1`;
    if (apps.length === 1) ok("DB applications check", apps[0].id);
    else fail("DB applications check", "application not found");
  }
  {
    const profiles = await sql`select user_id, email_snapshot from candidate_profiles where lower(email_snapshot)=lower(${email}) limit 1`;
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
