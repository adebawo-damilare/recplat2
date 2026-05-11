/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useLayoutEffect, useState } from "react";
import { motion } from "motion/react";
import { Search, MapPin, Briefcase, DollarSign, ChevronRight, ChevronLeft, X } from "lucide-react";
import type { Vacancy } from "../lib/domainTypes";
import { refreshTalentBridgeSession } from "../lib/authBrowser";
import { fetchPublicJobsPage, applyToVacancyWithFallback } from "../lib/jobsApi";
import { useTalentCategories } from "./jobs/useTalentCategories";

const PAGE_SIZE = 10;

export default function JobBoard() {
  const lanes = useTalentCategories();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [laneFilter, setLaneFilter] = useState<string>("all");
  const [selectedJob, setSelectedJob] = useState<Vacancy | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageEntryCursors, setPageEntryCursors] = useState<(string | null)[]>([null]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useLayoutEffect(() => {
    setPageIndex(0);
    setPageEntryCursors([null]);
    setNextCursor(null);
  }, [laneFilter, debouncedSearch]);

  // pageEntryCursors is read inside but omitted from deps: extending the cursor chain after a fetch must not re-trigger load.
  useEffect(() => {
    let cancelled = false;
    const cursor = pageEntryCursors[pageIndex] ?? null;
    const lane = laneFilter === "all" ? null : laneFilter;
    setLoading(true);
    void fetchPublicJobsPage(PAGE_SIZE, cursor, lane, debouncedSearch || null)
      .then(({ jobs, nextCursor: n }) => {
        if (cancelled) return;
        setVacancies(jobs);
        setNextCursor(n);
        setPageEntryCursors((prev) => {
          if (n && prev.length === pageIndex + 1) return [...prev, n];
          return prev;
        });
      })
      .catch((error) => {
        if (!cancelled) console.error("Failed to fetch jobs", error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pageIndex, laneFilter, debouncedSearch]);

  useEffect(() => {
    setSelectedJob(null);
  }, [pageIndex, debouncedSearch, laneFilter]);

  const handleApply = async () => {
    const u = await refreshTalentBridgeSession();
    if (!u) {
      alert("Please sign in to apply for jobs.");
      return;
    }
    if (!selectedJob?.id) return;

    setApplying(true);
    try {
      const ok = await applyToVacancyWithFallback(selectedJob.id);
      if (ok) {
        setAppliedJobs((prev) => new Set(prev).add(selectedJob.id!));
        alert("Application sent successfully!");
      }
    } catch (error) {
      console.error("Failed to apply", error);
    } finally {
      setApplying(false);
    }
  };

  const canGoPrev = pageIndex > 0 && !loading;
  const canGoNext = Boolean(nextCursor) && !loading;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="job-board">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Discover Your Next Role</h1>
        <p className="text-neutral-600 text-lg">Browse through active opportunities from innovative companies.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by job title, company, or keywords..."
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter by talent lane"
          className="px-6 py-4 bg-white border border-neutral-200 rounded-2xl font-bold text-neutral-800 hover:bg-neutral-50 transition-colors cursor-pointer min-w-[200px]"
          value={laneFilter}
          onChange={(e) => setLaneFilter(e.target.value)}
        >
          <option value="all">All talent lanes</option>
          {lanes.map((lane) => (
            <option key={lane.slug} value={lane.slug}>
              {lane.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-neutral-100 h-32 animate-pulse"></div>
            ))
          ) : vacancies.length > 0 ? (
            vacancies.map((job, idx) => (
              <motion.div
                key={job.id || `job-${idx}`}
                whileHover={{ scale: 1.01 }}
                onClick={() => setSelectedJob(job)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  selectedJob?.id === (job.id || `job-${idx}`)
                    ? "bg-blue-50 border-blue-200 shadow-md ring-1 ring-blue-100"
                    : "bg-white border-neutral-100 hover:border-neutral-200 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center font-bold text-neutral-400">
                    {job.companyName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold truncate max-w-[150px]">{job.jobTitle}</h3>
                    <p className="text-xs text-neutral-500">{job.companyName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex-wrap">
                  {job.category?.label ? (
                    <span className="rounded-md bg-neutral-900/5 px-2 py-0.5 text-neutral-600">{job.category.label}</span>
                  ) : null}
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {job.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> {job.salary}
                  </span>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 px-6 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
              <p className="text-neutral-500 text-sm font-medium">No vacancies match your filters.</p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
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
        </div>

        <div className="lg:col-span-2">
          {selectedJob ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm sticky top-24"
            >
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center text-2xl font-bold text-neutral-300">
                    {selectedJob.companyName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{selectedJob.jobTitle}</h2>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500 font-medium">
                      {selectedJob.category?.label ? (
                        <span className="text-xs font-semibold uppercase tracking-wide text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                          {selectedJob.category.label}
                        </span>
                      ) : null}
                      <span className="flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-blue-600" /> {selectedJob.companyName}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-blue-600" /> {selectedJob.location}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  className="lg:hidden p-2 hover:bg-neutral-100 rounded-full"
                >
                  <X className="w-5 h-5 text-neutral-400" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Compensation</span>
                  <span className="text-lg font-bold text-blue-600">{selectedJob.salary}</span>
                </div>
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Work Type</span>
                  <span className="text-lg font-bold text-neutral-900">Full-time</span>
                </div>
              </div>

              <div className="space-y-8">
                <section>
                  <h4 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
                    <span className="w-8 h-[1px] bg-neutral-200"></span> About the Role
                  </h4>
                  <div className="text-neutral-700 leading-relaxed whitespace-pre-wrap">{selectedJob.description}</div>
                </section>

                <section>
                  <h4 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
                    <span className="w-8 h-[1px] bg-neutral-200"></span> Requirements
                  </h4>
                  <div className="text-neutral-700 leading-relaxed whitespace-pre-wrap">{selectedJob.requirements}</div>
                </section>
              </div>

              <div className="mt-12 flex gap-4">
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={applying || (selectedJob.id ? appliedJobs.has(selectedJob.id) : false)}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:bg-emerald-500"
                >
                  {applying ? "Sending..." : selectedJob.id && appliedJobs.has(selectedJob.id) ? "Application Sent" : "Apply Now"}
                  {!appliedJobs.has(selectedJob.id || "") && (
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  )}
                </button>
                <button
                  type="button"
                  className="px-6 py-4 bg-white border border-neutral-200 rounded-2xl hover:bg-neutral-50 transition-colors font-bold"
                >
                  Save
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-neutral-50 rounded-3xl border-2 border-dashed border-neutral-200 p-8 text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-neutral-100">
                <Briefcase className="w-8 h-8 text-blue-200" />
              </div>
              <h3 className="text-xl font-bold mb-2">Select a job to view details</h3>
              <p className="text-neutral-500 max-w-sm">
                Detailed descriptions, requirements, and application links will appear here once you select an opportunity.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
