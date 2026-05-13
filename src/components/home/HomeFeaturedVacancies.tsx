/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import type { Vacancy } from "../../lib/domainTypes";
import { AppView } from "../../appView";
import { jobTypeLabel } from "../../shared/jobTypes";

interface HomeFeaturedVacanciesProps {
  vacancies: Vacancy[];
  loading: boolean;
  onNavigate: (view: AppView) => void;
}

export default function HomeFeaturedVacancies({
  vacancies,
  loading,
  onNavigate,
}: HomeFeaturedVacanciesProps) {
  return (
    <section className="py-24 bg-neutral-50 overflow-hidden relative" data-testid="home-featured-jobs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Active Opportunities</h2>
            <p className="mt-2 text-neutral-600">Discover your next career move among top-tier organizations.</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate(AppView.FIND_JOBS)}
            className="text-sm font-bold text-blue-600 flex items-center gap-2 underline underline-offset-4 decoration-blue-200"
          >
            Explore all jobs
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm animate-pulse h-48" />
            ))
          ) : vacancies.length > 0 ? (
            vacancies.map((job, idx) => (
              <motion.div
                key={job.id || `vacancy-${idx}`}
                whileHover={{ y: -5 }}
                className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center font-bold text-neutral-400">
                    {job.companyName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{job.companyName}</div>
                    <div className="text-xs text-neutral-400">{job.location}</div>
                  </div>
                </div>
                <h4 className="text-lg font-bold mb-4">{job.jobTitle}</h4>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-2 py-1 bg-neutral-100 text-neutral-600 rounded text-[10px] font-bold uppercase">
                    {jobTypeLabel(job.jobType)}
                  </span>
                  {job.category?.label ? (
                    <span className="px-2 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded text-[10px] font-bold uppercase">
                      {job.category.label}
                    </span>
                  ) : null}
                  <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase">{job.salary}</span>
                </div>
                <button
                  type="button"
                  className="w-full py-2 border border-neutral-100 rounded-lg text-sm font-bold hover:bg-neutral-900 hover:text-white transition-colors"
                >
                  View Details
                </button>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-neutral-200">
              <p className="text-neutral-500 font-medium mb-6">No active vacancies at the moment.</p>
              <button
                type="button"
                onClick={() => onNavigate(AppView.FIND_JOBS)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                Browse all jobs
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
