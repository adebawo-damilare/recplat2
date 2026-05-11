/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useLayoutEffect, useState } from "react";
import { motion } from "motion/react";
import { Search, User, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { CandidateProfile } from "../lib/domainTypes";
import { fetchCandidatesPage } from "../lib/candidatesApi";
import ProfileCard from "./ProfileCard";

const PAGE_SIZE = 10;

interface TalentBoardProps {
  onViewPortfolio: (candidate: CandidateProfile) => void;
}

export default function TalentBoard({ onViewPortfolio }: TalentBoardProps) {
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useLayoutEffect(() => {
    setPageIndex(0);
  }, [debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchCandidatesPage({
      limit: PAGE_SIZE,
      offset: pageIndex * PAGE_SIZE,
      q: debouncedSearch || undefined,
    })
      .then(({ candidates: rows, total: t }) => {
        if (!cancelled) {
          setCandidates(rows);
          setTotal(t);
        }
      })
      .catch((error) => {
        if (!cancelled) console.error("Failed to fetch candidates", error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pageIndex, debouncedSearch]);

  useEffect(() => {
    setSelectedCandidate(null);
  }, [pageIndex, debouncedSearch]);

  const start = total === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const end = pageIndex * PAGE_SIZE + candidates.length;
  const canGoPrev = pageIndex > 0 && !loading;
  const canGoNext = end < total && !loading;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="talent-board">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Find Elite Candidates</h1>
        <p className="text-neutral-600 text-lg">Connect with top professionals ready for their next challenge.</p>
      </div>

      <div className="max-w-3xl mb-10">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name, skills, or headline..."
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-neutral-100 h-32 animate-pulse"></div>
            ))
          ) : candidates.length > 0 ? (
            candidates.map((c) => (
              <motion.div
                key={c.userId}
                whileHover={{ scale: 1.01 }}
                onClick={() => setSelectedCandidate(c)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  selectedCandidate?.userId === c.userId
                    ? "bg-blue-50 border-blue-200 shadow-md ring-1 ring-blue-100"
                    : "bg-white border-neutral-100 hover:border-neutral-200 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center overflow-hidden">
                    <img
                      src={`https://picsum.photos/seed/${c.userId}/100/100`}
                      alt={c.fullName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold truncate">{c.fullName}</h3>
                    <p className="text-xs text-neutral-500 truncate">{c.headline}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1">
                  {c.skills.split(",").slice(0, 3).map((skill, sIdx) => {
                    const trimmed = skill.trim();
                    if (!trimmed) return null;
                    return (
                      <span
                        key={`${c.userId}-skill-${sIdx}`}
                        className="px-1.5 py-0.5 bg-neutral-100 text-neutral-500 rounded text-[10px] font-bold uppercase truncate"
                      >
                        {trimmed}
                      </span>
                    );
                  })}
                  {c.skills.split(",").length > 3 && (
                    <span className="text-[10px] text-neutral-400 font-bold">+{c.skills.split(",").length - 3}</span>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 px-6 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
              <p className="text-neutral-500 text-sm font-medium">No candidates found.</p>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={!canGoPrev}
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <span className="text-xs font-semibold text-neutral-500">Page {pageIndex + 1}</span>
              <button
                type="button"
                disabled={!canGoNext}
                onClick={() => setPageIndex((p) => p + 1)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:pointer-events-none"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {total > 0 && (
              <p className="text-center text-[11px] text-neutral-400 font-medium">
                Showing {start}–{end} of {total}
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedCandidate ? (
            <div className="relative">
              <ProfileCard candidate={selectedCandidate} onViewPortfolio={onViewPortfolio} />
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="absolute top-6 right-6 lg:hidden p-2 hover:bg-neutral-100 rounded-full z-10"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>
          ) : (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-neutral-50 rounded-3xl border-2 border-dashed border-neutral-200 p-8 text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-neutral-100">
                <User className="w-8 h-8 text-neutral-200" />
              </div>
              <h3 className="text-xl font-bold mb-2">Select a talent to view profile</h3>
              <p className="text-neutral-500 max-w-sm">
                Browse full resumes, portfolios, and contact information to find your ideal team member.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
