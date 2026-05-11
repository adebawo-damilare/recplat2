# Jobs Slice v1 — first paying / public milestone

**Name:** **Jobs Slice v1** (not “full hire-loop MVP” / **Phase C** in `docs/TALENTBRIDGE_MVP_PLAN.md`).

**What it is:** Publishable product for **posting vacancies, browsing, filtering by talent lane, applying, and recruiter CRUD** with **Postgres** as the system of record for vacancy and application data.

**What it is not:** Invitations, screening sessions, pipeline stages, search index, or full candidate profiles in Postgres (those stay on the roadmap for later phases).

---

## Scope (in)

- Public job listing + category filter + job detail patterns in the current UI  
- Recruiter create / edit / close vacancies (API + UI)  
- Candidate apply → **`applications`** row in Postgres  
- Candidate “my applications” via **`GET /api/applications/mine`** (Postgres) when `DATABASE_URL` is set  
- MVP talent lanes (**marketers** / **designers** / **sales**) on vacancies — `docs/CATEGORY_MODEL.md`  
- Postgres-native authentication (JWT session cookie) with users stored in Postgres  

## Scope (out for this milestone)

- Phase C marketplace loop (invites, screening, pipeline)  
- Replacing this simple auth model with a more advanced provider/SSO stack (future roadmap item)  

---

## Production configuration (Postgres-only job data)

Set **both** to keep production running in strict Postgres mode for jobs/applications:

| Variable | Where | Purpose |
|----------|--------|---------|
| `DATABASE_URL` | Server (e.g. Vercel) | Postgres connection |
| `TALENTBRIDGE_JOBS_POSTGRES_ONLY=1` | Server | `GET /api/jobs` and related server paths require Postgres |
| `NEXT_PUBLIC_TALENTBRIDGE_JOBS_POSTGRES_ONLY=1` | Server **build-time** | Client treats job/application API failures as hard failures (no legacy fallback) |

Also required for authenticated API writes:

- `TALENTBRIDGE_AUTH_SECRET` (>=32 chars) — see `.env.example`  
- Apply migrations: `npm run db:apply`, `npm run db:apply:categories`, `npm run db:apply:users`

**Note:** Candidate profile data is now served by Postgres-backed routes (`/api/candidates/*`).

If vacancy writes fail, check `/api/jobs` response codes in Network and confirm `DATABASE_URL` + `TALENTBRIDGE_AUTH_SECRET` are set in the deployment environment.

---

## Release checklist

Step-by-step order (merge, prod env, migrations, smoke, manual path): **`docs/RELEASE_JOBS_SLICE_V1.md`**.

Summary:

1. **Merge** via `dev` → PR → `main` with CI green (`docs/CICD.md`).  
2. **Prod env:** `DATABASE_URL`, `TALENTBRIDGE_AUTH_SECRET`, **`TALENTBRIDGE_JOBS_POSTGRES_ONLY=1`**, **`NEXT_PUBLIC_TALENTBRIDGE_JOBS_POSTGRES_ONLY=1`** (redeploy after adding `NEXT_PUBLIC_*`).  
3. **Migrations** applied against production DB (`database/README.md`).  
4. **Smoke:** `SMOKE_BASE_URL=https://<your-host> npm run smoke:api`; for a tighter check that Postgres backs jobs + mine, **`SMOKE_EXPECT_POSTGRES_READY=1`** (server must expose `DATABASE_URL`; expect **401** on `/api/applications/mine` without a token).
5. **Sanity:** post a vacancy, browse, apply, confirm row in **`applications`** and list on candidate dashboard when signed in.

---

## Local development (optional dual mode)

Keep `DATABASE_URL` set in all active environments for consistent behavior.

---

## APIs added for this slice

- **`GET /api/applications/mine`** — Bearer token; returns applications joined to vacancy payloads from Postgres  

---

## Related docs

- `docs/RELEASE_JOBS_SLICE_V1.md` — **ordered production release runbook** (use for “release first”)  
- `docs/TALENTBRIDGE_MVP_PLAN.md` — full roadmap; Jobs Slice v1 ≈ hardened **Phase A**  
- `docs/ROADMAP.md` — execution backlog  
- `docs/DEPLOYMENT_ENV.md` — Vercel variables (Preview = staging Neon branch, Production = prod DB)  
- `docs/CATEGORY_MODEL.md` — talent lanes  
