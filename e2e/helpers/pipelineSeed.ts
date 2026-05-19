import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { APIRequestContext } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, "..", ".auth", "seed.json");

export type E2eSeed = {
  pipelineApplicationId?: string;
};

export async function readE2eSeed(): Promise<E2eSeed> {
  const seedRaw = await readFile(seedPath, "utf8");
  return JSON.parse(seedRaw) as E2eSeed;
}

export async function setPipelineApplicationStatus(
  request: APIRequestContext,
  applicationId: string,
  status: string,
): Promise<void> {
  const res = await request.patch(`/api/applications/${applicationId}`, {
    headers: { "content-type": "application/json" },
    data: { status },
  });
  if (!res.ok()) {
    throw new Error(`PATCH /api/applications/${applicationId}: ${res.status()} ${await res.text()}`);
  }
}

/** Reset the shared E2E pipeline application so recruiter specs do not depend on run order. */
export async function resetPipelineApplicationToApplied(request: APIRequestContext): Promise<void> {
  const seed = await readE2eSeed();
  const applicationId = seed.pipelineApplicationId;
  if (!applicationId) {
    throw new Error("E2E seed missing pipelineApplicationId");
  }
  await setPipelineApplicationStatus(request, applicationId, "applied");
}
