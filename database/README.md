# Database (Postgres)

TalentBridge uses **Postgres** (Neon, Supabase pooler, or any `DATABASE_URL`) for vacancies, companies, applications, categories, users, candidate profiles, and AI audit metadata.

**Why `categories` exists:** MVP talent lanes aligned with **`docs/TALENTBRIDGE_MVP_PLAN.md`** §4 and **`docs/CATEGORY_MODEL.md`**.

**Jobs Slice v1:** production deployments should rely on Postgres for vacancies + applications only — see **`docs/MVP_JOBS_SLICE_V1.md`** for env flags.

## Apply migrations

1. Create a database and copy its connection string into `DATABASE_URL` in `.env.local` (or `.env`); see `.env.example`.
2. Apply SQL with the helper (loads `.env.local` / `.env` automatically):

```bash
npm run db:apply
npm run db:apply:categories
npm run db:apply:users
```

Categories migration (`0002_categories.sql`) **adds `categories`, seeds marketers/designers/sales, and adds `vacancies.category_id`**. Apply it after `0001_initial.sql`.

Or with `psql`:

```bash
psql "$DATABASE_URL" -f database/migrations/0001_initial.sql
psql "$DATABASE_URL" -f database/migrations/0002_categories.sql
psql "$DATABASE_URL" -f database/migrations/0003_users_auth.sql
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
