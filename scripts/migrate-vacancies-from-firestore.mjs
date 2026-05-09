/**
 * Placeholder for a Firestore → Postgres vacancy backfill.
 *
 * Planned behavior (not implemented yet):
 * - Read open vacancies from Firestore with the Firebase Admin SDK
 * - Upsert companies + vacancies into Postgres using the same shapes as `insertVacancyForOwner`
 * - Idempotent on vacancy document id or a stable content hash
 *
 * Prerequisites: DATABASE_URL, FIREBASE_SERVICE_ACCOUNT_JSON (or GOOGLE_APPLICATION_CREDENTIALS)
 *
 * See docs/ROADMAP.md
 */
console.log(`
migrate-vacancies-from-firestore: not implemented yet.

Next steps:
1. Apply SQL: npm run db:apply
2. Configure DATABASE_URL and FIREBASE_SERVICE_ACCOUNT_JSON
3. Implement batch read + drizzle insert in this script (or a tsx worker)
`);
process.exit(0);
