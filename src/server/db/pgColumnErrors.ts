/** Flatten Drizzle/postgres.js error chains (cause is not always on err.message). */
export function errorChainText(err: unknown): string {
  const parts: string[] = [];
  let current: unknown = err;
  for (let depth = 0; depth < 8 && current; depth += 1) {
    if (current instanceof Error) {
      parts.push(current.message);
      current = current.cause;
    } else if (typeof current === "object" && current !== null && "message" in current) {
      parts.push(String((current as { message: unknown }).message));
      current =
        "cause" in current ? (current as { cause?: unknown }).cause : undefined;
    } else {
      parts.push(String(current));
      break;
    }
  }
  return parts.join(" ");
}

export function isMissingPgColumn(err: unknown, columnName: string): boolean {
  const pattern = new RegExp(`\\b${columnName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return pattern.test(errorChainText(err));
}
