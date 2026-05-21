"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, MapPin, ArrowLeft, ChevronRight } from "lucide-react";
import type { Vacancy } from "../../src/lib/domainTypes";
import { refreshTalentBridgeSession } from "../../src/lib/authBrowser";
import { applyToVacancyWithFallback } from "../../src/lib/jobsApi";
import { talentBridgeUiNotify } from "../../src/lib/talentBridgeUiNotify";
import { jobTypeLabel } from "../../src/shared/jobTypes";
import ApplicationSentBanner from "../../src/components/jobs/ApplicationSentBanner";

export default function JobDetailClientPage({ job }: { job: Vacancy }) {
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleApply = async () => {
    const u = await refreshTalentBridgeSession();
    if (!u) {
      talentBridgeUiNotify("Please sign in to apply for jobs.", "info");
      return;
    }
    if (u.role !== "candidate") {
      talentBridgeUiNotify("Only candidate accounts can apply. Use a candidate account or register as a candidate.", "warning");
      return;
    }
    if (!job.id) return;
    setApplying(true);
    try {
      const result = await applyToVacancyWithFallback(job.id);
      if (result === "created" || result === "already_applied") {
        setApplied(true);
      }
      if (result === "created") {
        talentBridgeUiNotify("Application sent successfully!", "success");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="pt-24 min-h-screen bg-neutral-50/50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="job-detail-page">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 mb-8 hover:underline"
          data-testid="job-detail-back"
        >
          <ArrowLeft className="w-4 h-4" /> Back to jobs
        </Link>

        <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm">
          <div className="flex items-start gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center text-2xl font-bold text-neutral-300 shrink-0">
            {job.companyName.charAt(0)}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-1">{job.jobTitle}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500 font-medium">
              {job.category?.label ? (
                <span className="text-xs font-semibold uppercase tracking-wide text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                  {job.category.label}
                </span>
              ) : null}
              <span className="flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-blue-600 shrink-0" /> {job.companyName}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0" /> {job.location}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
              Compensation
            </span>
            <span className="text-lg font-bold text-blue-600">{job.salary}</span>
          </div>
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
              Work type
            </span>
            <span className="text-lg font-bold text-neutral-900">{jobTypeLabel(job.jobType)}</span>
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-3">About the role</h2>
          <div className="text-neutral-700 leading-relaxed whitespace-pre-wrap">{job.description}</div>
        </section>

        <section className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-3">Requirements</h2>
          <div className="text-neutral-700 leading-relaxed whitespace-pre-wrap">{job.requirements}</div>
        </section>

        {applied ? <ApplicationSentBanner className="mb-6" /> : null}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => void handleApply()}
            disabled={applying || applied || !job.id}
            data-testid="job-detail-apply"
            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-emerald-600"
          >
            {applying ? "Sending…" : applied ? "Application sent" : "Apply now"}
            {!applied && <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
