"use client";

import { useEffect, useState } from "react";

export type CatalogCategoryRow = {
  slug: string;
  label: string;
  sortOrder?: number;
};

/**
 * Hydrates MVP talent lanes for filters and vacancy forms (`GET /api/categories`).
 */
export function useTalentCategories() {
  const [categories, setCategories] = useState<CatalogCategoryRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/categories", { cache: "no-store" })
      .then((r) => r.json())
      .then((body: { categories?: CatalogCategoryRow[] }) => {
        if (!cancelled) {
          setCategories(body.categories ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return categories;
}
