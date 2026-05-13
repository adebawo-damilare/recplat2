/**
 * Align schema_migrations.checksum with the current on-disk SQL for each migration
 * that is already recorded. Does NOT execute migration SQL.
 *
 * Use when db-check-migrations reports "Checksum mismatch" after a migration file
 * was edited in git (e.g. comment/whitespace/compat fix) but the database was
 * already applied from an older file revision. After repair, run:
 *   npm run db:check:migrations
 *
 * Dry run: REPAIR_MIGRATION_CHECKSUMS_DRY_RUN=1 npm run db:repair-migration-checksums
 */
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

const dryRun = process.env.REPAIR_MIGRATION_CHECKSUMS_DRY_RUN === "1";

const migrationsDir = join(repoRoot, "database/migrations");
const migrationFiles = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

const sql = postgres(url, postgresOptions(url));

try {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  const repaired = [];
  const skippedUntracked = [];

  for (const file of migrationFiles) {
    const disk = readFileSync(join(migrationsDir, file), "utf8");
    const expected = sha256(disk);
    const rows = await sql`
      SELECT checksum FROM schema_migrations WHERE filename = ${file}
    `;
    if (rows.length === 0) {
      skippedUntracked.push(file);
      continue;
    }
    const actual = rows[0].checksum;
    if (actual === expected) continue;

    console.log(`${dryRun ? "[dry-run] " : ""}checksum repair: ${file}`);
    console.log(`  was: ${actual}`);
    console.log(`  now: ${expected}`);

    if (!dryRun) {
      await sql`
        UPDATE schema_migrations
        SET checksum = ${expected}, applied_at = NOW()
        WHERE filename = ${file}
      `;
    }
    repaired.push(file);
  }

  if (skippedUntracked.length) {
    console.warn(
      "Note: these files have no schema_migrations row yet (apply with npm run db:apply first):",
      skippedUntracked.join(", "),
    );
  }

  if (repaired.length === 0) {
    console.log("db-repair-migration-checksums: nothing to do (all tracked checksums match disk).");
  } else {
    console.log(
      dryRun
        ? `db-repair-migration-checksums: dry-run complete (${repaired.length} file(s) would be updated).`
        : `db-repair-migration-checksums: updated ${repaired.length} checksum(s).`,
    );
  }
} finally {
  await sql.end({ timeout: 5 });
}
