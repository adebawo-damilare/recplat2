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

/** Query string for shareable lane + arrangement filters (search stays client-only). */
function buildJobsQueryString(lane: string, jt: "all" | JobType): string {
  const p = new URLSearchParams();
  if (lane !== "all") p.set("category", lane);
  if (jt !== "all") p.set("jobType", jt);
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** Keeps /jobs lane + job type in the query string for shareable URLs (Next app only). */
export function useJobBoardQuerySync(lanes: { slug: string }[]): JobBoardSyncedQuery {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [laneFilter, setLaneFilter] = useState("all");
  const [jobTypeFilter, setJobTypeFilter] = useState<"all" | JobType>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const syncedKey = useRef<string>("");

  useLayoutEffect(() => {
    const lane = normalizeLaneFromParams(searchParams.get("category") || "all", lanes);
    const jt = normalizeJobTypeFromParams(searchParams.get("jobType"));
    const key = `${lane}|${jt}`;
    if (key === syncedKey.current) return;
    syncedKey.current = key;
    setLaneFilter(lane);
    setJobTypeFilter(jt);
  }, [searchParams, lanes]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const onLaneChange = (lane: string) => {
    router.replace(`${pathname}${buildJobsQueryString(lane, jobTypeFilter)}`, { scroll: false });
  };

  const onJobTypeChange = (jt: "all" | JobType) => {
    router.replace(`${pathname}${buildJobsQueryString(laneFilter, jt)}`, { scroll: false });
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
