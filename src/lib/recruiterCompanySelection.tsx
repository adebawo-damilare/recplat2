"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { fetchMyCompanies, type CompanySummary } from "./companiesApi";

const STORAGE_KEY = "talentbridge.activeCompanyId";

type RecruiterCompanySelectionContextValue = {
  companies: CompanySummary[];
  loading: boolean;
  activeCompanyId: string;
  activeCompany: CompanySummary | null;
  setActiveCompanyId: (id: string) => void;
  refreshCompanies: () => Promise<void>;
};

const RecruiterCompanySelectionContext = createContext<RecruiterCompanySelectionContextValue | null>(
  null,
);

export function RecruiterCompanySelectionProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCompanyId, setActiveCompanyIdState] = useState("");

  const refreshCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchMyCompanies();
      setCompanies(list);
      setActiveCompanyIdState((prev) => {
        const stored =
          typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY)?.trim() : "";
        if (stored && list.some((c) => c.id === stored)) return stored;
        if (prev && list.some((c) => c.id === prev)) return prev;
        return list[0]?.id ?? "";
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCompanies();
  }, [refreshCompanies]);

  const setActiveCompanyId = useCallback((id: string) => {
    setActiveCompanyIdState(id);
    if (typeof window !== "undefined") {
      if (id) window.localStorage.setItem(STORAGE_KEY, id);
      else window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const activeCompany = useMemo(
    () => companies.find((c) => c.id === activeCompanyId) ?? null,
    [companies, activeCompanyId],
  );

  const value = useMemo(
    () => ({
      companies,
      loading,
      activeCompanyId,
      activeCompany,
      setActiveCompanyId,
      refreshCompanies,
    }),
    [companies, loading, activeCompanyId, activeCompany, setActiveCompanyId, refreshCompanies],
  );

  return (
    <RecruiterCompanySelectionContext.Provider value={value}>
      {children}
    </RecruiterCompanySelectionContext.Provider>
  );
}

export function useRecruiterCompanySelection(): RecruiterCompanySelectionContextValue {
  const ctx = useContext(RecruiterCompanySelectionContext);
  if (!ctx) {
    throw new Error("useRecruiterCompanySelection must be used within RecruiterCompanySelectionProvider");
  }
  return ctx;
}
