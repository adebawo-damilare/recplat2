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
- `GET /api/jobs` paginated jobs endpoint with cursor-based pagination and rate limiting
  - query params: `limit` (max 50), `cursor`
  - response includes `pagination.nextCursor`
  - rate limit: sliding window **120 requests / 60s** per client IP (proxied via `x-forwarded-for` / `x-real-ip`)
  - if `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set (see `.env.example`), limits are enforced with **Upstash** (distributed). Otherwise the app uses the **in-memory** limiter for local/dev.

## SEO primitives

- route metadata per page
- `app/sitemap.ts`
- `app/robots.ts`

## Commands

- `npm run dev` (Next dev server)
- `npm run build`
- `npm run start`
- `npm run test:e2e`
- `npm run test:load`

## Concurrency hardening checklist

1. Move API reads/writes to Supabase service layer with strict pagination defaults.
2. ~~Distributed rate limiting:~~ configure Upstash env vars on Vercel for production parity across instances.
3. Add indexes for top traffic list/filter fields.
4. Add cache tags/revalidation for jobs list pages.
5. Push long-running workflows to background workers.