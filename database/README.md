# Database (Postgres)

TalentBridge can use **Postgres** (Neon, Supabase pooler, or any `DATABASE_URL`) for vacancies, companies, applications, categories, and AI audit metadata. When `DATABASE_URL` is unset, the app keeps using **Firestore** for job data.

**Why `categories` exists:** MVP talent lanes aligned with **`docs/TALENTBRIDGE_MVP_PLAN.md`** §4 and **`docs/CATEGORY_MODEL.md`**.

## Apply migrations

1. Create a database and copy its connection string into `DATABASE_URL` in `.env.local` (or `.env`); see `.env.example`.
2. Apply SQL with the helper (loads `.env.local` / `.env` automatically):

```bash
npm run db:apply
npm run db:apply:categories
```

Categories migration (`0002_categories.sql`) **adds `categories`, seeds marketers/designers/sales, and adds `vacancies.category_id`**. Apply it after `0001_initial.sql`.

Or with `psql`:

```bash
psql "$DATABASE_URL" -f database/migrations/0001_initial.sql
psql "$DATABASE_URL" -f database/migrations/0002_categories.sql
```

On Windows PowerShell you can use `psql` from PostgreSQL tools, or run the same statements in the host SQL editor.

## Optional Drizzle introspection / generate

`drizzle.config.ts` points at `src/server/schema/index.ts`. You can use Drizzle Kit for future schema drift:

```bash
npx drizzle-kit generate
```

## Data flow

- **Reads:** `GET /api/jobs` uses Postgres when `DATABASE_URL` is set, otherwise Firestore (`src/server/jobs/firestoreVacancies.ts`). Optional `?category=marketers|designers|sales` filters server-side on Postgres.
- **Catalog:** `GET /api/categories` lists MVP lanes from Postgres when configured, otherwise falls back to `src/shared/mvpCategories.ts`.
- **Writes:** `POST` / `PATCH /api/jobs/[id]` require a Firebase ID token and write to Postgres when configured.
- **Applications:** `POST /api/applications` records interest in Postgres when configured; otherwise the client falls back to Firestore `applyToJob`.

### Seed sample jobs (Postgres)

After `DATABASE_URL` is set in `.env.local`:

```bash
npm run db:seed:samples
```

Optional: set `SEED_OWNER_FIREBASE_UID` to your Firebase `uid` so jobs appear under recruiter “mine” / dashboard when you’re signed in. Re-running inserts **additional** rows (new ids).

`companies` enforces “one row per owner + normalized name” via a **unique index** on `(owner_firebase_uid, lower(name))`, not an inline `UNIQUE(...)` constraint (PostgreSQL does not allow function calls inside table-level `UNIQUE`).
