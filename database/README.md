# Database (Postgres)

TalentBridge can use **Postgres** (Neon, Supabase pooler, or any `DATABASE_URL`) for vacancies, companies, applications, and AI audit metadata. When `DATABASE_URL` is unset, the app keeps using **Firestore** for job data.

## Apply migrations

1. Create a database and copy its connection string into `DATABASE_URL` in `.env.local` (or `.env`); see `.env.example`.
2. Apply SQL with the helper (loads `.env.local` / `.env` automatically):

```bash
npm run db:apply
```

Or with `psql`:

```bash
psql "$DATABASE_URL" -f database/migrations/0001_initial.sql
```

On Windows PowerShell you can use `psql` from PostgreSQL tools, or run the same statements in the host SQL editor.

## Optional Drizzle introspection / generate

`drizzle.config.ts` points at `src/server/schema/index.ts`. You can use Drizzle Kit for future schema drift:

```bash
npx drizzle-kit generate
```

## Data flow

- **Reads:** `GET /api/jobs` uses Postgres when `DATABASE_URL` is set, otherwise Firestore (`src/server/jobs/firestoreVacancies.ts`).
- **Writes:** `POST` / `PATCH /api/jobs/[id]` require a Firebase ID token and write to Postgres when configured.
- **Applications:** `POST /api/applications` records interest in Postgres when configured; otherwise the client falls back to Firestore `applyToJob`.

## Firestore → Postgres

1. Set `FIREBASE_SERVICE_ACCOUNT_JSON` (same JSON as production API verification) and `DATABASE_URL`, then apply SQL (above).

2. Run the migration (uses `firebase-applet-config.json` → `firestoreDatabaseId`, or override with `FIRESTORE_DATABASE_ID`):

```bash
npm run migrate:vacancies -- --dry-run
npm run migrate:vacancies
```

- **`--dry-run`** — list first few rows and totals; **no** `DATABASE_URL` required (read-only from Firestore).
- **`--open-only`** — import only documents with `status: "open"` (omit this to sync all vacancies).

Postgres row primary keys match **Firestore document ids**, so re-running is idempotent.

### Seed sample jobs (Neon only, no Firestore)

After `DATABASE_URL` is set in `.env.local`:

```bash
npm run db:seed:samples
```

Optional: set `SEED_OWNER_FIREBASE_UID` to your Firebase `uid` so jobs appear under recruiter “mine” / dashboard when you’re signed in. Re-running inserts **additional** rows (new ids).

`companies` enforces “one row per owner + normalized name” via a **unique index** on `(owner_firebase_uid, lower(name))`, not an inline `UNIQUE(...)` constraint (PostgreSQL does not allow function calls inside table-level `UNIQUE`).
