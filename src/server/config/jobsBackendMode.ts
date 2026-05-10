/**
 * Jobs Slice v1+ default for production: require Postgres for vacancy/application data only.
 * Firestore legacy path remains available when unset (local / migration).
 */

export function isJobsPostgresOnly(): boolean {
  return process.env.TALENTBRIDGE_JOBS_POSTGRES_ONLY === "1";
}
