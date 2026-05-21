"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTalentBridgeUser } from "../../src/lib/useTalentBridgeUser";
import {
  fetchScreeningDetail,
  submitScreening,
  type ScreeningInvitationDetail,
} from "../../src/lib/screeningsApi";
import { talentBridgeUiNotify } from "../../src/lib/talentBridgeUiNotify";
import CandidateScreeningForm from "../../src/components/screenings/CandidateScreeningForm";
import RecruiterScreeningReview from "../../src/components/screenings/RecruiterScreeningReview";

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
  }, [loading, user, router]);

  const load = useCallback(async () => {
    if (!user) return;
    setPageLoading(true);
    try {
      const inv = await fetchScreeningDetail(invitationId);
      setDetail(inv);
      if (inv?.status === "pending" && user.role === "candidate") {
        const initial: Record<string, string> = {};
        for (const q of inv.questions) initial[q.id] = "";
        setAnswers(initial);
      }
    } finally {
      setPageLoading(false);
    }
  }, [invitationId, user]);

  useEffect(() => {
    if (!loading && user) void load();
  }, [load, loading, user]);

  const handleSubmit = async () => {
    if (!detail || detail.status !== "pending" || user?.role !== "candidate") return;
    setSubmitting(true);
    try {
      const payload = detail.questions.map((q) => ({
        questionId: q.id,
        answerText: answers[q.id] ?? "",
      }));
      const result = await submitScreening(invitationId, payload);
      if (!result.ok) {
        talentBridgeUiNotify(result.error || "Could not submit screening.", "error");
        return;
      }
      talentBridgeUiNotify("Screening submitted. Thank you!", "success");
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || pageLoading) {
    return (
      <div className="pt-24 min-h-screen bg-neutral-50/50 animate-pulse">
        <motion.div className="max-w-2xl mx-auto px-4 h-64 bg-neutral-200 rounded-3xl mt-12" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!detail) {
    const backHref = user.role === "recruiter" ? "/dashboard/company" : "/dashboard/screenings";
    const backLabel = user.role === "recruiter" ? "Company dashboard" : "All screenings";
    return (
      <div className="pt-24 min-h-screen bg-neutral-50/50 px-4 py-12 text-center">
        <p className="font-bold text-neutral-900">Screening not found.</p>
        <Link href={backHref} className="text-blue-600 font-bold text-sm mt-4 inline-block">
          {backLabel}
        </Link>
      </div>
    );
  }

  if (user.role === "recruiter") {
    return <RecruiterScreeningReview detail={detail} />;
  }

  return (
    <CandidateScreeningForm
      detail={detail}
      answers={answers}
      onAnswerChange={(questionId, value) =>
        setAnswers((prev) => ({ ...prev, [questionId]: value }))
      }
      submitting={submitting}
      onSubmit={() => void handleSubmit()}
    />
  );
}
