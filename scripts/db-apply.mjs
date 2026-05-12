/**
 * Apply a SQL migration file with DATABASE_URL (Neon, Supabase, local Postgres).
 * Usage: npm run db:apply
 *        node scripts/db-apply.mjs database/migrations/0001_initial.sql
 */
import { readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

config({ path: join(repoRoot, ".env.local") });
config({ path: join(repoRoot, ".env") });

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error(
    "DATABASE_URL is required. Add it to .env.local (or .env), or set it in the shell for this command.",
  );
  process.exit(1);
}

const migrationsDir = join(repoRoot, "database/migrations");
const explicitMigrationPath = process.argv[2];
const migrationPaths = explicitMigrationPath
  ? [resolve(explicitMigrationPath)]
  : readdirSync(migrationsDir)
      .filter((name) => name.endsWith(".sql"))
      .sort((a, b) => a.localeCompare(b))
      .map((name) => join(migrationsDir, name));

function migrationFileName(absolutePath) {
  return absolutePath.replace(/\\/g, "/").split("/").pop() ?? absolutePath;
}

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

function postgresOptions(databaseUrl) {
  let hostname = "";
  try {
    hostname = new URL(databaseUrl).hostname;
  } catch {
    // non-URL form; still try with defaults below
  }

  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    hostname === "host.docker.internal";

  const sslExplicitlyOff =
    /sslmode\s*=\s*disable/i.test(databaseUrl) ||
    /[?&]ssl\s*=\s*0\b/i.test(databaseUrl);

  const opts = {
    max: 1,
    connect_timeout: 45,
  };

  // Cloud DBs often reset the TCP session if TLS is not used; local Docker usually has no TLS.
  if (!sslExplicitlyOff && !isLocal) {
    opts.ssl = "require";
  }

  return opts;
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

  for (const migrationPath of migrationPaths) {
    const sqlText = readFileSync(migrationPath, "utf8");
    const filename = migrationFileName(migrationPath);
    const checksum = sha256(sqlText);
    await sql.begin(async (tx) => {
      await tx.unsafe(sqlText);
      await tx`
        INSERT INTO schema_migrations (filename, checksum, applied_at)
        VALUES (${filename}, ${checksum}, NOW())
        ON CONFLICT (filename)
        DO UPDATE SET checksum = EXCLUDED.checksum, applied_at = NOW()
      `;
    });
    console.log("Applied:", migrationPath);
  }
} catch (err) {
  const code = err?.code ?? err?.errno;
  if (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ECONNREFUSED") {
    console.error(`
Connection failed (${code}). Typical fixes:
  • Neon / Supabase / managed Postgres: ensure DATABASE_URL includes SSL, e.g. ?sslmode=require
    (this script already sets ssl=require for non-local hosts; double-check the URL host/user/password.)
  • Special characters in the password (@ # : etc.) must be percent-encoded in the URL.
  • VPN / firewall may block outbound 5432; try another network or allowlist rules on the DB provider.
`);
  }
  throw err;
} finally {
  await sql.end({ timeout: 5 });
}
