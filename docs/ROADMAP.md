# TalentBridge roadmap (data & API)

## Done (slices)

- Postgres schema + SQL migration for companies, vacancies, applications, `ai_audit_events` (`database/migrations/0001_initial.sql`).
- Drizzle schema + server DB client (`src/server/schema`, `src/server/db/postgres.ts`).
- Dual read path: `GET /api/jobs` and client listing use Postgres when `DATABASE_URL` is set, else Firestore.
- Write path for jobs: `POST /api/jobs`, `PATCH /api/jobs/[id]`, `GET /api/jobs/mine` with Firebase ID token verification (`FIREBASE_SERVICE_ACCOUNT_JSON`).
- Applications: `POST /api/applications` with the same auth pattern; client falls back to Firestore on 503 / known codes.
- AI provider switch + audit hooks (`TALENTBRIDGE_AI_PROVIDER`, `GET /api/ai/health`).
- Client bridge `src/lib/jobsApi.ts` (API first, resilient fallback).
- UI uses `jobsApi` for list / seed / apply / recruiter CRUD (TalentBridge components only).

## Tooling

- `npm run db:apply` — apply SQL migrations via `DATABASE_URL`
- `npm run db:seed:samples` — insert demo vacancies into Postgres (see `database/README.md`)
- `npm run smoke:api` — smoke `GET /api/health`, `GET /api/jobs`, `GET /api/ai/health` (set `SMOKE_BASE_URL` if not local)

## Next

1. Supabase Auth: replace Firebase Admin token verification on routes when ready; keep the same handler shape.
2. Expand schema (pipeline, screenings) only when product needs it — avoid premature tables.
3. E2E coverage for authenticated flows when Playwright test credentials are available in CI.

## E2E note

Playwright injects **`TALENTBRIDGE_E2E_STUB_FIRESTORE_JOBS=1`** on the spawned dev server (`playwright.config.ts`) so **`GET /api/jobs`** returns an empty page without calling Firestore (avoids hangs in CI / offline). For integration tests against real Firestore or Postgres, run the app without that env and point `DATABASE_URL` or ensure Firebase access.
