import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import postgres from "postgres";
import { postgresOptions } from "./postgres-url-options.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

config({ path: join(repoRoot, ".env.local") });
config({ path: join(repoRoot, ".env") });

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const migrationsDir = join(repoRoot, "database/migrations");
const migrationFiles = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

const sql = postgres(url, postgresOptions(url));

try {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const rows = await sql`
    SELECT filename, checksum
    FROM schema_migrations
  `;
  const byFile = new Map(rows.map((r) => [r.filename, r.checksum]));

  const missing = [];
  const checksumMismatch = [];

  for (const file of migrationFiles) {
    const expected = sha256(readFileSync(join(migrationsDir, file), "utf8"));
    const actual = byFile.get(file);
    if (!actual) {
      missing.push(file);
      continue;
    }
    if (actual !== expected) {
      checksumMismatch.push(file);
    }
  }

  const shape = await sql`
    SELECT
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='candidate_profiles' AND column_name='first_name'
      ) AS candidate_first_name,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='candidate_profiles' AND column_name='last_name'
      ) AS candidate_last_name,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='candidate_profiles' AND column_name='full_name'
      ) AS candidate_full_name,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='users' AND column_name='role'
      ) AS users_role,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='applications' AND column_name='status'
      ) AS applications_status,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='applications' AND column_name='status_updated_at'
      ) AS applications_status_updated_at,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='vacancies' AND column_name='job_type'
      ) AS vacancies_job_type
  `;

  const s = shape[0];
  const shapeIssues = [];
  if (!s.candidate_first_name) shapeIssues.push("candidate_profiles.first_name missing");
  if (!s.candidate_last_name) shapeIssues.push("candidate_profiles.last_name missing");
  if (s.candidate_full_name) shapeIssues.push("candidate_profiles.full_name still present");
  if (!s.users_role) shapeIssues.push("users.role missing");
  if (!s.applications_status) shapeIssues.push("applications.status missing");
  if (!s.applications_status_updated_at) shapeIssues.push("applications.status_updated_at missing");
  if (!s.vacancies_job_type) shapeIssues.push("vacancies.job_type missing");

  if (missing.length || checksumMismatch.length || shapeIssues.length) {
    console.error("Schema migration parity check failed.");
    if (missing.length) console.error("Missing migrations:", missing.join(", "));
    if (checksumMismatch.length) {
      console.error("Checksum mismatch:", checksumMismatch.join(", "));
      for (const file of checksumMismatch) {
        const expected = sha256(readFileSync(join(migrationsDir, file), "utf8"));
        const actual = byFile.get(file);
        console.error(`  ${file}: stored=${actual}`);
        console.error(`  ${file}:  disk=${expected}`);
      }
      console.error(
        "Hint: if the database schema already matches (see shape errors above), align checksums with:",
        "npm run db:repair-migration-checksums",
      );
    }
    if (shapeIssues.length) console.error("Schema shape issues:", shapeIssues.join("; "));
    process.exit(1);
  }

  console.log(`db-check-migrations: ok (${migrationFiles.length} migrations tracked)`);
} finally {
  await sql.end({ timeout: 5 });
}
