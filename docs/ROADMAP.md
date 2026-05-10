# TalentBridge roadmap (data & API)

**MVP narrative** (strategy synthesis + how it maps to this repo): **`docs/TALENTBRIDGE_MVP_PLAN.md`**.

**First public / paying milestone (named release):** **Jobs Slice v1** — **`docs/MVP_JOBS_SLICE_V1.md`** (Postgres for vacancies + applications; not Phase C hire loop).

What we took from the nested **`recruit/`** reference vs what we skipped is summarized in **`docs/REFERENCE_PARITY.md`**.

**Candidate backlog** mined from `recruit/docs` (PRD, system design, API outline, contracts, roadmap): **`docs/ROADMAP_FROM_REFERENCE.md`** (paired with **`docs/TALENTBRIDGE_MVP_PLAN.md`** for phase context).

**External strategy** (meetings, other tools): capture themes in **`docs/SUPPORTING_NOTES.md`** and **`docs/TALENTBRIDGE_MVP_PLAN.md`**; promote agreed work **here** (`ROADMAP.md`) when you want it executed.

## Done (slices)

- Postgres schema + SQL migration for companies, vacancies, applications, `ai_audit_events` (`database/migrations/0001_initial.sql`).
- **Category lanes (synthesis wedge):** `categories` table + `vacancies.category_id`, `GET /api/categories`, `GET /api/jobs?category=`, optional `categorySlug` on vacancy writes — see **`docs/CATEGORY_MODEL.md`** and `database/migrations/0002_categories.sql`.
- Drizzle schema split under `src/server/schema/*` (+ server DB client `src/server/db/postgres.ts`).
- Dual read path (**local default**): `GET /api/jobs` uses Postgres when `DATABASE_URL` is set, else Firestore — **overridden** when **`TALENTBRIDGE_JOBS_POSTGRES_ONLY=1`** (**Jobs Slice v1** prod).
- Write path for jobs: `POST /api/jobs`, `PATCH /api/jobs/[id]`, `GET /api/jobs/mine` with Firebase ID token verification (`FIREBASE_SERVICE_ACCOUNT_JSON`).
- Applications: `POST /api/applications`, **`GET /api/applications/mine`**. Client Firestore fallbacks for job/app data disabled when **`NEXT_PUBLIC_TALENTBRIDGE_JOBS_POSTGRES_ONLY=1`** (`src/lib/talentBridgeApiMode.ts`).
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

## Next

1. Promote **`recruit/docs/`** structural items (**`category_fields`, candidate profiles, invitations/screening, pipeline**) per **`docs/TALENTBRIDGE_MVP_PLAN.md`** phases B–D when prioritized (see **`docs/ROADMAP_FROM_REFERENCE.md`** P0).
2. Supabase Auth: replace Firebase Admin token verification on routes when ready; keep the same handler shape.
3. Expand schema (pipeline, screenings) only when product needs it — avoid premature tables.
4. Search index / workers deferred until discovery scale phase (**`TALENTBRIDGE_MVP_PLAN.md`** §6).
5. E2E coverage for authenticated flows when Playwright test credentials are available in CI.

## E2E note

Playwright injects **`TALENTBRIDGE_E2E_STUB_FIRESTORE_JOBS=1`** on the spawned dev server (`playwright.config.ts`) so **`GET /api/jobs`** returns an empty page without calling Firestore (avoids hangs in CI / offline). For integration tests against real Firestore or Postgres, run the app without that env and point `DATABASE_URL` or ensure Firebase access.
