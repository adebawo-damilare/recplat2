import type { JobType } from "../../shared/jobTypes";

/** Optional filters driven by Next `/jobs` query string (see `app/_client/useJobBoardQuerySync.ts`). */
export type JobBoardSyncedQuery = {
  laneFilter: string;
  jobTypeFilter: "all" | JobType;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  debouncedSearch: string;
  onLaneChange: (lane: string) => void;
  onJobTypeChange: (jt: "all" | JobType) => void;
};
