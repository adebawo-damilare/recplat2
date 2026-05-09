import {
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  Timestamp,
  where,
} from "firebase/firestore/lite";
import type { Vacancy } from "../lib/firebase";
import { serverDb } from "./firebaseServer";

export interface PaginatedVacanciesResult {
  jobs: Vacancy[];
  nextCursor: string | null;
}

interface CursorPayload {
  createdAtMs: number;
  id: string;
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as CursorPayload;
    if (!parsed || typeof parsed.createdAtMs !== "number" || typeof parsed.id !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function fetchOpenVacanciesPage(rawLimit: number, cursor?: string | null): Promise<PaginatedVacanciesResult> {
  const pageSize = Math.max(1, Math.min(rawLimit, 50));

  let baseQuery = query(
    collection(serverDb, "vacancies"),
    where("status", "==", "open"),
    orderBy("createdAt", "desc"),
    orderBy(documentId(), "desc"),
    limit(pageSize + 1),
  );

  const cursorPayload = cursor ? decodeCursor(cursor) : null;
  if (cursor && !cursorPayload) {
    throw new Error("INVALID_CURSOR");
  }

  if (cursorPayload) {
    baseQuery = query(
      collection(serverDb, "vacancies"),
      where("status", "==", "open"),
      orderBy("createdAt", "desc"),
      orderBy(documentId(), "desc"),
      startAfter(Timestamp.fromMillis(cursorPayload.createdAtMs), cursorPayload.id),
      limit(pageSize + 1),
    );
  }

  const snapshot = await getDocs(baseQuery);
  const docs = snapshot.docs;
  const hasMore = docs.length > pageSize;
  const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;

  const jobs = pageDocs.map((d) => ({ id: d.id, ...d.data() } as Vacancy));

  const last = pageDocs[pageDocs.length - 1];
  let nextCursor: string | null = null;

  if (hasMore && last) {
    const createdAt = last.data().createdAt;
    const createdAtMs = createdAt instanceof Timestamp ? createdAt.toMillis() : Date.now();
    nextCursor = encodeCursor({ createdAtMs, id: last.id });
  }

  return { jobs, nextCursor };
}