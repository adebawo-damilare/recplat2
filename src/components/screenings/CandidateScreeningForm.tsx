"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import type { ScreeningInvitationDetail } from "../../lib/screeningsApi";
import { screeningInvitationStatusLabel, screeningLaneLabel } from "../../shared/screeningPilot";

type CandidateScreeningFormProps = {
  detail: ScreeningInvitationDetail;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  submitting: boolean;
  onSubmit: () => void;
};

export default function CandidateScreeningForm({
  detail,
  answers,
  onAnswerChange,
  submitting,
  onSubmit,
}: CandidateScreeningFormProps) {
  const readOnly = detail.status === "submitted";

  return (
    <div className="pt-24 min-h-screen bg-neutral-50/50" data-testid="screening-detail-page">
      <motion.div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/dashboard/screenings"
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 mb-8 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          All screenings
        </Link>

        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">
            {screeningLaneLabel(detail.vacancy.categorySlug)} screening
          </p>
          <h1 className="text-2xl font-black text-neutral-900">{detail.vacancy.jobTitle}</h1>
          <p className="text-neutral-500 font-medium mt-1">{detail.vacancy.companyName}</p>
          <p className="text-sm mt-3">
            Status:{" "}
            <span className="font-bold text-neutral-800">{screeningInvitationStatusLabel(detail.status)}</span>
          </p>
        </header>

        <div className="space-y-6">
          {readOnly
            ? detail.answers.map((a) => (
                <section
                  key={a.questionId}
                  className="bg-white rounded-2xl border border-neutral-100 p-5"
                  data-testid={`screening-answer-${a.questionId}`}
                >
                  <p className="text-sm font-bold text-neutral-800 mb-2">{a.prompt}</p>
                  <p className="text-sm text-neutral-700 whitespace-pre-wrap">{a.answerText}</p>
                </section>
              ))
            : detail.questions.map((q) => (
                <label
                  key={q.id}
                  className="block bg-white rounded-2xl border border-neutral-100 p-5"
                  data-testid={`screening-question-${q.id}`}
                >
                  <span className="text-sm font-bold text-neutral-800 mb-2 block">{q.prompt}</span>
                  <textarea
                    value={answers[q.id] ?? ""}
                    onChange={(e) => onAnswerChange(q.id, e.target.value)}
                    rows={4}
                    className="w-full mt-2 rounded-xl border border-neutral-200 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y min-h-[100px]"
                    placeholder="Your answer…"
                  />
                </label>
              ))}
        </div>

        {!readOnly ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="mt-8 w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
            data-testid="screening-submit"
          >
            <Send className="w-4 h-4" />
            {submitting ? "Submitting…" : "Submit screening"}
          </button>
        ) : null}
      </motion.div>
    </div>
  );
}
