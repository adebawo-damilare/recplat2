"use client";

import { Layers } from "lucide-react";
import { useTalentCategories } from "../jobs/useTalentCategories";

interface VacancyCategoryFieldProps {
  value: string;
  onChange: (slug: string) => void;
  allowClear?: boolean;
  inputId?: string;
}

/** Category lane selector wired to `/api/categories`. */
export function VacancyCategoryField({
  value,
  onChange,
  allowClear = true,
  inputId = "vacancy-category",
}: VacancyCategoryFieldProps) {
  const categories = useTalentCategories();

  return (
    <div className="space-y-2 md:col-span-2">
      <label htmlFor={inputId} className="text-sm font-bold flex items-center gap-2">
        <Layers className="w-4 h-4 text-blue-600" /> Talent lane
      </label>
      <select
        id={inputId}
        className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {allowClear ? <option value="">Uncategorized (optional)</option> : null}
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.label}
          </option>
        ))}
      </select>
      <p className="text-xs text-neutral-500">
        Narrow discovery by marketer / designer / sales lanes—expand templates later without changing UX.
      </p>
    </div>
  );
}
