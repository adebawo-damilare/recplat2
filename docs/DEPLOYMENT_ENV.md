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

## Recommended model: `dev` = staging previews, `main` = production (one Vercel project + Neon)

Use a **single Vercel project**, **Git Production Branch = `main`**, and **two Neon databases** (production + a **Neon branch** or child database for staging):

| Git / Vercel | Deployment type | Env scope in Vercel | `DATABASE_URL` |
|--------------|-------------------|---------------------|----------------|
| **`main`** | Production (your prod domain or production `*.vercel.app`) | **Production** | Neon **primary** (production) connection string |
| **`dev`** (and any other non-`main` branch) | **Preview** (unique preview URL per deployment) | **Preview** | Neon **branch** (or dedicated staging DB)—**isolated from production** |

**Flow**

1. In Neon: create a **[branch](https://neon.tech/docs/guides/branching)** from your prod database (or maintain a separate staging root; either way isolates data from prod).
2. Copy the branch’s connection string into Vercel → **Environment Variables** → **`DATABASE_URL`** → enable **Preview** only (leave **Production** pointing at prod).
3. Duplicate **Jobs Slice–style** flags for **Preview** as well if staging should mirror prod behaviour: **`TALENTBRIDGE_JOBS_POSTGRES_ONLY=1`** and **`NEXT_PUBLIC_TALENTBRIDGE_JOBS_POSTGRES_ONLY=1`** (build-time for the client flag—Preview deployments need them on the Preview scope).
4. Apply migrations to the **Neon branch** whenever you change schema (`npm run db:apply` / `db:apply:categories` using that branch’s URL from your machine—or your provider’s SQL console).
5. Push or merge to **`dev`** → Vercel builds a **Preview** → open the preview URL → run **`npm run smoke:api`** / strict smoke against that URL.
6. When satisfied, merge **`dev` → `main`** (via PR, with CI green) → Vercel deploys **Production** with the **Production** `DATABASE_URL`.

**Caveat:** Vercel attaches **one set of Preview-scoped variables** to **every** Preview deployment. So a PR from `feature/foo` uses the **same** staging `DATABASE_URL` as `dev`—which is usually what you want for a single shared staging DB; if you ever need per-branch DBs, you need a separate mechanism (e.g. another project or custom pipeline).

**CI note:** GitHub Actions does **not** deploy your Vercel preview; it only validates the repo. **`smoke-postgres`** proves Postgres + migrations in CI—not your Neon branch. You still smoke the **preview URL** before promoting `dev` to `main`.

---

## Required for Postgres-backed jobs

| Variable         | Purpose |
|------------------|---------|
| `DATABASE_URL`   | Connection string to Neon (or Supabase Postgres, RDS, etc.). Prefer the provider’s **pooler** URL for serverless if they document one for Vercel. Include TLS options your host recommends (often `sslmode=require`). |

TalentBridge reads `DATABASE_URL` at runtime: when set, vacancy reads/writes use SQL; ensure the schema has been applied (`npm run db:apply` **and** when using category lanes, **`npm run db:apply:categories`** — see **`database/README.md`**).

**Jobs Slice v1 (production):** also set **`TALENTBRIDGE_JOBS_POSTGRES_ONLY=1`** and **`NEXT_PUBLIC_TALENTBRIDGE_JOBS_POSTGRES_ONLY=1`**, then redeploy so vacancy/application data never falls back to Firestore — **`docs/MVP_JOBS_SLICE_V1.md`**.

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

## Staging vs production databases (short)

- **Preferred (this repo’s doc):** single project, **Production** vs **Preview** env vars—see [Recommended model](#recommended-model-dev--staging-previews-main--production-one-vercel-project--neon) above.
- **Alternative:** two Vercel projects (staging app + prod app), each with its own DB URL.

Avoid pointing **Preview** at the **production** `DATABASE_URL` unless you deliberately accept preview traffic writing to prod.

---

## After deploy: smoke checks

From your machine (with Node 18+):

```bash
SMOKE_BASE_URL=https://your-deployment.vercel.app npm run smoke:api

# Tighter Jobs Slice rehearsal (Postgres wired; unauthenticated mine must be 401):
SMOKE_EXPECT_POSTGRES_READY=1 SMOKE_BASE_URL=https://your-deployment.vercel.app npm run smoke:api
```

Default `SMOKE_BASE_URL` targets `http://localhost:3000` if omitted.

This hits **`GET /api/health`**, **`GET /api/categories`**, **`GET /api/jobs`**, **`GET /api/ai/health`**, and **`GET /api/applications/mine`** (no token). Strict mode (**`SMOKE_EXPECT_POSTGRES_READY=1`**) also requires **`postgresConfigured: true`** on **`/api/ai/health`**.

---

## Local parity

Local development typically uses `.env.local` (not committed); `npm run dev` picks it up automatically. Align variable **names** with production so behaviour matches. For Neon schema changes, prefer `npm run db:apply` (see `database/README.md`).
