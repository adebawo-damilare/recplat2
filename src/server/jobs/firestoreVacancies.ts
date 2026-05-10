/**
 * Legacy Firestore listing for vacancies when `DATABASE_URL` is unset and
 * `TALENTBRIDGE_JOBS_POSTGRES_ONLY` is not set. Jobs Slice v1 production uses Postgres only
 * (`docs/MVP_JOBS_SLICE_V1.md`).
 */
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
import type { Vacancy } from "../../lib/firebase";
import { serverDb } from "../firebaseServer";
import { decodeVacancyCursor, encodeVacancyCursor } from "./cursor";

export interface PaginatedVacanciesResult {
  jobs: Vacancy[];
  nextCursor: string | null;
}

export async function fetchOpenVacanciesPageFromFirestore(
  rawLimit: number,
  cursor?: string | null,
): Promise<PaginatedVacanciesResult> {
  const pageSize = Math.max(1, Math.min(rawLimit, 50));

  let baseQuery = query(
    collection(serverDb, "vacancies"),
    where("status", "==", "open"),
    orderBy("createdAt", "desc"),
    orderBy(documentId(), "desc"),
    limit(pageSize + 1),
  );

  const cursorPayload = cursor ? decodeVacancyCursor(cursor) : null;
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
    nextCursor = encodeVacancyCursor({ createdAtMs, id: last.id });
  }

  return { jobs, nextCursor };
}
