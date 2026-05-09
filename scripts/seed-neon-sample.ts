/**
 * Insert SAMPLE_VACANCY_TEMPLATES into Postgres (Neon) via DATABASE_URL.
 * No Firebase migration; no API auth required.
 *
 * Usage:
 *   npm run db:seed:samples
 *
 * Optional .env.local:
 *   SEED_OWNER_FIREBASE_UID=yourRealFirebaseUid   (so /api/jobs/mine & dashboard match when signed in)
 *
 * Re-running creates additional rows (same templates, new vacancy ids). Delete from SQL if you need a clean slate.
 */

import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { insertVacancyForOwner } from "../src/server/jobs/postgresVacancies";
import { SAMPLE_VACANCY_TEMPLATES } from "../src/server/jobs/sampleTemplates";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

config({ path: join(root, ".env.local") });
config({ path: join(root, ".env") });

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required (e.g. in .env.local).");
  }

  const ownerUid =
    process.env.SEED_OWNER_FIREBASE_UID?.trim() || "neon-sample-seed-owner";

  const jobs = [];
  for (const template of SAMPLE_VACANCY_TEMPLATES) {
    const row = await insertVacancyForOwner({
      ownerUid,
      companyName: template.companyName,
      jobTitle: template.jobTitle,
      location: template.location,
      salary: template.salary,
      description: template.description,
      requirements: template.requirements,
    });
    jobs.push(row.id);
    console.log("inserted:", row.jobTitle, "→", row.id);
  }

  console.log(
    JSON.stringify({ ownerUid, inserted: jobs.length, vacancyIds: jobs }, null, 2),
  );
  console.log(
    "\nTip: Set SEED_OWNER_FIREBASE_UID to your Firebase user id so recruiter dashboard listings align with your signed-in user.",
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
