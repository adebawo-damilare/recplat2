/**
 * Run Playwright with E2E_RUN_AUTH=1 so auth.setup + authenticated specs run.
 * Requires DATABASE_URL + TALENTBRIDGE_AUTH_SECRET for the dev server (e.g. from .env.local).
 */
import { spawnSync } from "node:child_process";

process.env.E2E_RUN_AUTH = "1";

const extra = process.argv.slice(2).join(" ");
const cmd = `npx playwright test${extra ? ` ${extra}` : ""}`;
const r = spawnSync(cmd, {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(r.status ?? 1);
