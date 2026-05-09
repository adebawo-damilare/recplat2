/**
 * Apply a SQL migration file with DATABASE_URL (Neon, Supabase, local Postgres).
 * Usage: npm run db:apply
 *        node scripts/db-apply.mjs database/migrations/0001_initial.sql
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const migrationPath = resolve(process.argv[2] ?? join(repoRoot, "database/migrations/0001_initial.sql"));
const sqlText = readFileSync(migrationPath, "utf8");

const sql = postgres(url, { max: 1 });

try {
  await sql.unsafe(sqlText);
  console.log("Applied:", migrationPath);
} finally {
  await sql.end({ timeout: 5 });
}
