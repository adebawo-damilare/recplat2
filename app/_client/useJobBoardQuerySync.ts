"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { JobBoardSyncedQuery } from "../../src/components/jobs/jobBoardSyncedQueryTypes";
import type { JobType } from "../../src/shared/jobTypes";
import { isJobType } from "../../src/shared/jobTypes";

function normalizeLaneFromParams(catRaw: string, lanes: { slug: string }[]): string {
  const c = catRaw.trim().toLowerCase();
  if (!c || c === "all") return "all";
  if (lanes.length === 0) return c;
  return lanes.some((l) => l.slug === c) ? c : "all";
}

function normalizeJobTypeFromParams(jtRaw: string | null): "all" | JobType {
  const j = (jtRaw || "all").trim().toLowerCase();
  if (!j || j === "all") return "all";
  return isJobType(j) ? j : "all";
}

function qFromSearchParams(searchParams: { get: (k: string) => string | null }): string {
  return (searchParams.get("q") || "").trim().slice(0, 200);
}

/** URL uses 1-based `page` (page=1 omitted); internal state is 0-based pageIndex. */
function pageIndexFromSearchParams(searchParams: { get: (k: string) => string | null }): number {
  const raw = Number(searchParams.get("page") || "1");
  if (!Number.isFinite(raw) || raw < 1) return 0;
  return Math.floor(raw) - 1;
}

function pageParamFromIndex(pageIndex: number): string {
  return pageIndex <= 0 ? "" : String(pageIndex + 1);
}

type JobBoardQueryQuad = { cat: string; q: string; jt: string; page: string };

function quadFromSearchParams(searchParams: { get: (k: string) => string | null }): JobBoardQueryQuad {
  return {
    cat: (searchParams.get("category") || "").trim().toLowerCase(),
    q: qFromSearchParams(searchParams),
    jt: (searchParams.get("jobType") || "").trim().toLowerCase(),
    page: (searchParams.get("page") || "").trim(),
  };
}

function quadFromState(
  lane: string,
  q: string,
  jt: "all" | JobType,
  pageIndex: number,
): JobBoardQueryQuad {
  return {
    cat: lane === "all" ? "" : lane.trim().toLowerCase(),
    q: q.trim().slice(0, 200),
    jt: jt === "all" ? "" : jt,
    page: pageParamFromIndex(pageIndex),
  };
}

function quadsEqual(a: JobBoardQueryQuad, b: JobBoardQueryQuad): boolean {
  return a.cat === b.cat && a.q === b.q && a.jt === b.jt && a.page === b.page;
}

/** Canonical query string for /jobs (category, q, jobType, page). */
function serializeToQuery(lane: string, q: string, jt: "all" | JobType, pageIndex: number): string {
  const p = new URLSearchParams();
  if (lane !== "all") p.set("category", lane);
  const qt = q.trim().slice(0, 200);
  if (qt) p.set("q", qt);
  if (jt !== "all") p.set("jobType", jt);
  const page = pageParamFromIndex(pageIndex);
  if (page) p.set("page", page);
  const s = p.toString();
  return s ? `?${s}` : "";
}

/**
 * Keeps /jobs filters and pagination in the query string for shareable URLs (Next app only).
 * Wired from `JobsClientPage` into `JobBoard` as `syncedQuery`.
 *
 * `q` is pushed on debounce. It is **not** read back from the URL when only `q`
 * changes (avoids clobbering in-progress typing while the address bar lags).
 * Full `q` sync happens on first hydration, when **category or jobType** in the
 * URL changes, or on **popstate** (browser back/forward).
 *
 * `page` is 1-based in the URL (`?page=2` = second page). Filter changes reset to page 1.
 */
