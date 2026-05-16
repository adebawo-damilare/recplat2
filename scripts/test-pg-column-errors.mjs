import assert from "node:assert/strict";
import { errorChainText, isMissingPgColumn } from "../src/server/db/pgColumnErrors.ts";

class DrizzleQueryError extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
  }
}

const wrapped = new DrizzleQueryError(
  'Failed query: insert into "applications" ... "status_updated_at"',
  { message: 'column "status_updated_at" of relation "applications" does not exist' },
);

assert.match(errorChainText(wrapped), /status_updated_at/);
assert.equal(isMissingPgColumn(wrapped, "status_updated_at"), true);
assert.equal(isMissingPgColumn(wrapped, "other_col"), false);

console.log("test-pg-column-errors: ok");
