export interface VacancyCursorPayload {
  createdAtMs: number;
  id: string;
}

export function encodeVacancyCursor(payload: VacancyCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeVacancyCursor(cursor: string): VacancyCursorPayload | null {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as VacancyCursorPayload;
    if (!parsed || typeof parsed.createdAtMs !== "number" || typeof parsed.id !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
