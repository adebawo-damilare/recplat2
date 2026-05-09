# Next.js migration notes

## Why this migration

This project now uses Next.js App Router for:

- SEO-friendly public routes
- file-based page routing
- server route handlers for future backend APIs
- easier scaling with cache controls and stateless compute

## New runtime entrypoints

- `app/layout.tsx` (global metadata + shared nav/footer)
- `app/page.tsx` home route
- `app/jobs/page.tsx`, `app/talent/page.tsx`, `app/about/page.tsx`, `app/sign-in/page.tsx`
- `app/dashboard/company/page.tsx`, `app/dashboard/profile/page.tsx`

## API scaffolding

- `GET /api/health` health endpoint
- `GET /api/jobs` paginated jobs endpoint with cursor-based pagination and rate limiting (Postgres when `DATABASE_URL` is set, else Firestore-backed listing)
  - query params: `limit` (max 50), `cursor`
  - response includes `pagination.nextCursor`
  - rate limit: sliding window **120 requests / 60s** per client IP (proxied via `x-forwarded-for` / `x-real-ip`)
  - if `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set (see `.env.example`), limits are enforced with **Upstash** (distributed). Otherwise the app uses the **in-memory** limiter for local/dev.
- `POST /api/jobs`, `PATCH /api/jobs/[id]`, `GET /api/jobs/mine` — Postgres writes + Firebase ID token (`Authorization: Bearer …`) when Postgres + Admin are configured
- `POST /api/applications` — Postgres application row when configured
- `GET /api/ai/health` — reports AI provider wiring

See **`docs/ROADMAP.md`** for dual-backend rollout and tooling (`npm run db:apply`, `npm run smoke:api`).

For **Vercel / hosting env vars** (Postgres URL, optional Upstash, redeploy + smoke)—**without** auth setup—see **`docs/DEPLOYMENT_ENV.md`**.

GitHub Actions **CI** (lint + `next build` + Playwright) and **branch protection** are documented in **`docs/CICD.md`**.

## SEO primitives

- route metadata per page
- `app/sitemap.ts`
- `app/robots.ts`

## Commands

- `npm run dev` (Next dev server)
- `npm run build`
- `npm run start`
- `npm run test:e2e` — Playwright’s `webServer` sets `TALENTBRIDGE_E2E_STUB_FIRESTORE_JOBS=1` so `GET /api/jobs` does not hang on Firestore when no DB/network; use `CI=1 npm run test:e2e` (or unset `reuseExistingServer`) so a fresh dev server picks up that env instead of an already-running instance.
- `npm run db:apply`
- `npm run smoke:api`
- `npm run test:load`

## Concurrency hardening checklist

1. Move API reads/writes to Supabase service layer with strict pagination defaults.
2. ~~Distributed rate limiting:~~ configure Upstash env vars on Vercel for production parity across instances.
3. Add indexes for top traffic list/filter fields.
4. Add cache tags/revalidation for jobs list pages.
5. Push long-running workflows to background workers.