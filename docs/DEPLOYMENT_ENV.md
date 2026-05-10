# Deployment environment variables (reference)

How to configure **TalentBridge on Vercel** (or similar hosts): server-side secrets, Postgres, optional Redis for rate limiting, then verify with a smoke check.

Firebase / auth credentials are intentionally **not** covered here—configure those separately in the same “Environment Variables” UI when you adopt your chosen auth setup.

---

## Where to set values

1. Vercel → your **project** → **Settings** → **Environment Variables**.
2. For each variable, choose scope: **Production**, **Preview**, and/or **Development** depending on whether PR previews should use staging vs prod resources.
3. Mark sensitive values so Vercel stores them encrypted (recommended for URLs with passwords).

**Important:** Changing variables does **not** update already-built deployments by itself. Trigger a **new deployment** (e.g. **Deployments** → menu on latest → **Redeploy**) after edits.

---

## Required for Postgres-backed jobs

| Variable         | Purpose |
|------------------|---------|
| `DATABASE_URL`   | Connection string to Neon (or Supabase Postgres, RDS, etc.). Prefer the provider’s **pooler** URL for serverless if they document one for Vercel. Include TLS options your host recommends (often `sslmode=require`). |

TalentBridge reads `DATABASE_URL` at runtime: when set, vacancy reads/writes use SQL; ensure the schema has been applied (`npm run db:apply` **and** when using category lanes, **`npm run db:apply:categories`** — see **`database/README.md`**). Product context: **`docs/TALENTBRIDGE_MVP_PLAN.md`**, **`docs/CATEGORY_MODEL.md`**.

---

## Optional: distributed rate limiting

Without these, `/api/jobs` uses an **in-process** sliding window limiter—fine for a single warm instance or local dev.

| Variable                    | Purpose |
|----------------------------|---------|
| `UPSTASH_REDIS_REST_URL`   | Redis REST endpoint from [Upstash](https://upstash.com). |
| `UPSTASH_REDIS_REST_TOKEN` | Matching REST token. |

---

## Optional: app URL / SEO

If you serve a public production URL distinct from placeholders in code:

| Variable                 | Purpose |
|--------------------------|---------|
| `NEXT_PUBLIC_APP_URL`    | Canonical / sitemap base (see `app/` metadata and `app/sitemap.ts`). |

Adjust only what your codebase actually reads; check `.env.example` for optional AI or other keys unrelated to Postgres.

---

## Staging vs production databases

Recommended patterns:

- **Same Vercel project:** set different `DATABASE_URL` values under **Production** vs **Preview** so PRs hit a Neon **branch** / staging DB.
- **Two Vercel projects:** staging app + prod app, each with its own Neon database and URLs.

Avoid sharing one production DB with unrestricted preview deployments unless you intend to.

---

## After deploy: smoke checks

From your machine (with Node 18+):

```bash
SMOKE_BASE_URL=https://your-deployment.vercel.app npm run smoke:api
```

Default `SMOKE_BASE_URL` targets `http://localhost:3000` if omitted.

This hits `GET /api/health`, `GET /api/jobs`, and `GET /api/ai/health`. Ensure `DATABASE_URL` is correct on Vercel if you expect Postgres-backed listings.

---

## Local parity

Local development typically uses `.env.local` (not committed); `npm run dev` picks it up automatically. Align variable **names** with production so behaviour matches. For Neon schema changes, prefer `npm run db:apply` (see `database/README.md`).
