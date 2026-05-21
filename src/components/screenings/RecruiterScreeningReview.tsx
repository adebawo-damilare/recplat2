"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, ClipboardList, Save, Star, User } from "lucide-react";
import {
  saveScreeningReview,
  type ScreeningInvitationDetail,
} from "../../lib/screeningsApi";
import { screeningInvitationStatusLabel, screeningLaneLabel } from "../../shared/screeningPilot";
import { talentBridgeUiNotify } from "../../lib/talentBridgeUiNotify";

const SCORE_VALUES = [1, 2, 3, 4, 5] as const;

type QuestionScoreDraft = {
  score: number | null;
  note: string;
};

type RecruiterScreeningReviewProps = {
  invitationId: string;
  detail: ScreeningInvitationDetail;
  onReload: () => Promise<void>;
};

function buildDraftFromDetail(detail: ScreeningInvitationDetail): Record<string, QuestionScoreDraft> {
  const draft: Record<string, QuestionScoreDraft> = {};
  const byQuestion = new Map(
    (detail.review?.questionScores ?? []).map((s) => [s.questionId, s]),
  );
  for (const a of detail.answers) {
    const saved = byQuestion.get(a.questionId);
    draft[a.questionId] = {
      score: saved?.score ?? null,
      note: saved?.note ?? "",
    };
  }
  return draft;
}

function computeOverallPreview(scores: (number | null)[]): number | null {
  const valid = scores.filter((s): s is number => s != null && s >= 1 && s <= 5);
  if (valid.length === 0) return null;
  return Math.min(5, Math.max(1, Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)));
}

export default function RecruiterScreeningReview({
  invitationId,
  detail,
  onReload,
}: RecruiterScreeningReviewProps) {
  const candidateName = detail.candidate?.name?.trim() || "Candidate";
  const candidateEmail = detail.candidate?.email?.trim() || "";
  const submitted = detail.status === "submitted";
  const canScore = submitted && detail.answers.length > 0;

  const [reviewerNote, setReviewerNote] = useState(detail.review?.reviewerNote ?? "");
  const [questionDraft, setQuestionDraft] = useState<Record<string, QuestionScoreDraft>>(() =>
    buildDraftFromDetail(detail),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setReviewerNote(detail.review?.reviewerNote ?? "");
    setQuestionDraft(buildDraftFromDetail(detail));
  }, [detail.id, detail.review?.updatedAt, detail.answers.length]);

  const overallPreview = useMemo(
    () => computeOverallPreview(detail.answers.map((a) => questionDraft[a.questionId]?.score ?? null)),
    [detail.answers, questionDraft],
  );

  const allScored = useMemo(
    () =>
      detail.answers.every((a) => {
        const s = questionDraft[a.questionId]?.score;
        return s != null && s >= 1 && s <= 5;
      }),
    [detail.answers, questionDraft],
  );

  const handleSave = useCallback(async () => {
    if (!canScore || !allScored) {
      talentBridgeUiNotify("Score every question from 1 to 5 before saving.", "warning");
      return;
    }
    setSaving(true);
    try {
      const result = await saveScreeningReview(invitationId, {
        questionScores: detail.answers.map((a) => ({
          questionId: a.questionId,
          score: questionDraft[a.questionId]!.score!,
          note: questionDraft[a.questionId]!.note.trim() || null,
        })),
        reviewerNote: reviewerNote.trim() || null,
      });
      if (!result.ok) {
        talentBridgeUiNotify(result.error || "Could not save screening scores.", "error");
        return;
      }
      talentBridgeUiNotify("Screening scores saved.", "success");
      await onReload();
    } finally {
      setSaving(false);
    }
  }, [allScored, canScore, detail.answers, invitationId, onReload, questionDraft, reviewerNote]);

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

          {(detail.review?.overallScore ?? overallPreview) != null ? (
            <p
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-900 border border-amber-100"
              data-testid="recruiter-screening-overall-score"
            >
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" aria-hidden />
              Overall {detail.review?.overallScore ?? overallPreview} / 5
              {detail.review ? (
                <span className="font-medium text-amber-800/80">· saved</span>
              ) : (
                <span className="font-medium text-amber-800/80">· preview</span>
              )}
            </p>
          ) : null}

          <Link
            href={`/dashboard/company?application=${encodeURIComponent(detail.applicationId)}`}
            className="inline-flex items-center gap-2 mt-4 text-xs font-bold text-violet-700 hover:underline"
            data-testid="recruiter-screening-open-pipeline"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Open applicant in pipeline
          </Link>
        </header>

        {canScore ? (
          <>
            <div className="space-y-6">
              {detail.answers.map((a, index) => {
                const draft = questionDraft[a.questionId] ?? { score: null, note: "" };
                return (
                  <section
                    key={a.questionId}
                    className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-sm"
                    data-testid={`recruiter-screening-answer-${a.questionId}`}
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">
                      Question {index + 1}
                    </p>
                    <p className="text-sm font-bold text-neutral-800 mb-3">{a.prompt}</p>
                    <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed mb-5">
                      {a.answerText}
                    </p>

                    <div className="border-t border-neutral-100 pt-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">
                        Your score (1–5)
                      </p>
                      <div
                        className="flex flex-wrap gap-2"
                        role="group"
                        aria-label={`Score for question ${index + 1}`}
                      >
                        {SCORE_VALUES.map((value) => {
                          const selected = draft.score === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                setQuestionDraft((prev) => ({
                                  ...prev,
                                  [a.questionId]: { ...draft, score: value },
                                }))
                              }
                              className={`min-w-[2.5rem] px-3 py-2 rounded-xl text-sm font-black border transition-colors ${
                                selected
                                  ? "bg-neutral-900 text-white border-neutral-900"
                                  : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                              }`}
                              data-testid={`recruiter-screening-score-${a.questionId}-${value}`}
                            >
                              {value}
                            </button>
                          );
                        })}
                      </div>
                      <label className="block mt-4">
                        <span className="text-xs font-semibold text-neutral-500">Note (optional)</span>
                        <textarea
                          value={draft.note}
                          onChange={(e) =>
                            setQuestionDraft((prev) => ({
                              ...prev,
                              [a.questionId]: { ...draft, note: e.target.value },
                            }))
                          }
                          rows={2}
                          maxLength={500}
                          placeholder="Brief feedback on this answer…"
                          className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm resize-y"
                          data-testid={`recruiter-screening-score-note-${a.questionId}`}
                        />
                      </label>
                    </div>
                  </section>
                );
              })}
            </div>

            <section className="mt-8 bg-white rounded-2xl border border-neutral-100 p-5 shadow-sm">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                  Overall reviewer note (optional)
                </span>
                <textarea
                  value={reviewerNote}
                  onChange={(e) => setReviewerNote(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Summary for your team…"
                  className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm resize-y"
                  data-testid="recruiter-screening-reviewer-note"
                />
              </label>
              <button
                type="button"
                disabled={saving || !allScored}
                onClick={() => void handleSave()}
                className="mt-5 w-full py-4 bg-neutral-900 text-white rounded-2xl font-black text-sm hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="recruiter-screening-save-scores"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving…" : detail.review ? "Update scores" : "Save scores"}
              </button>
              {!allScored ? (
                <p className="text-center text-xs text-neutral-500 mt-2">Select a score for each question to save.</p>
              ) : null}
            </section>
          </>
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
              Scoring is available after the candidate submits all responses.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
