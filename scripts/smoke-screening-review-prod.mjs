/**
 * Prod smoke: screening review tables + score save round-trip (requires recruiter session).
 *
 * Usage (from repo root):
 *   dotenv -e .env.release -- node scripts/smoke-screening-review-prod.mjs
 *
 * Optional in .env.release:
 *   SMOKE_RECRUITER_EMAIL=
 *   SMOKE_RECRUITER_PASSWORD=
 */
import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { postgresOptions } from "./postgres-url-options.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

config({ path: join(repoRoot, ".env.release") });
config({ path: join(repoRoot, ".env.local") });
config({ path: join(repoRoot, ".env") });

const base = (process.env.SMOKE_BASE_URL ?? "https://recplat2.vercel.app").replace(/\/$/, "");
const dbUrl = process.env.DATABASE_URL?.trim();
const recruiterEmail = process.env.SMOKE_RECRUITER_EMAIL?.trim();
const recruiterPassword = process.env.SMOKE_RECRUITER_PASSWORD?.trim();

function bypassHeaders() {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  return secret ? { "x-vercel-protection-bypass": secret } : {};
}

async function fetchJson(method, path, init = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    cache: "no-store",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...bypassHeaders(),
      ...init.headers,
    },
    ...init,
  });
  const text = await res.text();
  let body = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { _raw: text.slice(0, 300) };
    }
  }
  return { res, body, text };
}

async function main() {
  if (!dbUrl) {
    console.error("DATABASE_URL is required in .env.release");
    process.exit(1);
  }

  const sql = postgres(dbUrl, postgresOptions(dbUrl));

  try {
    const tableCheck = await sql`
      SELECT to_regclass('public.screening_reviews') AS reviews,
             to_regclass('public.screening_review_scores') AS scores
    `;
    if (!tableCheck[0]?.reviews || !tableCheck[0]?.scores) {
      throw new Error("screening_reviews tables missing on prod DB");
    }
    console.log("prod-db: screening_reviews + screening_review_scores tables exist");

    const candidates = await sql`
      SELECT
        si.id AS invitation_id,
        si.status,
        si.application_id,
        v.job_title,
        COUNT(sa.id)::int AS answer_count
      FROM screening_invitations si
      INNER JOIN vacancies v ON v.id = si.vacancy_id
      LEFT JOIN screening_answers sa ON sa.invitation_id = si.id
      WHERE si.status = 'submitted'
      GROUP BY si.id, si.status, si.application_id, v.job_title
      HAVING COUNT(sa.id) > 0
      ORDER BY si.submitted_at DESC NULLS LAST
      LIMIT 5
    `;

    if (candidates.length === 0) {
      console.warn(
        "prod-smoke: no submitted screenings with answers found — skip score round-trip (UI: invite → submit first)",
      );
    } else {
      const pick = candidates[0];
      console.log(
        `prod-db: found submitted screening ${pick.invitation_id} (${pick.job_title}, ${pick.answer_count} answers)`,
      );
      console.log(`prod-ui: ${base}/dashboard/screenings/${pick.invitation_id}`);

      const unauthPatch = await fetchJson(
        "PATCH",
        `/api/screenings/${encodeURIComponent(pick.invitation_id)}/review`,
        { body: JSON.stringify({ questionScores: [] }) },
      );
      if (unauthPatch.res.status !== 401) {
        throw new Error(
          `expected 401 on unauthenticated PATCH review, got ${unauthPatch.res.status}: ${unauthPatch.text.slice(0, 120)}`,
        );
      }
      console.log("prod-api: PATCH /api/screenings/[id]/review requires auth (401)");

      if (!recruiterEmail || !recruiterPassword) {
        console.warn(
          "prod-smoke: set SMOKE_RECRUITER_EMAIL + SMOKE_RECRUITER_PASSWORD in .env.release for automated score save round-trip",
        );
      } else {
        const login = await fetchJson("POST", "/api/auth/login", {
          body: JSON.stringify({ email: recruiterEmail, password: recruiterPassword }),
        });
        if (!login.res.ok) {
          throw new Error(`recruiter login failed ${login.res.status}: ${login.text.slice(0, 200)}`);
        }
        const cookie = login.res.headers.get("set-cookie");
        if (!cookie) throw new Error("login ok but no set-cookie header");

        const detail1 = await fetchJson(
          "GET",
          `/api/screenings/${encodeURIComponent(pick.invitation_id)}`,
          { headers: { cookie } },
        );
        if (!detail1.res.ok) {
          throw new Error(`GET screening detail failed ${detail1.res.status}: ${detail1.text.slice(0, 200)}`);
        }
        const inv = detail1.body.invitation;
        if (!inv?.answers?.length) {
          throw new Error("screening detail missing answers");
        }

        const questionScores = inv.answers.map((a, i) => ({
          questionId: a.questionId,
          score: 4,
          note: i === 0 ? "prod smoke note" : null,
        }));

        const patch = await fetchJson(
          "PATCH",
          `/api/screenings/${encodeURIComponent(pick.invitation_id)}/review`,
          {
            headers: { cookie },
            body: JSON.stringify({
              questionScores,
              reviewerNote: "Prod smoke screening review",
            }),
          },
        );
        if (!patch.res.ok) {
          throw new Error(`PATCH review failed ${patch.res.status}: ${patch.text.slice(0, 300)}`);
        }
        if (!patch.body.review?.overallScore) {
          throw new Error("PATCH review missing overallScore in response");
        }
        console.log(`prod-api: saved review overallScore=${patch.body.review.overallScore}`);

        const detail2 = await fetchJson(
          "GET",
          `/api/screenings/${encodeURIComponent(pick.invitation_id)}`,
          { headers: { cookie } },
        );
        if (!detail2.res.ok) {
          throw new Error(`GET screening after save failed ${detail2.res.status}`);
        }
        const saved = detail2.body.invitation?.review;
        if (!saved?.questionScores?.length || saved.overallScore !== patch.body.review.overallScore) {
          throw new Error("review did not persist on GET after PATCH");
        }
        const allFour = saved.questionScores.every((s) => s.score === 4);
        if (!allFour) throw new Error("persisted question scores mismatch");
        console.log("prod-api: review persisted after save (scores round-trip ok)");

        const followUp = await fetchJson("GET", "/api/screenings/follow-up", { headers: { cookie } });
        if (!followUp.res.ok) {
          throw new Error(`GET follow-up failed ${followUp.res.status}`);
        }
        const row = (followUp.body.items ?? []).find((i) => i.invitationId === pick.invitation_id);
        if (!row?.overallScore) {
          throw new Error("follow-up queue missing overallScore after save");
        }
        console.log(`prod-api: follow-up shows Scored ${row.overallScore}/5 for ${pick.job_title}`);
      }
    }

    console.log("smoke-screening-review-prod: ok");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
