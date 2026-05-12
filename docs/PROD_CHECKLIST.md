# Production Manual Checklist (Postgres + Session Auth)

Use this checklist after deploy (for example: `https://recplat2.vercel.app`).

**Automation:** `scripts/run-prod-checklist.mjs` (via `npx dotenv-cli -o -e .env.release -- node scripts/run-prod-checklist.mjs`) hits the same API and DB checks, including **application pipeline** (`GET /api/applications/board`, `PATCH /api/applications/[id]`, candidate `status` after update, `vacancyId` filter, candidate forbidden on board).

**Production mutations (opt-in):** the script registers users, creates a vacancy, applies, updates pipeline state, and queries Postgres. When your release file targets **production**, set `PROD_CHECKLIST_ORIGIN` in `.env.release` to the same site origin as `SMOKE_BASE_URL` (for example `https://recplat2.vercel.app`), and set **`ALLOW_PROD_CHECKLIST_MUTATIONS=1`** to confirm. If the origins match and the flag is not set, the script exits before any request. For preview or staging URLs, either leave `PROD_CHECKLIST_ORIGIN` empty or point it at a non-matching origin so the gate does not apply.

### What “prod mutations” means (bookmark)

**Mutations** here means **writes and state changes**, not read-only checks like `GET /api/health`.

When `run-prod-checklist.mjs` runs against **production** (`SMOKE_BASE_URL` + `DATABASE_URL` in `.env.release`), it intentionally performs **real HTTP writes** to the live app, for example:

- `POST /api/auth/register` — creates **real user rows** in Postgres
- `PATCH /api/candidates/me` — updates a **real candidate profile**
- `POST /api/jobs` — creates a **real vacancy**
- `PATCH /api/jobs/[id]` — edits that vacancy
- `POST /api/applications` — creates a **real application**
- `PATCH /api/applications/[id]` — changes application status (e.g. pipeline stage)

It also runs **direct SQL reads** against `DATABASE_URL` to verify those writes landed. That is not a mutation by itself, but it only makes sense after the script has **mutated** prod data above.

**Prod** means the deployment and database you pointed the script at (typically real users’ environment), not a disposable local or preview database.

That is why **`ALLOW_PROD_CHECKLIST_MUTATIONS=1`** exists when `PROD_CHECKLIST_ORIGIN` matches `SMOKE_BASE_URL`: the checklist is a **strong verification tool**, not a passive smoke test, and it **leaves test users, jobs, and applications** in the database until you clean them up.

## 1) Public health checks

- [ ] `GET /api/health` returns `200` and `ok: true`
- [ ] `GET /api/jobs?limit=5` returns `200` with `jobs`
- [ ] `GET /api/jobs?limit=10` (optional `q=` search) returns `200` with `pagination.nextCursor` when more pages exist
- [ ] `GET /api/categories` returns `200` with categories
- [ ] `GET /api/candidates` without a session returns **`401`** (listing is authenticated; supports `limit`, `offset`, optional `q`)

## 2) Auth flow

- [ ] Open `/sign-in`
- [ ] Create a new user with email/password (or sign in existing user)
- [ ] Confirm successful sign-in redirect/UX
- [ ] `GET /api/auth/session` returns `user` (not `null`) with `id`, `email`, `role`, and **`canManageUserRoles`** (boolean; `true` only when role admin is enabled and the email is allowlisted)

## 3) Recruiter vacancy create/edit/close

- [ ] Open `/dashboard/company`
- [ ] Create vacancy with required fields + category
- [ ] Confirm vacancy appears in dashboard list
- [ ] Confirm vacancy appears on `/jobs`
- [ ] Edit vacancy (title/salary/category), save, and verify changes on `/jobs`
- [ ] Close vacancy and confirm status transition behavior

### Application pipeline

- [ ] After a candidate applies, **Application pipeline** lists the row with stage **applied**
- [ ] Change stage (e.g. to **viewed** / **interviewing**) and confirm the candidate sees the updated stage on `/dashboard/profile`

## 4) Candidate profile + apply

### Talent directory (`/talent`)

- [ ] While signed out, open **`/talent`** — you should get the sign-in/sign-up flow (no candidate listing without auth)
- [ ] While signed in (candidate or recruiter), **`/talent`** lists candidates with pagination (10 per page) and search

- [ ] Open `/dashboard/profile`
- [ ] Save candidate profile fields
- [ ] Refresh and confirm profile persists
- [ ] Apply to an open job from `/jobs`
- [ ] Confirm application appears in candidate dashboard list

## 5) Protected-route behavior

- [ ] In incognito/unauthenticated context, call `GET /api/applications/mine`
- [ ] Expect `401` (not `503 AUTH_UNAVAILABLE`)

## 5b) Role admin controls (if enabled)

- [ ] Confirm env vars are set for this deployment when role admin is intended:
  - `TALENTBRIDGE_ENABLE_ROLE_ADMIN=1`
  - `TALENTBRIDGE_ROLE_ADMIN_EMAILS=<comma-separated recruiter admin emails>`
- [ ] **Role Management** card appears on `/dashboard/company` only for allowlisted recruiters (`canManageUserRoles`); other recruiters should not see the card (API still returns `403` if called anyway)
- [ ] As an allowlisted recruiter, update another user's role from recruiter dashboard role panel
- [ ] Confirm disallowed actor (non-allowlisted recruiter or candidate) receives `403 FORBIDDEN_ROLE_ADMIN`
- [ ] Confirm self-role change attempt is blocked

## 6) Postgres spot checks (Neon SQL editor)

- [ ] Before smoke, run explicit production DB migration + guard:
  - `npm run release:prod:db:apply`
  - `npm run release:prod:db:check:migrations`
- [ ] `select id, email, created_at from users order by created_at desc limit 5;`
- [ ] `select id, job_title, posted_by_user_id, status from vacancies order by created_at desc limit 5;`
- [ ] `select id, vacancy_id, candidate_user_id, created_at from applications order by created_at desc limit 10;`
- [ ] `select user_id, first_name, last_name, email_snapshot, updated_at from candidate_profiles order by updated_at desc limit 5;`
- [ ] `select actor_user_id, event_type, payload_json, created_at from ai_audit_events where event_type='user.role_changed' order by created_at desc limit 5;`

## 7) Post-release log watch (10-30 minutes)

- [ ] Watch Vercel logs for 5xx spikes on:
  - `/api/jobs`
  - `/api/applications`
  - `/api/auth/login`
  - `/api/auth/register`
  - `/api/auth/session`

## Pass criteria

Release is healthy when:

- [ ] Sign-in, create/edit vacancy, and apply flows work end-to-end
- [ ] Writes persist correctly in Postgres tables
- [ ] No recurring 5xx errors on critical API routes
