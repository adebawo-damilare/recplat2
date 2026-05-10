# CI/CD: keep production deploys healthy

TalentBridge’s **production URL** comes from **Vercel** (your site, e.g. `*.vercel.app` or custom domain). Automation here is centered on **GitHub Actions** plus **repository rules**—so broken builds don’t land on the branch Vercel deploys as production.

---

## What runs automatically

Workflow: **`.github/workflows/ci.yml`**

On every **pull request** and **push** to **`main`** or **`master`**:

1. **`npm ci`** — reproducible installs from `package-lock.json`.
2. **`npm run lint`** — TypeScript check (`tsc --noEmit`).
3. **`npm run build`** — full **Next.js production build** (`next build`).
4. **Playwright (`npm run test:e2e`)** — browser tests against a spawned dev server, with **`TALENTBRIDGE_E2E_STUB_FIRESTORE_JOBS`** so **`GET /api/jobs`** does not rely on Firestore in CI ([`playwright.config.ts`](../playwright.config.ts)).

You can rerun the workflow manually from GitHub (**Actions → CI → Run workflow**).

---

## How this protects production

By itself, CI **does not block Vercel** if someone pushes failing code straight to **`main`**—Vercel may still run a deployment for that push.

Effective pattern:

1. **Use pull requests into `main`** for changes you care about (no direct-push habits for prod).
2. In GitHub (**Settings → Rules → Rulesets**), add a rule for **`main`** (or **Branches → Branch protection rules** on older UI) that includes:
   - **Require a pull request before merging** (optional but strongly recommended).
   - **Require status checks to pass** — after the workflow has run once, pick the check for job **`quality`** (workflow **`CI`**; exact label varies slightly in GitHub’s UI—match the **`CI`** workflow).

Then merges that would break **`lint`**, **`build`**, or **E2E** never reach **`main`**, and **Vercel production** (typically tracking **`main`**) stays aligned with passing checks.

Adjust your Vercel **Production Branch** (**Project → Settings → Git**) to **`main`** (or whatever branch you protected).

### Development branch: `dev` → `main`

Ongoing work should land on **`dev`** first, then merge to **`main`** via **pull request** (so protected rules and CI still apply).

Scope and MVP framing (for prioritizing what merges): **`docs/TALENTBRIDGE_MVP_PLAN.md`** and **`docs/ROADMAP.md`**.

- **Default local branch for new work:** `git checkout dev` (then `git pull` before starting a feature).
- **Feature work:** open a PR **into `dev`**, or commit on `dev` and open a PR **from `dev` to `main`** when ready to release.
- **CI** (`.github/workflows/ci.yml`) runs on **pushes and PRs** to **`dev`** and **`main`** so both branches stay green.

---

## Optional Vercel settings

- **Preview deployments**: keep enabled for PRs—good for QA without touching production.
- **Ignored Build Step** (advanced): you can skip a build when a `[skip ci]` marker appears—but that can hide breakage; rely on GH checks before merge instead.

Secrets for Postgres / hosted env are described in **`docs/DEPLOYMENT_ENV.md`**; CI does **not** need your production `DATABASE_URL` for **`lint`** / **`build`** / **`test:e2e`** with the current Playwright stub.

---

## Troubleshooting CI

| Symptom | Things to try |
|--------|----------------|
| **`npm ci` fails** | Commit an updated **`package-lock.json`** after **`npm install`** locally (`npm ci` requires lockfile sync). |
| **Playwright timeout** | Rerun the job (transient flake); **`retries`** is enabled when **`CI`** is set. |
| **`build` passes locally but fails on CI** | Align Node with **`setup-node`** (currently **`22`**) — use `engines` in `package.json` if you need a tighter pin. |

After changing **`.github/workflows/ci.yml`**, open a trivial PR once to verify the checks appear green and are selectable under branch protection.
