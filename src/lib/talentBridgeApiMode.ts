/**
 * Jobs Slice v1 production: vacancy + application persistence via Postgres APIs only
 * (see docs/MVP_JOBS_SLICE_V1.md). Disables client-side Firestore fallbacks for job data.
 */

export function isBrowserJobsPostgresOnly(): boolean {
  return process.env.NEXT_PUBLIC_TALENTBRIDGE_JOBS_POSTGRES_ONLY === "1";
}

/** Legacy name — when Postgres-only, API failures should surface without treating them as retryable externally. */
export function shouldFallbackToFirestoreForJobsApi(status: number, payload?: { code?: string }) {
  if (isBrowserJobsPostgresOnly()) {
    return false;
  }
  if (status === 503) return true;
  const code = payload?.code;
  return code === "POSTGRES_UNAVAILABLE" || code === "AUTH_UNAVAILABLE";
}
