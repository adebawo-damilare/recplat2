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
- Firebase **Authentication** (sign-in) for now — identity is still Firebase; **job + application rows** are Postgres  

## Scope (out for this milestone)

- Firestore as the source of truth for vacancies or applications in **production**  
- Phase C marketplace loop (invites, screening, pipeline)  
- Replacing Firebase Auth (see `docs/ROADMAP.md` — Supabase or other later)  

---

## Production configuration (Postgres-only job data)

Set **both** so the server never reads vacancy data from Firestore and the browser does not fall back to Firestore for jobs/applications:

| Variable | Where | Purpose |
|----------|--------|---------|
| `DATABASE_URL` | Server (e.g. Vercel) | Postgres connection |
| `TALENTBRIDGE_JOBS_POSTGRES_ONLY=1` | Server | `GET /api/jobs` and related server paths require Postgres |
| `NEXT_PUBLIC_TALENTBRIDGE_JOBS_POSTGRES_ONLY=1` | Server **build-time** | Client skips Firestore fallbacks in `src/lib/jobsApi.ts` and `applicationsApi.ts` |

Also required for authenticated API writes:

- `FIREBASE_SERVICE_ACCOUNT_JSON` (or path-based equivalent) — see `.env.example`  
- Apply migrations: `npm run db:apply` then `npm run db:apply:categories`

**Note:** Candidate **profile** data may still use Firestore in the UI until migrated; Jobs Slice v1 standardizes **vacancies + applications** on Postgres.

---

## Release checklist

1. **Merge** via `dev` → PR → `main` with CI green (`docs/CICD.md`).  
2. **Prod env:** `DATABASE_URL`, Firebase Admin JSON, **`TALENTBRIDGE_JOBS_POSTGRES_ONLY=1`**, **`NEXT_PUBLIC_TALENTBRIDGE_JOBS_POSTGRES_ONLY=1`** (redeploy after adding `NEXT_PUBLIC_*`).  
3. **Migrations** applied against production DB (`database/README.md`).  
4. **Smoke:** `SMOKE_BASE_URL=https://<your-host> npm run smoke:api`; for a tighter check that Postgres backs jobs + mine, **`SMOKE_EXPECT_POSTGRES_READY=1`** (server must expose `DATABASE_URL`; expect **401** on `/api/applications/mine` without a token).
5. **Sanity:** post a vacancy, browse, apply, confirm row in **`applications`** and list on candidate dashboard when signed in.

---

## Local development (optional dual mode)

Omit `TALENTBRIDGE_JOBS_POSTGRES_ONLY` and `NEXT_PUBLIC_TALENTBRIDGE_JOBS_POSTGRES_ONLY` to keep **legacy** Firestore fallbacks when `DATABASE_URL` is missing (useful for quick UI work).

---

## APIs added for this slice

- **`GET /api/applications/mine`** — Bearer token; returns applications joined to vacancy payloads from Postgres  

---

## Related docs

- `docs/TALENTBRIDGE_MVP_PLAN.md` — full roadmap; Jobs Slice v1 ≈ hardened **Phase A**  
- `docs/ROADMAP.md` — execution backlog  
- `docs/DEPLOYMENT_ENV.md` — Vercel variables (Preview = staging Neon branch, Production = prod DB)  
- `docs/CATEGORY_MODEL.md` — talent lanes  