export function useJobBoardQuerySync(lanes: { slug: string }[]): JobBoardSyncedQuery {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [laneFilter, setLaneFilter] = useState("all");
  const [jobTypeFilter, setJobTypeFilter] = useState<"all" | JobType>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const prevLaneJobTypeKey = useRef<string | null>(null);
  const prevDebouncedSearch = useRef<string | null>(null);
  const routerRef = useRef(router);
  routerRef.current = router;
  /** Quad we last `router.replace`d; until URL matches, ignore stale URL hydration. */
  const lastPushedQuad = useRef<JobBoardQueryQuad | null>(null);

  useLayoutEffect(() => {
    const fromWin =
      typeof window !== "undefined"
        ? quadFromSearchParams(new URLSearchParams(window.location.search))
        : null;
    const fromSp = quadFromSearchParams(searchParams);

    if (lastPushedQuad.current !== null) {
      const winOk = fromWin !== null && quadsEqual(fromWin, lastPushedQuad.current);
      const spOk = quadsEqual(fromSp, lastPushedQuad.current);
      if (!winOk && !spOk) {
        return;
      }
      lastPushedQuad.current = null;
    }

    const spSource =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : searchParams;
    const lane = normalizeLaneFromParams(spSource.get("category") || "all", lanes);
    const jt = normalizeJobTypeFromParams(spSource.get("jobType"));
    const qUrl = qFromSearchParams(spSource);
    const pageFromUrl = pageIndexFromSearchParams(spSource);
    const catJt = `${lane}|${jt}`;

    setLaneFilter(lane);
    setJobTypeFilter(jt);
    setPageIndex(pageFromUrl);

    if (prevLaneJobTypeKey.current === null) {
      prevLaneJobTypeKey.current = catJt;
      setSearchTerm(qUrl);
      setDebouncedSearch(qUrl.trim());
      return;
    }

    if (prevLaneJobTypeKey.current !== catJt) {
      prevLaneJobTypeKey.current = catJt;
      setSearchTerm(qUrl);
      setDebouncedSearch(qUrl.trim());
      setPageIndex(0);
    }
  }, [searchParams.toString(), lanes]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useLayoutEffect(() => {
    if (prevDebouncedSearch.current !== null && prevDebouncedSearch.current !== debouncedSearch) {
      setPageIndex(0);
    }
    prevDebouncedSearch.current = debouncedSearch;
  }, [debouncedSearch]);

  useEffect(() => {
    const stateQ = quadFromState(laneFilter, debouncedSearch, jobTypeFilter, pageIndex);
    const urlSource =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : searchParams;
    const urlQ = quadFromSearchParams(urlSource);
    if (quadsEqual(stateQ, urlQ)) return;
    lastPushedQuad.current = stateQ;
    routerRef.current.replace(
      `${pathname}${serializeToQuery(laneFilter, debouncedSearch, jobTypeFilter, pageIndex)}`,
      { scroll: false },
    );
  }, [debouncedSearch, laneFilter, jobTypeFilter, pageIndex, pathname, searchParams.toString()]);

  useEffect(() => {
    const syncFromWindow = () => {
      lastPushedQuad.current = null;
      const sp = new URLSearchParams(window.location.search);
      const lane = normalizeLaneFromParams(sp.get("category") || "all", lanes);
      const jt = normalizeJobTypeFromParams(sp.get("jobType"));
      const qUrl = qFromSearchParams(sp);
      prevLaneJobTypeKey.current = `${lane}|${jt}`;
      setLaneFilter(lane);
      setJobTypeFilter(jt);
      setSearchTerm(qUrl);
      setDebouncedSearch(qUrl.trim());
      setPageIndex(pageIndexFromSearchParams(sp));
    };
    window.addEventListener("popstate", syncFromWindow);
    return () => window.removeEventListener("popstate", syncFromWindow);
  }, [lanes]);

  const pushUrl = (lane: string, q: string, jt: "all" | JobType, page: number) => {
    const nextQuad = quadFromState(lane, q, jt, page);
    lastPushedQuad.current = nextQuad;
    router.replace(`${pathname}${serializeToQuery(lane, q, jt, page)}`, { scroll: false });
  };

  const onLaneChange = (lane: string) => {
    const nextLane = lane === "all" ? "all" : normalizeLaneFromParams(lane, lanes);
    setLaneFilter(nextLane);
    setPageIndex(0);
    pushUrl(nextLane, debouncedSearch, jobTypeFilter, 0);
  };

  const onJobTypeChange = (jt: "all" | JobType) => {
    setJobTypeFilter(jt);
    setPageIndex(0);
    pushUrl(laneFilter, debouncedSearch, jt, 0);
  };

  const onPageChange = (nextIndex: number) => {
    const safe = Math.max(0, Math.floor(nextIndex));
    setPageIndex(safe);
    pushUrl(laneFilter, debouncedSearch, jobTypeFilter, safe);
  };

  return {
    laneFilter,
    jobTypeFilter,
    searchTerm,
    setSearchTerm,
    debouncedSearch,
    pageIndex,
    onPageChange,
    onLaneChange,
    onJobTypeChange,
  };
}
