"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { TalentBoardSyncedQuery } from "../../src/components/talent/talentBoardSyncedQueryTypes";

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

function serializeToQuery(q: string, pageIndex: number): string {
  const p = new URLSearchParams();
  const qt = q.trim().slice(0, 200);
  if (qt) p.set("q", qt);
  const page = pageParamFromIndex(pageIndex);
  if (page) p.set("page", page);
  const s = p.toString();
  return s ? `?${s}` : "";
}

function locationMatchesState(pathname: string, q: string, pageIndex: number): boolean {
  if (typeof window === "undefined") return true;
  const desired = `${pathname}${serializeToQuery(q, pageIndex)}`;
  const current = `${pathname}${window.location.search}`;
  return desired === current;
}

/**
 * Keeps /talent search and pagination in the query string for shareable URLs (Next app only).
 *
 * URL writes happen in one `useEffect` only. Compare against `window.location` to avoid replace loops.
 * `page` is 1-based in the URL (`?page=2` = second page). Search changes reset to page 1.
 */
export function useTalentBoardQuerySync(): TalentBoardSyncedQuery {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [searchTerm, setSearchTerm] = useState(() => qFromSearchParams(searchParams));
  const [debouncedSearch, setDebouncedSearch] = useState(() => qFromSearchParams(searchParams));
  const [pageIndex, setPageIndex] = useState(() => pageIndexFromSearchParams(searchParams));

  const hydrated = useRef(false);
  const prevDebouncedSearch = useRef<string | null>(null);
  const routerRef = useRef(router);
  routerRef.current = router;
  const urlSyncReady = useRef(false);

  useLayoutEffect(() => {
    const spSource =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : searchParams;
    const qUrl = qFromSearchParams(spSource);
    const pageFromUrl = pageIndexFromSearchParams(spSource);

    setPageIndex((cur) => (cur === pageFromUrl ? cur : pageFromUrl));

    if (!hydrated.current) {
      hydrated.current = true;
      prevDebouncedSearch.current = qUrl.trim();
      setSearchTerm(qUrl);
      setDebouncedSearch(qUrl.trim());
      urlSyncReady.current = true;
    }
  }, [searchParams.toString()]);

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
    if (locationMatchesState(pathname, debouncedSearch, pageIndex)) return;
    routerRef.current.replace(`${pathname}${serializeToQuery(debouncedSearch, pageIndex)}`, {
      scroll: false,
    });
  }, [debouncedSearch, pageIndex, pathname]);

  useEffect(() => {
    const syncFromWindow = () => {
      const sp = new URLSearchParams(window.location.search);
      const qUrl = qFromSearchParams(sp);
      setSearchTerm(qUrl);
      setDebouncedSearch(qUrl.trim());
      setPageIndex(pageIndexFromSearchParams(sp));
    };
    window.addEventListener("popstate", syncFromWindow);
    return () => window.removeEventListener("popstate", syncFromWindow);
  }, []);

  const onPageChange = (nextIndex: number) => {
    setPageIndex(Math.max(0, Math.floor(nextIndex)));
  };

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearch,
    pageIndex,
    onPageChange,
  };
}
