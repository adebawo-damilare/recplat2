import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../schema";

let sql: ReturnType<typeof postgres> | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export function hasPostgresConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/** Serverless-friendly small pool; Neon/Supabase pooler URLs work well with postgres.js */
export function getPostgresSql() {
  if (!hasPostgresConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }
  if (!sql) {
    sql = postgres(process.env.DATABASE_URL!, { max: Number(process.env.POSTGRES_POOL_MAX || 5) });
  }
  return sql;
}

export function getDrizzleDb() {
  if (!db) {
    db = drizzle(getPostgresSql(), { schema });
  }
  return db;
}
