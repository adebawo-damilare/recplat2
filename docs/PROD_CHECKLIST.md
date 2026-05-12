# Production Manual Checklist (Postgres + Session Auth)

Use this checklist after deploy (for example: `https://recplat2.vercel.app`).

**Automation:** `scripts/run-prod-checklist.mjs` (via `npx dotenv-cli -e .env.release -- node scripts/run-prod-checklist.mjs`) hits the same API and DB checks, including **application pipeline** (`GET /api/applications/board`, `PATCH /api/applications/[id]`, candidate `status` after update, `vacancyId` filter, candidate forbidden on board).

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
