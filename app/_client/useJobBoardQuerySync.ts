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

type JobBoardQueryTriple = { cat: string; q: string; jt: string };

function tripleFromSearchParams(searchParams: { get: (k: string) => string | null }): JobBoardQueryTriple {
  return {
    cat: (searchParams.get("category") || "").trim().toLowerCase(),
    q: qFromSearchParams(searchParams),
    jt: (searchParams.get("jobType") || "").trim().toLowerCase(),
  };
}

function tripleFromFilters(lane: string, q: string, jt: "all" | JobType): JobBoardQueryTriple {
  return {
    cat: lane === "all" ? "" : lane.trim().toLowerCase(),
    q: q.trim().slice(0, 200),
    jt: jt === "all" ? "" : jt,
  };
}

function triplesEqual(a: JobBoardQueryTriple, b: JobBoardQueryTriple): boolean {
  return a.cat === b.cat && a.q === b.q && a.jt === b.jt;
}

/** Canonical query string for /jobs (category, q, jobType). */
function serializeToQuery(lane: string, q: string, jt: "all" | JobType): string {
  const p = new URLSearchParams();
  if (lane !== "all") p.set("category", lane);
  const qt = q.trim().slice(0, 200);
  if (qt) p.set("q", qt);
  if (jt !== "all") p.set("jobType", jt);
  const s = p.toString();
  return s ? `?${s}` : "";
}

/**
 * Keeps /jobs filters in the query string for shareable URLs (Next app only).
 * Wired from `JobsClientPage` into `JobBoard` as `syncedQuery`.
 *
 * `q` is pushed on debounce. It is **not** read back from the URL when only `q`
 * changes (avoids clobbering in-progress typing while the address bar lags).
 * Full `q` sync happens on first hydration, when **category or jobType** in the
 * URL changes, or on **popstate** (browser back/forward).
 *
 * URL sync compares filter state to **`window.location.search`** (not only
 * `useSearchParams()`), so we do not call `router.replace` in a tight loop when
 * React’s search params briefly lag after a client navigation.
 *
 * **`lastPushedTriple` ref:** Before each `router.replace`, we store the query
 * triple we intend. `useLayoutEffect` skips hydrating lane / jobType / `q` from
 * the URL until **either** `window` **or** `useSearchParams()` matches that
 * triple, so stale `searchParams` cannot overwrite **All** (or other choices)
 * while the address bar is already updated — and we still apply **optimistic**
 * `setLaneFilter` / `setJobTypeFilter` in the dropdown handlers so the UI does
 * not flicker while waiting for the router.
 */
export function useJobBoardQuerySync(lanes: { slug: string }[]): JobBoardSyncedQuery {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [laneFilter, setLaneFilter] = useState("all");
  const [jobTypeFilter, setJobTypeFilter] = useState<"all" | JobType>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const prevLaneJobTypeKey = useRef<string | null>(null);
  const routerRef = useRef(router);
  routerRef.current = router;
  /** Triple we last `router.replace`d; until URL matches, ignore stale URL hydration. */
  const lastPushedTriple = useRef<JobBoardQueryTriple | null>(null);

  useLayoutEffect(() => {
    const fromWin =
      typeof window !== "undefined"
        ? tripleFromSearchParams(new URLSearchParams(window.location.search))
        : null;
    const fromSp = tripleFromSearchParams(searchParams);

    if (lastPushedTriple.current !== null) {
      const winOk = fromWin !== null && triplesEqual(fromWin, lastPushedTriple.current);
      const spOk = triplesEqual(fromSp, lastPushedTriple.current);
      if (!winOk && !spOk) {
        return;
      }
      lastPushedTriple.current = null;
    }

    const spSource =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : searchParams;
    const lane = normalizeLaneFromParams(spSource.get("category") || "all", lanes);
    const jt = normalizeJobTypeFromParams(spSource.get("jobType"));
    const qUrl = qFromSearchParams(spSource);
    const catJt = `${lane}|${jt}`;

    setLaneFilter(lane);
    setJobTypeFilter(jt);

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
    }
  }, [searchParams.toString(), lanes]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const stateT = tripleFromFilters(laneFilter, debouncedSearch, jobTypeFilter);
    const urlSource =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : searchParams;
    const urlT = tripleFromSearchParams(urlSource);
    if (triplesEqual(stateT, urlT)) return;
    lastPushedTriple.current = stateT;
    routerRef.current.replace(`${pathname}${serializeToQuery(laneFilter, debouncedSearch, jobTypeFilter)}`, {
      scroll: false,
    });
  }, [debouncedSearch, laneFilter, jobTypeFilter, pathname, searchParams.toString()]);

  useEffect(() => {
    const syncFromWindow = () => {
      lastPushedTriple.current = null;
      const sp = new URLSearchParams(window.location.search);
      const lane = normalizeLaneFromParams(sp.get("category") || "all", lanes);
      const jt = normalizeJobTypeFromParams(sp.get("jobType"));
      const qUrl = qFromSearchParams(sp);
      prevLaneJobTypeKey.current = `${lane}|${jt}`;
      setLaneFilter(lane);
      setJobTypeFilter(jt);
      setSearchTerm(qUrl);
      setDebouncedSearch(qUrl.trim());
    };
    window.addEventListener("popstate", syncFromWindow);
    return () => window.removeEventListener("popstate", syncFromWindow);
  }, [lanes]);

  const onLaneChange = (lane: string) => {
    const nextLane = lane === "all" ? "all" : normalizeLaneFromParams(lane, lanes);
    const nextTriple = tripleFromFilters(nextLane, debouncedSearch, jobTypeFilter);
    lastPushedTriple.current = nextTriple;
    setLaneFilter(nextLane);
    router.replace(`${pathname}${serializeToQuery(nextLane, debouncedSearch, jobTypeFilter)}`, { scroll: false });
  };

  const onJobTypeChange = (jt: "all" | JobType) => {
    const nextTriple = tripleFromFilters(laneFilter, debouncedSearch, jt);
    lastPushedTriple.current = nextTriple;
    setJobTypeFilter(jt);
    router.replace(`${pathname}${serializeToQuery(laneFilter, debouncedSearch, jt)}`, { scroll: false });
  };

  return {
    laneFilter,
    jobTypeFilter,
    searchTerm,
    setSearchTerm,
    debouncedSearch,
    onLaneChange,
    onJobTypeChange,
  };
}
