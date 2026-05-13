/**
 * Insert SAMPLE_VACANCY_TEMPLATES into Postgres (Neon) via DATABASE_URL.
 * Scripted Postgres inserts; no API auth required.
 *
 * Usage:
 *   npm run db:seed:samples
 *
 * Optional .env.local:
 *   SEED_OWNER_USER_ID=<uuid> — optional fixed owner id for scripted seeds (normally use a logged-in app's user UUID)
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

  const ownerUserId =
    process.env.SEED_OWNER_USER_ID?.trim() || "neon-sample-seed-owner";

  const jobs = [];

  try {
    for (const template of SAMPLE_VACANCY_TEMPLATES) {
      const row = await insertVacancyForOwner({
        ownerUserId,
        companyName: template.companyName,
        jobTitle: template.jobTitle,
        jobType: template.jobType,
        location: template.location,
        salary: template.salary,
        description: template.description,
        requirements: template.requirements,
        categorySlug: template.categorySlug,
      });
      jobs.push(row.id);
      console.log("inserted:", row.jobTitle, "→", row.id);
    }
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_CATEGORY_SLUG") {
      throw new Error(
        `${e.message}: apply migration database/migrations/0002_categories.sql first (npm run db:apply:categories).`,
      );
    }
    throw e;
  }

  console.log(
    JSON.stringify({ ownerUserId, inserted: jobs.length, vacancyIds: jobs }, null, 2),
  );
  console.log(
    "\nTip: Set SEED_OWNER_USER_ID to your Postgres `users.id` UUID so recruiter dashboard listings align when using that identity.",
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
