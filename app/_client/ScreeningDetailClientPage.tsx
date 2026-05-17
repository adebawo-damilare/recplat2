"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { useTalentBridgeUser } from "../../src/lib/useTalentBridgeUser";
import {
  fetchScreeningDetail,
  submitScreening,
  type ScreeningInvitationDetail,
} from "../../src/lib/screeningsApi";
import { screeningInvitationStatusLabel } from "../../src/shared/screeningPilot";
import { talentBridgeUiNotify } from "../../src/lib/talentBridgeUiNotify";

type ScreeningDetailClientPageProps = {
  invitationId: string;
};

export default function ScreeningDetailClientPage({ invitationId }: ScreeningDetailClientPageProps) {
  const router = useRouter();
  const { user, loading } = useTalentBridgeUser();
  const [detail, setDetail] = useState<ScreeningInvitationDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/sign-in");
    if (!loading && user && user.role !== "candidate") router.replace("/dashboard/company");
  }, [loading, user, router]);

  const load = useCallback(async () => {
    setPageLoading(true);
    try {
      const inv = await fetchScreeningDetail(invitationId);
      setDetail(inv);
      if (inv?.status === "pending") {
        const initial: Record<string, string> = {};
        for (const q of inv.questions) initial[q.id] = "";
        setAnswers(initial);
      }
    } finally {
      setPageLoading(false);
    }
  }, [invitationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async () => {
    if (!detail || detail.status !== "pending") return;
    setSubmitting(true);
    try {
      const payload = detail.questions.map((q) => ({
        questionId: q.id,
        answerText: answers[q.id] ?? "",
      }));
      const result = await submitScreening(invitationId, payload);
      if (!result.ok) {
        talentBridgeUiNotify(result.error || "Could not submit screening.");
        return;
      }
      talentBridgeUiNotify("Screening submitted. Thank you!");
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user || user.role !== "candidate") {
    return (
      <div className="pt-24 min-h-screen bg-neutral-50/50 animate-pulse">
        <motion.div className="max-w-2xl mx-auto px-4 h-64 bg-neutral-200 rounded-3xl mt-12" />
      </div>
    );
  }

  if (!pageLoading && !detail) {
    return (
      <div className="pt-24 min-h-screen bg-neutral-50/50 px-4 py-12 text-center">
        <p className="font-bold text-neutral-900">Screening not found.</p>
        <Link href="/dashboard/screenings" className="text-blue-600 font-bold text-sm mt-4 inline-block">
          Back to screenings
        </Link>
      </div>
    );
  }

  const readOnly = detail?.status === "submitted";

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

        {pageLoading || !detail ? (
          <div className="h-64 bg-white rounded-3xl border border-neutral-100 animate-pulse" />
        ) : (
          <>
            <header className="mb-8">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">Marketers screening</p>
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
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
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
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="mt-8 w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
                data-testid="screening-submit"
              >
                <Send className="w-4 h-4" />
                {submitting ? "Submitting…" : "Submit screening"}
              </button>
            ) : null}
          </>
        )}
      </motion.div>
    </div>
  );
}
