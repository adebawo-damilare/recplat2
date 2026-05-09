import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../schema";

let sql: ReturnType<typeof postgres> | null = null;
let db: ReturnType<typeof drizzle> | null = null;

function tlsOptionsForUrl(databaseUrl: string): { ssl?: "require" } {
  let hostname = "";
  try {
    hostname = new URL(databaseUrl).hostname;
  } catch {
    //
  }

  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    hostname === "host.docker.internal";

  const sslExplicitlyOff =
    /sslmode\s*=\s*disable/i.test(databaseUrl) || /[?&]ssl\s*=\s*0\b/i.test(databaseUrl);

  if (!sslExplicitlyOff && !isLocal) {
    return { ssl: "require" };
  }
  return {};
}

export function hasPostgresConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/** Serverless-friendly small pool; Neon/Supabase pooler URLs work well with postgres.js */
export function getPostgresSql() {
  if (!hasPostgresConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }
  const url = process.env.DATABASE_URL!;
  if (!sql) {
    sql = postgres(url, {
      max: Number(process.env.POSTGRES_POOL_MAX || 5),
      ...tlsOptionsForUrl(url),
    });
  }
  return sql;
}

export function getDrizzleDb() {
  if (!db) {
    db = drizzle(getPostgresSql(), { schema });
  }
  return db;
}
