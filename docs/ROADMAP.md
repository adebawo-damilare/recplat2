# TalentBridge roadmap (data & API)

**MVP narrative** (strategy synthesis + how it maps to this repo): **`docs/TALENTBRIDGE_MVP_PLAN.md`**.

**First public / paying milestone (named release):** **Jobs Slice v1** — **`docs/MVP_JOBS_SLICE_V1.md`** (Postgres for vacancies + applications; not Phase C hire loop). **Production go-live steps:** **`docs/RELEASE_JOBS_SLICE_V1.md`**.

What we took from the nested **`recruit/`** reference vs what we skipped is summarized in **`docs/REFERENCE_PARITY.md`**.

**Candidate backlog** mined from `recruit/docs` (PRD, system design, API outline, contracts, roadmap): **`docs/ROADMAP_FROM_REFERENCE.md`** (paired with **`docs/TALENTBRIDGE_MVP_PLAN.md`** for phase context).

**External strategy** (meetings, other tools): capture themes in **`docs/SUPPORTING_NOTES.md`** and **`docs/TALENTBRIDGE_MVP_PLAN.md`**; promote agreed work **here** (`ROADMAP.md`) when you want it executed.

## Done (slices)

- Postgres schema + SQL migration for companies, vacancies, applications, `ai_audit_events` (`database/migrations/0001_initial.sql`).
- **Category lanes (synthesis wedge):** `categories` table + `vacancies.category_id`, `GET /api/categories`, `GET /api/jobs?category=`, optional `categorySlug` on vacancy writes — see **`docs/CATEGORY_MODEL.md`** and `database/migrations/0002_categories.sql`.
- Drizzle schema split under `src/server/schema/*` (+ server DB client `src/server/db/postgres.ts`).
- Postgres job path: `GET /api/jobs` (query: `category`, `q`, `jobType`, `includeTotal=1`, cursor pagination), `POST /api/jobs`, `PATCH /api/jobs/[id]`, `GET /api/jobs/mine`, **`GET /api/jobs/[id]`** (public read for **open** vacancies only; `404` + `NOT_FOUND` otherwise).
- **Public job detail + discovery polish:** `/jobs/[id]` page (metadata + apply), home/job-board links to detail, Next **`/jobs`** query sync for **`category`**, **`jobType`**, and **`q`** (debounced URL updates; `q` re-hydrates on first load, lane/type URL changes, and **popstate**—not on every `q`-only param change—so typing is not clobbered). Smoke hits **`GET /api/jobs/:id`** when the list returns an id.
- Postgres applications path: `POST /api/applications`, **`GET /api/applications/mine`**, recruiter pipeline **`GET /api/applications/board`**, **`PATCH /api/applications/[id]`** (`applications.status`).
- Postgres auth path: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`; protected routes use signed session verification.
- Role separation + server-side authorization (`candidate` vs `recruiter`) and allowlisted recruiter role-management endpoint (`/api/admin/users/role`) with audit logging.
- AI provider switch + audit hooks (`TALENTBRIDGE_AI_PROVIDER`, `GET /api/ai/health`).
- Client bridges `src/lib/jobsApi.ts`, **`src/lib/applicationsApi.ts`**.
- UI uses `jobsApi` for list / seed / apply / recruiter CRUD (TalentBridge components only).

## Tooling

- `npm run db:apply` — apply default SQL migration (`0001_initial`) via `DATABASE_URL`
- `npm run db:apply:categories` — apply `0002_categories.sql` after `0001`
- `npm run db:seed:samples` — insert demo vacancies into Postgres (see `database/README.md`)
- `npm run smoke:api` — smoke `/api/health`, `/api/categories`, `/api/jobs`, **`GET /api/jobs/{id}`** when the list returns a job id, `/api/ai/health`, **`GET /api/applications/mine`** (unauthenticated); optional **`SMOKE_EXPECT_POSTGRES_READY=1`** for staging/prod rehearsals (requires `DATABASE_URL` on server + `postgresConfigured: true`; **401** on mine). Same strict mode runs in **`CI` → job `smoke-postgres`**.
- GitHub **`CI`** workflow (`.github/workflows/ci.yml`): lint → `npm run build` → Playwright; see **`docs/CICD.md`**.

## MVP documentation

- **`docs/TALENTBRIDGE_MVP_PLAN.md`** — single place for MVP vision, phased delivery, MVP in/out/defer, AI posture, technical shape, and formal doc sequencing (strategy synthesis + **`recruit/docs`** alignment).
- **`docs/MVP_JOBS_SLICE_V1.md`** — Jobs Slice v1 release: scope, env flags (`TALENTBRIDGE_JOBS_POSTGRES_ONLY`), checklist.  
- **`docs/RELEASE_JOBS_SLICE_V1.md`** — ordered **prod** runbook (merge `dev` → `main`, prod migrations, smoke, manual gate).

## Next

**Near term (Jobs Slice UX / quality):** Playwright for **`/jobs/[id]`** is in **`e2e/authenticated/candidate-job-detail.spec.ts`** (real **Apply** click + **`POST /api/applications`**; `window.__TALENTBRIDGE_E2E_NO_ALERTS` avoids blocking `alert()` in automation). Expand **`e2e/api.spec.ts`** as new public query params ship.

**Authenticated E2E (Playwright):** run locally with **`npm run test:e2e:auth`** when **`.env.local`** has **`DATABASE_URL`** + **`TALENTBRIDGE_AUTH_SECRET`** (Next loads them for **`npm run dev`**). CI runs the same path in **`smoke-postgres`** after **`E2E_RUN_AUTH=1`** (see **`docs/CICD.md`**). Specs live under **`e2e/authenticated/`** (candidate apply/board/detail/dashboard; recruiter dashboard, **`recruiter-vacancies`**, **`recruiter-pipeline`** including **`PATCH /api/applications/[id]`**, **`recruiter-post-vacancy`** UI **`POST /api/jobs`**). Session seeding is **`e2e/auth.setup.ts`**: two vacancies plus a candidate **`POST /api/applications`** against the “apply” vacancy so the recruiter pipeline table is non-empty.

1. **Ship Jobs Slice v1** using **`docs/RELEASE_JOBS_SLICE_V1.md`** when Preview is already verified (then pick backbone track A/B/C/D from prior planning).  
2. Promote **`recruit/docs/`** structural items (**`category_fields`, candidate profiles, invitations/screening, pipeline**) per **`docs/TALENTBRIDGE_MVP_PLAN.md`** phases B–D when prioritized (see **`docs/ROADMAP_FROM_REFERENCE.md`** P0).
3. Optional future auth upgrade: add SSO/provider-backed auth while preserving current route contracts.
4. Expand schema (pipeline, screenings) only when product needs it — avoid premature tables.
5. Search index / workers deferred until discovery scale phase (**`TALENTBRIDGE_MVP_PLAN.md`** §6).
6. Keep expanding **authenticated Playwright** (e.g. more recruiter CRUD and pipeline edge cases); baseline is **`e2e/authenticated/`** + **`e2e/auth.setup.ts`** (see **E2E note**).

## E2E note

Playwright injects **`TALENTBRIDGE_E2E_STUB_FIRESTORE_JOBS=1`** on the spawned dev server (`playwright.config.ts`) so **`GET /api/jobs`** returns an empty page during CI/offline runs. **`e2e/api.spec.ts`** still asserts **`GET /api/jobs/{id}`** `404`/`NOT_FOUND` and invalid **`jobType`** `400` when the jobs API is up (skips when **`503`**). **`e2e/navigation.spec.ts`** covers **`/jobs`** URL hydration for **`jobType`** and **`q`**.

**Authenticated flows:** with **`E2E_RUN_AUTH=1`**, the config adds a **`setup`** project (**`e2e/auth.setup.ts`**) that registers **recruiter + candidate**, seeds **two open vacancies** (board apply vs job-detail flows), has the candidate **`POST /api/applications`** for the apply vacancy (so **`/dashboard/company`** pipeline has a row), and writes **`e2e/.auth/recruiter.json`** + **`e2e/.auth/candidate.json`**, then runs specs under **`e2e/authenticated/`** with the matching storage state per project. **`chromium-auth-candidate`** and **`chromium-auth-recruiter`** each run **serially** within the project (`fullyParallel: false`) to reduce API contention. Locally use **`npm run test:e2e:auth`**. In GitHub Actions, **`smoke-postgres`** sets **`E2E_RUN_AUTH=1`** and **`PLAYWRIGHT_NO_WEBSERVER=1`** so Playwright attaches to the **`next start`** process already bound to port 3000 (see **`docs/CICD.md`**). The default **`quality`** job runs **`npm run test:e2e`** without **`E2E_RUN_AUTH`**, so only public/unauthenticated browser tests run there.
