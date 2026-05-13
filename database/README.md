# Database (Postgres)

TalentBridge uses **Postgres** (Neon, Supabase pooler, or any `DATABASE_URL`) for vacancies, companies, applications, categories, users, candidate profiles, and AI audit metadata.

**Why `categories` exists:** MVP talent lanes aligned with **`docs/TALENTBRIDGE_MVP_PLAN.md`** §4 and **`docs/CATEGORY_MODEL.md`**.

**Jobs Slice v1:** production deployments should rely on Postgres for vacancies + applications only — see **`docs/MVP_JOBS_SLICE_V1.md`** for env flags.

## Apply migrations

1. Create a database and copy its connection string into `DATABASE_URL` in `.env.local` (or `.env`); see `.env.example`.
2. Apply SQL with the helper (loads `.env.local` / `.env` automatically):

```bash
npm run db:apply
npm run db:check:migrations
```

`db:apply` applies all files in `database/migrations` in filename order and records each run in `schema_migrations` (`filename`, `checksum`, `applied_at`).

### Checksum mismatch after editing an old migration file

If `db:check:migrations` reports a **checksum mismatch** (often for `0001_initial.sql`) but **schema shape** checks pass, the database was likely applied from an older revision of that SQL file. Re-running `0001` SQL on a live database is risky. Prefer **reconciling only the recorded checksum** to match the current file (no DDL executed):

```bash
npm run db:repair-migration-checksums
npm run db:check:migrations
```

Dry run: `REPAIR_MIGRATION_CHECKSUMS_DRY_RUN=1 npm run db:repair-migration-checksums`

Do **not** use this if you changed migration DDL in a way that was **never** applied to the database; in that case add a **new** forward migration instead.

`0004_user_roles.sql` adds `users.role`. `0005_application_status.sql` adds `applications.status` for the recruiter pipeline.

`0006_candidate_name_split.sql` replaces `candidate_profiles.full_name` with **`first_name`** and **`last_name`** (existing rows are migrated automatically).

### Explicit target commands (preview vs prod)

Use explicit env-targeted commands so migrations are applied to the correct Neon DB:

```bash
# Preview/local target (.env.local)
npm run release:preview:db:apply
npm run release:preview:db:check:migrations
# If checksum drift only (schema already correct): npm run release:preview:db:repair-migration-checksums

# Production target (.env.release)
npm run release:prod:db:apply
npm run release:prod:db:check:migrations
# If checksum drift only: npm run release:prod:db:repair-migration-checksums
```

Optional parity diff between two DBs (for example preview vs prod):

```bash
DB_PARITY_LEFT_NAME=preview \
DB_PARITY_LEFT_URL="postgresql://..." \
DB_PARITY_RIGHT_NAME=prod \
DB_PARITY_RIGHT_URL="postgresql://..." \
npm run db:check:parity
```

Or with `psql`:

```bash
psql "$DATABASE_URL" -f database/migrations/0001_initial.sql
psql "$DATABASE_URL" -f database/migrations/0002_categories.sql
psql "$DATABASE_URL" -f database/migrations/0003_users_auth.sql
psql "$DATABASE_URL" -f database/migrations/0004_user_roles.sql
psql "$DATABASE_URL" -f database/migrations/0005_application_status.sql
psql "$DATABASE_URL" -f database/migrations/0006_candidate_name_split.sql
psql "$DATABASE_URL" -f database/migrations/0007_job_type.sql
```

On Windows PowerShell you can use `psql` from PostgreSQL tools, or run the same statements in the host SQL editor.

## Optional Drizzle introspection / generate

`drizzle.config.ts` points at `src/server/schema/index.ts`. You can use Drizzle Kit for future schema drift:

```bash
npx drizzle-kit generate
```

## Data flow

- **Reads:** `GET /api/jobs` uses Postgres. Optional `?category=marketers|designers|sales` filters server-side.
- **Catalog:** `GET /api/categories` lists MVP lanes from Postgres when configured, otherwise falls back to `src/shared/mvpCategories.ts`.
- **Writes:** `POST` / `PATCH /api/jobs/[id]` require an authenticated TalentBridge session and write to Postgres.
- **Applications:** `POST /api/applications` records interest in Postgres.

### Seed sample jobs (Postgres)

After `DATABASE_URL` is set in `.env.local`:

```bash
npm run db:seed:samples
```

Optional: set `SEED_OWNER_USER_ID` to a Postgres `users.id` UUID so jobs appear under recruiter “mine” / dashboard for that account. Re-running inserts **additional** rows (new ids).

`companies` enforces “one row per owner + normalized name” via a **unique index** on `(owner_user_id, lower(name))`, not an inline `UNIQUE(...)` constraint (PostgreSQL does not allow function calls inside table-level `UNIQUE`).

### Dev-only seeding (no app UI)

The product UI no longer offers “sync sample data” / “seed sample jobs” buttons. Sample data is still available for **non-production** setups via:

- **`POST /api/jobs/seed-sample`** — authenticated request; inserts demo vacancies (see `app/api/jobs/seed-sample/route.ts`).
- **`POST /api/candidates/seed-samples`** — inserts demo candidate rows when missing (see `app/api/candidates/seed-samples/route.ts`).
- **`npm run db:seed:samples`** — CLI path that uses `scripts/seed-neon-sample.ts` with `DATABASE_URL` (and optional `SEED_OWNER_USER_ID`).

Use **`curl`**, local scripts, or CI fixtures against a dev/staging database. Prefer **not** exposing these endpoints in production unless you intentionally lock them down (they are not linked from the public app).
