/**
 * Point .env.local at a downloaded Firebase service account JSON file (safer than embedding JSON).
 * Usage: npm run env:firebase -- "C:\\path\\to\\project-firebase-adminsdk-xxxxx.json"
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));

if (positional.length === 0) {
  console.error(`Missing path to Firebase service account JSON.

1. Firebase Console → Project settings → Service accounts → Generate new private key.
2. Then run:

   npm run env:firebase -- "C:\\\\Users\\\\YOU\\\\Downloads\\\\your-project-xxxxx.json"

Forward slashes also work:

   npm run env:firebase -- "C:/Users/YOU/Downloads/your-project-xxxxx.json"
`);
  process.exit(1);
}

const keyPath = positional[0];
const absPath = isAbsolute(keyPath) ? resolve(keyPath) : resolve(repoRoot, keyPath);

try {
  const raw = readFileSync(absPath, "utf8");
  JSON.parse(raw);
} catch {
  console.error(`Invalid or unreadable JSON file: ${absPath}`);
  process.exit(1);
}

const posixPath = absPath.replace(/\\/g, "/");

const envLocalPath = join(repoRoot, ".env.local");
/** @type {string[]} */
let lines = [];
if (existsSync(envLocalPath)) {
  lines = readFileSync(envLocalPath, "utf8").split(/\r?\n/);
}

const next = lines.filter((line) => line && !/^\s*FIREBASE_SERVICE_ACCOUNT_PATH\s*=/.test(line));
while (next.length > 0 && next[next.length - 1]?.trim() === "") next.pop();
next.push(`FIREBASE_SERVICE_ACCOUNT_PATH=${posixPath}`);
next.push("");

writeFileSync(envLocalPath, next.join("\n"), "utf8");
console.log(`Updated ${envLocalPath}`);
console.log(`FIREBASE_SERVICE_ACCOUNT_PATH=${posixPath}`);
console.log("Restart the Next dev server to pick up the change.");
