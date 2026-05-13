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
  return (searchParams.get("q") || "").slice(0, 200);
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

function queryTripleMatchesUrl(
  lane: string,
  q: string,
  jt: "all" | JobType,
  searchParams: { get: (k: string) => string | null },
): boolean {
  const wantCat = lane === "all" ? "" : lane;
  const wantQ = q.trim().slice(0, 200);
  const wantJt = jt === "all" ? "" : jt;
  const haveCat = (searchParams.get("category") || "").trim().toLowerCase();
  const haveQ = qFromSearchParams(searchParams);
  const haveJt = (searchParams.get("jobType") || "").trim().toLowerCase();
  return wantCat === haveCat && wantQ === haveQ && wantJt === haveJt;
}

/**
 * Keeps /jobs filters in the query string for shareable URLs (Next app only).
 *
 * `q` is pushed on debounce. It is **not** read back from the URL when only `q`
 * changes (avoids clobbering in-progress typing while the address bar lags).
 * Full `q` sync happens on first hydration, when **category or jobType** in the
 * URL changes, or on **popstate** (browser back/forward).
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

  useLayoutEffect(() => {
    const lane = normalizeLaneFromParams(searchParams.get("category") || "all", lanes);
    const jt = normalizeJobTypeFromParams(searchParams.get("jobType"));
    const qUrl = qFromSearchParams(searchParams);
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
  }, [searchParams, lanes]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    if (queryTripleMatchesUrl(laneFilter, debouncedSearch, jobTypeFilter, searchParams)) return;
    router.replace(`${pathname}${serializeToQuery(laneFilter, debouncedSearch, jobTypeFilter)}`, { scroll: false });
  }, [debouncedSearch, laneFilter, jobTypeFilter, pathname, router, searchParams]);

  useEffect(() => {
    const syncFromWindow = () => {
      const sp = new URLSearchParams(window.location.search);
      const lane = normalizeLaneFromParams(sp.get("category") || "all", lanes);
      const jt = normalizeJobTypeFromParams(sp.get("jobType"));
      const qUrl = (sp.get("q") || "").slice(0, 200);
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
    router.replace(`${pathname}${serializeToQuery(lane, debouncedSearch, jobTypeFilter)}`, { scroll: false });
  };

  const onJobTypeChange = (jt: "all" | JobType) => {
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
