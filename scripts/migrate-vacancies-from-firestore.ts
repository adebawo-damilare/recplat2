/**
 * Read all `vacancies` documents from Firestore (Admin SDK) and upsert into Postgres
 * using each Firestore document id as `vacancies.id` (idempotent re-runs).
 *
 * Prerequisites:
 * - FIREBASE_SERVICE_ACCOUNT_JSON (same as API routes)
 * - DATABASE_URL + applied migration (`npm run db:apply`)
 *
 * Optional env:
 * - FIRESTORE_DATABASE_ID — overrides `firestoreDatabaseId` from firebase-applet-config.json
 *
 * Flags:
 * - --dry-run — no Postgres writes; does not require DATABASE_URL
 * - --open-only — skip documents where status !== "open"
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { upsertVacancyFromFirestore } from "../src/server/jobs/postgresVacancies";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

config({ path: join(root, ".env.local") });
config({ path: join(root, ".env") });

function parseArgs() {
  const argv = process.argv.slice(2);
  return {
    dryRun: argv.includes("--dry-run"),
    openOnly: argv.includes("--open-only"),
  };
}

function loadFirestoreDatabaseId(): string | undefined {
  const fromEnv = process.env.FIRESTORE_DATABASE_ID?.trim();
  if (fromEnv) return fromEnv;
  try {
    const raw = readFileSync(join(root, "firebase-applet-config.json"), "utf8");
    const j = JSON.parse(raw) as { firestoreDatabaseId?: string };
    return j.firestoreDatabaseId?.trim();
  } catch {
    return undefined;
  }
}

function initFirebaseAdmin() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!json) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is required.");
  }
  if (getApps().length > 0) return getApps()[0]!;
  return initializeApp({ credential: cert(JSON.parse(json) as Record<string, unknown>) });
}

function coerceString(data: Record<string, unknown>, key: string) {
  const v = data[key];
  if (typeof v === "string") return v;
  if (v == null) return "";
  return String(v);
}

function toOptionalDate(v: unknown): Date | undefined {
  if (v == null) return undefined;
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  const td = v as { toDate?: () => Date };
  if (typeof td.toDate === "function") return td.toDate();
  return undefined;
}

function normalizeStatus(v: unknown): "open" | "closed" {
  return v === "closed" ? "closed" : "open";
}

async function main() {
  const { dryRun, openOnly } = parseArgs();

  if (!dryRun && !process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required unless --dry-run.");
  }

  const app = initFirebaseAdmin();
  const dbId = loadFirestoreDatabaseId();
  const fsDb = dbId && dbId !== "(default)" ? getFirestore(app, dbId) : getFirestore(app);

  const snapshot = await fsDb.collection("vacancies").get();
  let processed = 0;
  let skipped = 0;
  let upserted = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() as Record<string, unknown>;
    const id = doc.id;

    const status = normalizeStatus(data.status);
    if (openOnly && status !== "open") {
      skipped += 1;
      continue;
    }

    const postedBy = coerceString(data, "postedBy").trim();
    const jobTitle = coerceString(data, "jobTitle").trim();
    const companyName = coerceString(data, "companyName").trim();

    if (!postedBy || !jobTitle || !companyName) {
      console.warn(`[skip] ${id}: missing postedBy, jobTitle, or companyName`);
      skipped += 1;
      continue;
    }

    const location = coerceString(data, "location").trim() || "—";
    const salary = coerceString(data, "salary").trim() || "—";
    const description = coerceString(data, "description");
    const requirements = coerceString(data, "requirements");
    const createdAt = toOptionalDate(data.createdAt) ?? new Date();
    const updatedAt = toOptionalDate(data.updatedAt) ?? createdAt;

    processed += 1;

    if (dryRun) {
      if (processed <= 5) {
        console.log(`[dry-run] would upsert ${id} "${jobTitle}" @ ${companyName}`);
      }
      upserted += 1;
      continue;
    }

    await upsertVacancyFromFirestore({
      firestoreDocId: id,
      ownerUid: postedBy,
      companyName,
      jobTitle,
      location,
      salary,
      description,
      requirements,
      status,
      createdAt,
      updatedAt,
    });
    upserted += 1;
  }

  console.log(
    JSON.stringify(
      {
        firestoreDocs: snapshot.size,
        processed,
        upserted,
        skipped,
        dryRun,
        openOnly,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
