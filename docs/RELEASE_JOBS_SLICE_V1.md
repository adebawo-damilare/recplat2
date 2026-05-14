# Release runbook: Jobs Slice v1 → production

Use this after **Preview/staging** is already configured (`docs/DEPLOYMENT_ENV.md`) and you are ready to ship **`main`** (production).

**Milestone framing:** **`docs/MVP_JOBS_SLICE_V1.md`**

---

## 0. Preconditions

- [ ] **Staging** (Preview on `dev` + Neon branch) already behaves: listings, apply, dashboard (**including Your Vacancies search** on **`/dashboard/company`**), and API smoke (`SMOKE_EXPECT_POSTGRES_READY=1` against the Preview URL).
- [ ] **Vercel** production branch = **`main`** (Project → Settings → Git).
- [ ] **Production** env vars in Vercel are prepared (next section)—you can set them before or right after merge; **`NEXT_PUBLIC_*`** requires a **redeploy** after you add or change it.

---

## 1. Production environment (Vercel → Production scope)

Set or verify **Production** only (not Preview):

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Neon **production** database (not the branch used for Preview). |
| `TALENTBRIDGE_JOBS_POSTGRES_ONLY` | `1` |
| `NEXT_PUBLIC_TALENTBRIDGE_JOBS_POSTGRES_ONLY` | `1` (client bundle—**redeploy** after changing). |
| `TALENTBRIDGE_AUTH_SECRET` | Session signing secret (>=32 chars). |
| Optional | Upstash, AI keys, etc., per `.env.example` / `docs/DEPLOYMENT_ENV.md`. |

Then **Redeploy** the latest **Production** deployment if you touched env vars (especially any `NEXT_PUBLIC_*`).

---

## 2. Merge `dev` → `main`

1. Open a **pull request** from **`dev`** into **`main`**.  
2. Wait for **`quality`** and **`smoke-postgres`** to pass (`docs/CICD.md`).  
3. Merge when green (squash or merge commit—match your team convention).

Vercel will build **Production** from **`main`** if Git integration is enabled.

---

## 3. Migrations on the production database

Apply SQL **against the same Postgres** as **Production** `DATABASE_URL` (usually your Neon **primary**, not a branch).

**Template + safety guide:** copy **`release-production.credentials.template`** → **`.env.release`**, fill values, then **`docs/RELEASE_CREDENTIAL_FILLING.md`**.

**Safest:** from a trusted machine (never commit **`DATABASE_URL`**):

```bash
npm run release:prod:db:apply
npm run release:prod:db:apply:categories
npm run release:prod:db:apply:users
npm run release:prod:db:apply:roles
npm run release:prod:db:apply:application-status
npm run release:prod:db:apply:candidate-name-split
```

(or the older one-liners with `DATABASE_URL="postgresql://..." npm run db:apply` …)

Or use `psql` / Neon SQL editor with migrations in order — see **`database/README.md`** (includes `0006_candidate_name_split.sql` for **`first_name` / `last_name`** on candidate profiles when upgrading from `full_name`).

**Already applied?** If prod DB was created from a Neon backup of staging or migrations were run once, re-running apply scripts is **idempotent** for tables that use `IF NOT EXISTS`—still confirm with your team before repeating on prod.

---

## 4. Automated smoke (production URL)

Put **`SMOKE_BASE_URL`** (and optional **`VERCEL_AUTOMATION_BYPASS_SECRET`**) in **`.env.release`** — see **`release-production.credentials.template`** and **`docs/RELEASE_CREDENTIAL_FILLING.md`** (what is safe to paste to an assistant vs run only locally).

```bash
npm run release:prod:smoke
SMOKE_EXPECT_POSTGRES_READY=1 npm run release:prod:smoke
```

**Expect:** strict run succeeds, including **401** on **`GET /api/applications/mine`** without a token and **`postgresConfigured: true`** on **`/api/ai/health`**.

---

## 5. Manual sanity (product gate)

Complete at least once on **production**:

1. Sign in as **recruiter** (email/password via `/sign-in`): create or edit a vacancy; confirm it appears on **`/jobs`** with filters as expected.  
2. On **`/dashboard/company`**, under **Your Vacancies**, use **Search your vacancies** (titles, company, location, salary, status, lane label, description text): confirm the list **narrows** while typing and **clears** when the field is emptied.  
3. Sign in as **candidate** (or same user if your roles allow): open a job, **apply**.  
4. Confirm **`applications`** row in Postgres (Neon console or SQL) and **candidate dashboard** lists the application (`GET /api/applications/mine` path).

---

## 6. After release

- Watch Vercel/runtime logs and Neon for errors (**`JOBS_POSTGRES_REQUIRED`**, connection failures) for a short window.  
- **Next backbone — Phase B–D (post–Jobs Slice v1):** execution stays in **`docs/ROADMAP.md`**, with product shape in **`docs/TALENTBRIDGE_MVP_PLAN.md`** (e.g. §4 **`category_fields`** / screening templates, richer candidate profiles) and P0 backlog cues in **`docs/ROADMAP_FROM_REFERENCE.md`**. Jobs Slice v1 deliberately stops short of invitations, full screening loops, and indexed marketplace search—promote those only when the team picks the next slice.

---

## Rollback (short)

- **App:** Vercel → **Deployments** → promote the previous Production deployment.  
- **Schema:** prefer **forward fixes**; DB rollback is manual and risky—avoid destructive changes without a plan.

---

## Related docs

- `docs/RELEASE_CREDENTIAL_FILLING.md` — **`.env.release`** template, safe vs secret fields, commands  
- `release-production.credentials.template` — copy → **`.env.release`** (gitignored)  
- `docs/MVP_JOBS_SLICE_V1.md` — scope and env flags  
- `docs/DEPLOYMENT_ENV.md` — Preview vs Production, smoke automation  
- `database/README.md` — migrations detail  
- `docs/CICD.md` — required checks before merge (includes authenticated Playwright: recruiter dashboard, vacancies search, post/edit/close, pipeline **`PATCH`**, candidate flows—see **`e2e/authenticated/`**)  
