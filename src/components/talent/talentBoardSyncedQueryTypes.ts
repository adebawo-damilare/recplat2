/** Optional search + pagination driven by Next `/talent` query string (see `app/_client/useTalentBoardQuerySync.ts`). */
export type TalentBoardSyncedQuery = {
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  debouncedSearch: string;
  /** 0-based page index (URL uses 1-based `?page=`). */
  pageIndex: number;
  onPageChange: (pageIndex: number) => void;
};
