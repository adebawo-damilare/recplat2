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
- Postgres job path: `GET /api/jobs`, `POST /api/jobs`, `PATCH /api/jobs/[id]`, `GET /api/jobs/mine`.
- Postgres applications path: `POST /api/applications`, **`GET /api/applications/mine`**.
- Postgres auth path: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`; protected routes use signed session verification.
- Role separation + server-side authorization (`candidate` vs `recruiter`) and allowlisted recruiter role-management endpoint (`/api/admin/users/role`) with audit logging.
- AI provider switch + audit hooks (`TALENTBRIDGE_AI_PROVIDER`, `GET /api/ai/health`).
- Client bridges `src/lib/jobsApi.ts`, **`src/lib/applicationsApi.ts`**.
- UI uses `jobsApi` for list / seed / apply / recruiter CRUD (TalentBridge components only).

## Tooling

- `npm run db:apply` — apply default SQL migration (`0001_initial`) via `DATABASE_URL`
- `npm run db:apply:categories` — apply `0002_categories.sql` after `0001`
- `npm run db:seed:samples` — insert demo vacancies into Postgres (see `database/README.md`)
- `npm run smoke:api` — smoke `/api/health`, `/api/categories`, `/api/jobs`, `/api/ai/health`, **`GET /api/applications/mine`** (unauthenticated); optional **`SMOKE_EXPECT_POSTGRES_READY=1`** for staging/prod rehearsals (requires `DATABASE_URL` on server + `postgresConfigured: true`; **401** on mine). Same strict mode runs in **`CI` → job `smoke-postgres`**.
- GitHub **`CI`** workflow (`.github/workflows/ci.yml`): lint → `npm run build` → Playwright; see **`docs/CICD.md`**.

## MVP documentation

- **`docs/TALENTBRIDGE_MVP_PLAN.md`** — single place for MVP vision, phased delivery, MVP in/out/defer, AI posture, technical shape, and formal doc sequencing (strategy synthesis + **`recruit/docs`** alignment).
- **`docs/MVP_JOBS_SLICE_V1.md`** — Jobs Slice v1 release: scope, env flags (`TALENTBRIDGE_JOBS_POSTGRES_ONLY`), checklist.  
- **`docs/RELEASE_JOBS_SLICE_V1.md`** — ordered **prod** runbook (merge `dev` → `main`, prod migrations, smoke, manual gate).

## Next

1. **Ship Jobs Slice v1** using **`docs/RELEASE_JOBS_SLICE_V1.md`** when Preview is already verified (then pick backbone track A/B/C/D from prior planning).  
2. Promote **`recruit/docs/`** structural items (**`category_fields`, candidate profiles, invitations/screening, pipeline**) per **`docs/TALENTBRIDGE_MVP_PLAN.md`** phases B–D when prioritized (see **`docs/ROADMAP_FROM_REFERENCE.md`** P0).
3. Optional future auth upgrade: add SSO/provider-backed auth while preserving current route contracts.
4. Expand schema (pipeline, screenings) only when product needs it — avoid premature tables.
5. Search index / workers deferred until discovery scale phase (**`TALENTBRIDGE_MVP_PLAN.md`** §6).
6. E2E coverage for authenticated flows when Playwright test credentials are available in CI.

## E2E note

Playwright injects **`TALENTBRIDGE_E2E_STUB_FIRESTORE_JOBS=1`** on the spawned dev server (`playwright.config.ts`) so **`GET /api/jobs`** returns an empty page during CI/offline runs.
