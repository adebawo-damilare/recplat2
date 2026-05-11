# Production Manual Checklist (Postgres + Session Auth)

Use this checklist after deploy (for example: `https://recplat2.vercel.app`).

## 1) Public health checks

- [ ] `GET /api/health` returns `200` and `ok: true`
- [ ] `GET /api/jobs?limit=5` returns `200` with `jobs`
- [ ] `GET /api/categories` returns `200` with categories

## 2) Auth flow

- [ ] Open `/sign-in`
- [ ] Create a new user with email/password (or sign in existing user)
- [ ] Confirm successful sign-in redirect/UX
- [ ] `GET /api/auth/session` returns `user` (not `null`)

## 3) Recruiter vacancy create/edit/close

- [ ] Open `/dashboard/company`
- [ ] Create vacancy with required fields + category
- [ ] Confirm vacancy appears in dashboard list
- [ ] Confirm vacancy appears on `/jobs`
- [ ] Edit vacancy (title/salary/category), save, and verify changes on `/jobs`
- [ ] Close vacancy and confirm status transition behavior

## 4) Candidate profile + apply

- [ ] Open `/dashboard/profile`
- [ ] Save candidate profile fields
- [ ] Refresh and confirm profile persists
- [ ] Apply to an open job from `/jobs`
- [ ] Confirm application appears in candidate dashboard list

## 5) Protected-route behavior

- [ ] In incognito/unauthenticated context, call `GET /api/applications/mine`
- [ ] Expect `401` (not `503 AUTH_UNAVAILABLE`)

## 6) Postgres spot checks (Neon SQL editor)

- [ ] `select id, email, created_at from users order by created_at desc limit 5;`
- [ ] `select id, job_title, posted_by_user_id, status from vacancies order by created_at desc limit 5;`
- [ ] `select id, vacancy_id, candidate_user_id, created_at from applications order by created_at desc limit 10;`
- [ ] `select user_id, full_name, email_snapshot, updated_at from candidate_profiles order by updated_at desc limit 5;`

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
