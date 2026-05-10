# Supplying release values safely (§3 migrations + §4 smoke)

This pairs with **`release-production.credentials.template`** and **`docs/RELEASE_JOBS_SLICE_V1.md`**.

## 1. Create your local file (you only)

```bash
cp release-production.credentials.template .env.release
```

On Windows PowerShell (repo root):

```powershell
Copy-Item release-production.credentials.template .env.release
```

Edit **`.env.release`** with **real production** values only. The file stays **gitignored** (`.env*`).

## 2. What goes in `.env.release`

| Key | Purpose | Safe to paste in chat / to an AI assistant? |
|-----|---------|------------------------------------------------|
| `DATABASE_URL` | Prod Neon Postgres — **§3 migrations** | **Never** |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Bypass deployment protection in smoke | **Never** |
| `SMOKE_BASE_URL` | Public-ish origin (`https://…`) — **§4** | Usually **yes** (it’s meant to be public) |
| `SMOKE_EXPECT_POSTGRES_READY` | Set **`1`** for strict Jobs Slice smoke leg | Okay (non-secret flag) |

## 3. Run migrations (§3) yourself

Dotenv precedence: shell / **`.env.release`** should carry **`DATABASE_URL`**. **`scripts/db-apply.mjs`** also loads `.env.local`, but **`DATABASE_URL` already set won’t be overridden** by defaults from `dotenv` (already in the environment from `dotenv-cli`).

From repo root (after installing deps once with `npm ci`):

```bash
npx dotenv -e .env.release -- npm run db:apply
npx dotenv -e .env.release -- npm run db:apply:categories
```

PowerShell:

```powershell
npx dotenv -e .env.release -- npm run db:apply
npx dotenv -e .env.release -- npm run db:apply:categories
```

## 4. Run smoke (§4)

Relaxed API smoke:

```bash
npx dotenv -e .env.release -- npm run smoke:api
```

Strict (Jobs Slice rehearsal — must include **`SMOKE_EXPECT_POSTGRES_READY=1`**):

Add **`SMOKE_EXPECT_POSTGRES_READY=1`** to **`.env.release`** for this run **or**:

```powershell
$env:SMOKE_EXPECT_POSTGRES_READY = "1"
npx dotenv -e .env.release -- npm run smoke:api
Remove-Item Env:SMOKE_EXPECT_POSTGRES_READY
```

(On bash: `SMOKE_EXPECT_POSTGRES_READY=1 npx dotenv -e .env.release -- npm run smoke:api`.)

## 5. If you want the assistant to run smoke **for** you

You may send **only**:

- **`SMOKE_BASE_URL`** (full `https://…` origin).
- Optionally whether strict mode should apply (**`yes`** / **`no`**).
- Optionally confirm deployment protection bypass is **not** needed; if needed, smoke must run **on your machine** with **`.env.release`**, since bypass secrets must not appear in logs.

Do **not** send **`DATABASE_URL`** or **`VERCEL_AUTOMATION_BYPASS_SECRET`** to an assistant unless you explicitly trust that channel end-to-end; run **§3** and protected **§4** locally instead.

## 6. §5 Manual sanity checklist (template)

Paste into your PR or release ticket and tick in the browser:

- [ ] **Recruiter (Firebase)** — signed in on **production**, create/edit vacancy, visible on **`/jobs`** + filters OK.
- [ ] **Candidate** — signed in, open listing, **Apply** succeeds.
- [ ] **Postgres** — row in **`applications`** (Neon console / SQL) for prod DB.
- [ ] **Candidate dashboard** — application appears (covers **`GET /api/applications/mine`** behaviour).
