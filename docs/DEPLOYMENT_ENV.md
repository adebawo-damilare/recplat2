# Deployment environment variables (reference)

How to configure **TalentBridge on Vercel** (or similar hosts): server-side secrets, Postgres, optional Redis for rate limiting, then verify with a smoke check.

Auth credentials are covered here at the env-name level: set **`TALENTBRIDGE_AUTH_SECRET`** (>=32 chars) in each deployed scope that serves authenticated APIs.

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

### Preview smoke checklist (ensure this deployment is safe)

**Goal:** Prove the **specific** Vercel Preview build—not CI’s throwaway Postgres—is healthy and sees your **Neon branch** with the right env.

1. **Use the deployment URL for the commit you care about** — Vercel → **Deployments** → find the row for branch **`dev`** (or your PR) and **Ready** → **Visit** → copy the hostname (e.g. `foo-git-dev-….vercel.app`). Do not reuse an old tab from a previous deployment after you’ve changed env vars or migrations.
2. **Confirm migrations ran on the Neon branch** — If you shipped SQL changes, apply them to the **Preview** `DATABASE_URL` target before expecting smoke to pass (`database/README.md`).
3. **Run API smoke against that URL** (from this repo, Node 18+):

   ```bash
   SMOKE_BASE_URL=https://<your-preview-host> npm run smoke:api
   SMOKE_EXPECT_POSTGRES_READY=1 SMOKE_BASE_URL=https://<your-preview-host> npm run smoke:api
   ```

   Strict mode proves the **hosted** app reports **`postgresConfigured: true`** and returns **401** on **`GET /api/applications/mine`** without a token (same expectations as Jobs Slice staging/prod).
4. **Quick product pass (optional but high signal)** — Sign in on the preview, post or open a job, apply once, confirm **`applications`** / candidate UI. Catches Preview-only auth or client env issues smoke does not cover.
5. **Make it a gate** — Don’t merge **`dev` → `main`** until steps 1–3 pass for **that** preview. For teams: add the preview URL + “smoke ✅” to the PR description or use a short **release checklist** in the PR template.

**Automation:** Workflow **`.github/workflows/preview-smoke.yml`** runs **`scripts/smoke-api.mjs`** against the deployment URL when Vercel sends **`repository_dispatch`** **`vercel.deployment.success`** (recommended integration; see [Vercel → Git → repository dispatch](https://vercel.com/docs/git/vercel-for-github#repository-dispatch-events)). Preview / non-`production` deployments use **`SMOKE_EXPECT_POSTGRES_READY=1`**; **Production** deployments skip this job so prod isn’t probed on every merge (run smoke manually against prod if you want parity).

**Vercel setup**

1. GitHub app / Git integration must be allowed to trigger **`repository_dispatch`** (Vercel’s current default path for deployment events). If you previously disabled related events, re-enable per [Vercel GitHub docs](https://vercel.com/docs/git/vercel-for-github#repository-dispatch-events).

2. **[Deployment Protection](https://vercel.com/docs/deployment-protection)** on previews blocks GitHub’s runners unless you use **[Protection bypass for automation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation)**: generate a bypass secret in the Vercel project, store the **same value** in GitHub → **repository secrets** → **`VERCEL_AUTOMATION_BYPASS_SECRET`**. The **Preview smoke** workflow and **`scripts/smoke-api.mjs`** send **`x-vercel-protection-bypass`** automatically when that env var is set. Without it (and with protection enabled), smoke will see **401/403**.

**Manual fallback:** **Actions → Preview smoke → Run workflow** with the preview URL, or run the same `npm run smoke:api` commands locally as above.

---

## Required for Postgres-backed jobs

| Variable         | Purpose |
|------------------|---------|
| `DATABASE_URL`   | Connection string to Neon (or Supabase Postgres, RDS, etc.). Prefer the provider’s **pooler** URL for serverless if they document one for Vercel. Include TLS options your host recommends (often `sslmode=require`). |

TalentBridge reads `DATABASE_URL` at runtime: when set, vacancy reads/writes use SQL; ensure the schema has been applied (`npm run db:apply` **and** when using category lanes, **`npm run db:apply:categories`** — see **`database/README.md`**).

**Jobs Slice v1 (production):** also set **`TALENTBRIDGE_JOBS_POSTGRES_ONLY=1`**, **`NEXT_PUBLIC_TALENTBRIDGE_JOBS_POSTGRES_ONLY=1`**, and **`TALENTBRIDGE_AUTH_SECRET`**, then redeploy.

---

## Optional: role admin controls (recruiter allowlist)

These variables gate the `/api/admin/users/role` endpoint and the **Role Management** card on the company dashboard. `GET /api/auth/session` includes **`canManageUserRoles: true|false`** (same allowlist rules) so the UI only renders that panel for allowlisted recruiters.

| Variable | Purpose |
|----------|---------|
| `TALENTBRIDGE_ENABLE_ROLE_ADMIN` | Set to `1` to enable role-management operations. Any other value disables changes and returns `403 FORBIDDEN_ROLE_ADMIN`. |
| `TALENTBRIDGE_ROLE_ADMIN_EMAILS` | Comma-separated allowlist of recruiter emails allowed to change user roles, e.g. `admin@company.com,ops@company.com`. Comparison is case-insensitive and whitespace is trimmed. |

Safety behavior:

- Caller must be an authenticated recruiter **and** in `TALENTBRIDGE_ROLE_ADMIN_EMAILS`.
- Self-role changes are blocked.
- Changes are audit-logged (`user.role_changed` in `ai_audit_events`).

After updating these values, redeploy so runtime picks them up.

---

## Optional: email notifications (Resend)

When set, screening and other **`createNotification`** calls still write in-app delivery, then attempt outbound email and log **`notification_delivery_log`** with **`channel: email`** (`sent`, `failed`, or `skipped`).

| Variable | Purpose |
|----------|---------|
| `TALENTBRIDGE_EMAIL_ENABLED` | Set to `1` to enable sends (still requires API key + from address). |
| `RESEND_API_KEY` | [Resend](https://resend.com) API key. |
| `TALENTBRIDGE_EMAIL_FROM` | Verified sender, e.g. `TalentBridge <notifications@yourdomain.com>`. |
| `TALENTBRIDGE_APP_URL` or `NEXT_PUBLIC_APP_URL` | Optional base URL appended to notification links in email body. |

Redeploy after changing these values.

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

For **Preview (staging)** vs **Production**, use the **exact** deployment URL and follow the **[Preview smoke checklist](#preview-smoke-checklist-ensure-this-deployment-is-safe)** above.

From your machine (with Node 18+):

```bash
SMOKE_BASE_URL=https://your-deployment.vercel.app npm run smoke:api

# Tighter Jobs Slice rehearsal (Postgres wired; unauthenticated mine must be 401):
SMOKE_EXPECT_POSTGRES_READY=1 SMOKE_BASE_URL=https://your-deployment.vercel.app npm run smoke:api
```

Default `SMOKE_BASE_URL` targets `http://localhost:3000` if omitted.

This hits **`GET /api/health`**, **`GET /api/categories`**, **`GET /api/jobs`**, **`GET /api/jobs/{id}`** when the list returns an id, **`GET /api/ai/health`**, and **`GET /api/applications/mine`** (no token). Strict mode (**`SMOKE_EXPECT_POSTGRES_READY=1`**) also requires **`postgresConfigured: true`** on **`/api/ai/health`**.

---

## Local parity

Local development typically uses `.env.local` (not committed); `npm run dev` picks it up automatically. Align variable **names** with production so behaviour matches. For Neon schema changes, prefer `npm run db:apply` (see `database/README.md`).
