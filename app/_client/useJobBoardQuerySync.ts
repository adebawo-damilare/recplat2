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

function locationMatchesState(
  pathname: string,
  lane: string,
  q: string,
  jt: "all" | JobType,
  pageIndex: number,
): boolean {
  if (typeof window === "undefined") return true;
  const desired = `${pathname}${serializeToQuery(lane, q, jt, pageIndex)}`;
  const current = `${pathname}${window.location.search}`;
  return desired === current;
}

/**
 * Keeps /jobs filters and pagination in the query string for shareable URLs (Next app only).
 *
 * URL writes happen in one `useEffect` only (never duplicate `router.replace` from handlers).
 * Compare against `window.location` — not `searchParams` in deps — to avoid replace loops.
 *
 * `page` is 1-based in the URL (`?page=2` = second page). Filter changes reset to page 1.
 */
export function useJobBoardQuerySync(lanes: { slug: string }[]): JobBoardSyncedQuery {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [laneFilter, setLaneFilter] = useState(() =>
    normalizeLaneFromParams(searchParams.get("category") || "all", lanes),
  );
  const [jobTypeFilter, setJobTypeFilter] = useState<"all" | JobType>(() =>
    normalizeJobTypeFromParams(searchParams.get("jobType")),
  );
  const [searchTerm, setSearchTerm] = useState(() => qFromSearchParams(searchParams));
  const [debouncedSearch, setDebouncedSearch] = useState(() => qFromSearchParams(searchParams));
  const [pageIndex, setPageIndex] = useState(() => pageIndexFromSearchParams(searchParams));

  const prevLaneJobTypeKey = useRef<string | null>(null);
  const prevDebouncedSearch = useRef<string | null>(null);
  const routerRef = useRef(router);
  routerRef.current = router;
  const urlSyncReady = useRef(false);

  useLayoutEffect(() => {
    const spSource =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : searchParams;
    const lane = normalizeLaneFromParams(spSource.get("category") || "all", lanes);
    const jt = normalizeJobTypeFromParams(spSource.get("jobType"));
    const qUrl = qFromSearchParams(spSource);
    const pageFromUrl = pageIndexFromSearchParams(spSource);
    const catJt = `${lane}|${jt}`;

    setLaneFilter(lane);
    setJobTypeFilter(jt);
    setPageIndex((cur) => (cur === pageFromUrl ? cur : pageFromUrl));

    if (prevLaneJobTypeKey.current === null) {
      prevLaneJobTypeKey.current = catJt;
      prevDebouncedSearch.current = qUrl.trim();
      setSearchTerm(qUrl);
      setDebouncedSearch(qUrl.trim());
      urlSyncReady.current = true;
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
    if (!urlSyncReady.current) return;
    if (locationMatchesState(pathname, laneFilter, debouncedSearch, jobTypeFilter, pageIndex)) {
      return;
    }
    routerRef.current.replace(
      `${pathname}${serializeToQuery(laneFilter, debouncedSearch, jobTypeFilter, pageIndex)}`,
      { scroll: false },
    );
  }, [debouncedSearch, laneFilter, jobTypeFilter, pageIndex, pathname]);

  useEffect(() => {
    const syncFromWindow = () => {
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

  const onLaneChange = (lane: string) => {
    const nextLane = lane === "all" ? "all" : normalizeLaneFromParams(lane, lanes);
    setLaneFilter(nextLane);
    setPageIndex(0);
  };

  const onJobTypeChange = (jt: "all" | JobType) => {
    setJobTypeFilter(jt);
    setPageIndex(0);
  };

  const onPageChange = (nextIndex: number) => {
    setPageIndex(Math.max(0, Math.floor(nextIndex)));
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
