import type { JobType } from "../../shared/jobTypes";

/** Optional filters + pagination driven by Next `/jobs` query string (see `app/_client/useJobBoardQuerySync.ts`). */
export type JobBoardSyncedQuery = {
  laneFilter: string;
  jobTypeFilter: "all" | JobType;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  debouncedSearch: string;
  /** 0-based page index (URL uses 1-based `?page=`). */
  pageIndex: number;
  onPageChange: (pageIndex: number) => void;
  onLaneChange: (lane: string) => void;
  onJobTypeChange: (jt: "all" | JobType) => void;
};
