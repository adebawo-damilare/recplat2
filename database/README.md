# Database (Postgres)

TalentBridge can use **Postgres** (Neon, Supabase pooler, or any `DATABASE_URL`) for vacancies, companies, applications, and AI audit metadata. When `DATABASE_URL` is unset, the app keeps using **Firestore** for job data.

## Apply migrations

1. Create a database and copy its connection string into `DATABASE_URL` (see `.env.example`).
2. Run the SQL in order:

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

Use `scripts/migrate-vacancies-from-firestore.mjs` (requires service account + `DATABASE_URL`) to copy open vacancies. See `docs/ROADMAP.md`.
