"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, ClipboardList, User } from "lucide-react";
import type { ScreeningInvitationDetail } from "../../lib/screeningsApi";
import { screeningInvitationStatusLabel, screeningLaneLabel } from "../../shared/screeningPilot";

type RecruiterScreeningReviewProps = {
  detail: ScreeningInvitationDetail;
};

export default function RecruiterScreeningReview({ detail }: RecruiterScreeningReviewProps) {
  const candidateName = detail.candidate?.name?.trim() || "Candidate";
  const candidateEmail = detail.candidate?.email?.trim() || "";
  const submitted = detail.status === "submitted";

  return (
    <div className="pt-24 min-h-screen bg-neutral-50/50" data-testid="recruiter-screening-review">
      <motion.div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/dashboard/company"
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 mb-8 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Company dashboard
        </Link>

        <header className="mb-8 bg-white rounded-3xl border border-neutral-100 p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-2">Review responses</p>
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">
            {screeningLaneLabel(detail.vacancy.categorySlug)} screening
          </p>
          <h1 className="text-2xl font-black text-neutral-900">{detail.vacancy.jobTitle}</h1>
          <p className="text-neutral-500 font-medium mt-1">{detail.vacancy.companyName}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2 font-semibold text-neutral-800">
              <User className="w-4 h-4 text-neutral-400" aria-hidden />
              {candidateName}
            </span>
            {candidateEmail ? (
              <span className="text-neutral-500 truncate max-w-full">{candidateEmail}</span>
            ) : null}
          </div>

          <p className="text-sm mt-3">
            Status:{" "}
            <span className="font-bold text-neutral-800">{screeningInvitationStatusLabel(detail.status)}</span>
            {detail.submittedAt ? (
              <span className="text-neutral-500 font-medium">
                {" "}
                · Submitted {new Date(detail.submittedAt).toLocaleString()}
              </span>
            ) : null}
          </p>

          <Link
            href={`/dashboard/company?application=${encodeURIComponent(detail.applicationId)}`}
            className="inline-flex items-center gap-2 mt-4 text-xs font-bold text-violet-700 hover:underline"
            data-testid="recruiter-screening-open-pipeline"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Open applicant in pipeline
          </Link>
        </header>

        {submitted && detail.answers.length > 0 ? (
          <div className="space-y-6">
            {detail.answers.map((a, index) => (
              <section
                key={a.questionId}
                className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-sm"
                data-testid={`recruiter-screening-answer-${a.questionId}`}
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">
                  Question {index + 1}
                </p>
                <p className="text-sm font-bold text-neutral-800 mb-3">{a.prompt}</p>
                <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">{a.answerText}</p>
              </section>
            ))}
          </div>
        ) : (
          <div
            className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-6 py-10 text-center"
            data-testid="recruiter-screening-awaiting"
          >
            <p className="text-sm font-semibold text-neutral-700">
              {submitted
                ? "This screening is marked submitted but has no saved answers yet."
                : "The candidate has not submitted their screening yet."}
            </p>
            <p className="text-sm text-neutral-500 mt-2">
              You can send a reminder from Screening follow-up on your company dashboard.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
