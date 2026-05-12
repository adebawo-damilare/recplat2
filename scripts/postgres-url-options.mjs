/**
 * Shared connection options for `postgres` / Neon / CI Docker Postgres.
 * Must match db-apply behavior: do not require TLS for localhost (CI service container).
 */
export function postgresOptions(databaseUrl) {
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

  if (!sslExplicitlyOff && !isLocal) {
    opts.ssl = "require";
  }

  return opts;
}
