/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from "react";
import { BarChart3, Layers } from "lucide-react";

import {
  fetchAdminCategories,
  fetchPlatformSummary,
  patchAdminCategory,
  type AdminCategory,
  type PlatformSummary,
} from "../../lib/adminApi";

export default function AdminCockpitPanel() {
  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([fetchPlatformSummary(), fetchAdminCategories()]);
      setSummary(s);
      setCategories(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleActive = async (cat: AdminCategory) => {
    setMessage(null);
    const result = await patchAdminCategory(cat.slug, { isActive: !cat.isActive });
    if (!result.ok) {
      setMessage(result.error ?? "Could not update category.");
      return;
    }
    setMessage(`${cat.slug} ${result.category?.isActive ? "enabled" : "disabled"}.`);
    await load();
  };

  return (
    <section
      className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-8 mb-12"
      data-testid="platform-admin-cockpit"
    >
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-5 h-5 text-blue-600" />
        <div>
          <h3 className="font-black text-neutral-900">Platform admin</h3>
          <p className="text-sm text-neutral-500">Workflow counts and category lane governance.</p>
        </div>
      </div>
      {loading ? (
        <p className="text-sm text-neutral-500">Loading platform metrics…</p>
      ) : (
        <>
          {summary ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                ["Users", summary.users],
                ["Recruiters", summary.recruiters],
                ["Open jobs", summary.openVacancies],
                ["Applications", summary.applications],
                ["Candidates", summary.candidates],
                ["Notifications", summary.notifications],
                ["Screenings", summary.screeningInvitations],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-2xl bg-neutral-50 border border-neutral-100 p-4"
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{label}</p>
                  <p className="text-2xl font-black text-neutral-900 mt-1">{value}</p>
                </div>
              ))}
            </div>
          ) : null}

          <h4 className="text-sm font-black text-neutral-900 mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Category lanes
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-neutral-400 border-b border-neutral-100">
                  <th className="py-2 pr-4">Slug</th>
                  <th className="py-2 pr-4">Label</th>
                  <th className="py-2 pr-4">Open jobs</th>
                  <th className="py-2">Active</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.slug} className="border-b border-neutral-50">
                    <td className="py-3 pr-4 font-mono text-xs">{c.slug}</td>
                    <td className="py-3 pr-4 font-semibold">{c.label}</td>
                    <td className="py-3 pr-4">{c.openVacancyCount}</td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => void toggleActive(c)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold ${
                          c.isActive
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-neutral-100 text-neutral-500"
                        }`}
                        data-testid={`admin-category-toggle-${c.slug}`}
                      >
                        {c.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {message ? <p className="text-sm text-neutral-600 mt-4">{message}</p> : null}
    </section>
  );
}
