/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Briefcase, Clock, Code, MapPin, ChevronRight } from "lucide-react";
import type { Application } from "../lib/domainTypes";
import { applicationStatusLabel, APPLICATION_STATUS_HINTS } from "../lib/applicationStatus";
import { jobTypeLabel } from "../shared/jobTypes";

function formatAppliedDate(appliedAt: unknown): string {
  if (!appliedAt) return "—";
  if (typeof appliedAt === "string") {
    return new Date(appliedAt).toLocaleDateString();
  }
  const sec = appliedAt as { seconds?: number };
  if (typeof sec.seconds === "number") {
    return new Date(sec.seconds * 1000).toLocaleDateString();
  }
  return "—";
}

function formatStatusUpdated(appliedAt: unknown, statusUpdatedAt?: string): string | null {
  if (!statusUpdatedAt || typeof statusUpdatedAt !== "string") return null;
  const applied = typeof appliedAt === "string" ? appliedAt.slice(0, 19) : "";
  if (applied && statusUpdatedAt.slice(0, 19) === applied) return null;
  const d = new Date(statusUpdatedAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusClass(status: Application["status"]): string {
  if (status === "applied") return "bg-blue-100 text-blue-600";
  if (status === "viewed") return "bg-amber-100 text-amber-700";
  if (status === "interviewing") return "bg-violet-100 text-violet-700";
  if (status === "rejected") return "bg-red-100 text-red-600";
  if (status === "hired") return "bg-emerald-200 text-emerald-800";
  return "bg-neutral-100 text-neutral-600";
}

export type MyApplicationsBoardProps = {
  applications: Application[];
  loading?: boolean;
  loadFailed?: boolean;
  onRetry?: () => void;
};

export default function MyApplicationsBoard({ applications, loading, loadFailed, onRetry }: MyApplicationsBoardProps) {
  if (loading) {
    return (
      <motion.div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden p-8 animate-pulse" data-testid="my-applications-loading">
        <motion.div className="h-10 bg-neutral-100 rounded-xl w-1/2 mb-6" />
        <motion.div className="space-y-4">
          <motion.div className="h-20 bg-neutral-100 rounded-2xl" />
          <motion.div className="h-20 bg-neutral-100 rounded-2xl" />
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden" data-testid="my-applications-list">
      {loadFailed ? (
        <motion.div
          className="m-6 p-4 rounded-2xl border border-amber-200 bg-amber-50 text-sm text-amber-950"
          data-testid="my-applications-load-error"
        >
          <p className="font-semibold mb-2">Could not load your applications.</p>
          <p className="text-amber-900/80 mb-3">Your apply may still have been saved. Refresh or retry in a moment.</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 rounded-xl bg-amber-700 text-white text-sm font-bold hover:bg-amber-800"
            >
              Retry
            </button>
          ) : null}
        </motion.div>
      ) : null}
      {applications.length > 0 ? (
        <motion.div className="divide-y divide-neutral-50">
          {applications.map((app) => {
            const jobHref = app.vacancyId ? `/jobs/${encodeURIComponent(app.vacancyId)}` : "/jobs";
            const letter = app.vacancy?.companyName?.charAt(0) ?? "?";
            return (
              <a key={app.id ?? app.vacancyId} href={jobHref} className="block group" data-testid={`my-application-row-${app.vacancyId}`}>
                <motion.div
                  className="p-6 hover:bg-neutral-50/50 transition-colors flex items-center gap-6"
                  whileHover={{ x: 2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  <motion.div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center font-black text-neutral-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
                    {letter}
                  </motion.div>
                  <motion.div className="flex-1 min-w-0">
                    <motion.div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-black text-neutral-900 truncate">{app.vacancy?.jobTitle ?? "Role"}</h4>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold tracking-tight shrink-0 ${statusClass(app.status)}`}
                        title={APPLICATION_STATUS_HINTS[app.status]}
                      >
                        {applicationStatusLabel(app.status)}
                      </span>
                    </motion.div>
                    <p className="text-xs text-neutral-500 mb-1">{APPLICATION_STATUS_HINTS[app.status]}</p>
                    <motion.div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 font-medium">
                      <span className="flex items-center gap-1 min-w-0">
                        <Code className="w-3 h-3 shrink-0" /> <span className="truncate">{app.vacancy?.companyName ?? "—"}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" /> {app.vacancy?.location ?? "—"}
                      </span>
                      {app.vacancy?.jobType ? (
                        <span className="text-neutral-600 font-semibold">{jobTypeLabel(app.vacancy.jobType)}</span>
                      ) : null}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 shrink-0" /> Applied {formatAppliedDate(app.appliedAt)}
                      </span>
                      {formatStatusUpdated(app.appliedAt, app.statusUpdatedAt) ? (
                        <span className="text-neutral-400" data-testid={`my-application-updated-${app.vacancyId}`}>
                          Updated {formatStatusUpdated(app.appliedAt, app.statusUpdatedAt)}
                        </span>
                      ) : null}
                    </motion.div>
                  </motion.div>
                  <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-neutral-900 transition-colors shrink-0" aria-hidden />
                </motion.div>
              </a>
            );
          })}
        </motion.div>
      ) : !loadFailed ? (
        <motion.div className="p-16 text-center" data-testid="my-applications-empty">
          <motion.div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Briefcase className="w-8 h-8 text-neutral-200" />
          </motion.div>
          <h4 className="text-lg font-black text-neutral-900 mb-2">No applications yet</h4>
          <p className="text-neutral-500 mb-6 max-w-sm mx-auto">Browse open roles and apply to see them listed here.</p>
          <a
            href="/jobs"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
            data-testid="my-applications-browse-jobs"
          >
            Find jobs
          </a>
        </motion.div>
      ) : null}
    </motion.div>
  );
}
