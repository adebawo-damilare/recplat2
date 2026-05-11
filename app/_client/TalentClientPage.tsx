"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import SignIn from "../../src/components/SignIn";
import TalentBoard from "../../src/components/TalentBoard";
import PortfolioViewer from "../../src/components/PortfolioViewer";
import type { CandidateProfile } from "../../src/lib/domainTypes";
import { useTalentBridgeUser } from "../../src/lib/useTalentBridgeUser";

export default function TalentClientPage() {
  const router = useRouter();
  const { user, loading, refresh } = useTalentBridgeUser();
  const [portfolioCandidate, setPortfolioCandidate] = useState<CandidateProfile | null>(null);

  if (loading) {
    return (
      <div className="pt-24 min-h-screen bg-neutral-50/50 flex items-center justify-center">
        <p className="text-neutral-500 text-sm font-medium">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="pt-24 min-h-screen bg-neutral-50/50">
        <SignIn onSuccess={() => void refresh()} onCancel={() => router.push("/")} />
      </div>
    );
  }

  if (user.role !== "recruiter") {
    return (
      <div className="pt-24 min-h-screen bg-neutral-50/50 px-4">
        <div className="max-w-lg mx-auto mt-12 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Recruiter access</h1>
          <p className="text-neutral-600 mb-6">
            The candidate directory is for recruiter accounts. Sign out and create or sign in to a recruiter account to
            browse candidates, or continue as a candidate below.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/jobs"
              className="inline-flex justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              Browse jobs
            </Link>
            <Link
              href="/dashboard/profile"
              className="inline-flex justify-center rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-bold text-neutral-800 hover:bg-neutral-100"
            >
              My profile
            </Link>
            <Link href="/" className="inline-flex justify-center rounded-xl px-4 py-3 text-sm font-semibold text-neutral-600 hover:text-neutral-900">
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-neutral-50/50">
      <TalentBoard onViewPortfolio={(candidate) => setPortfolioCandidate(candidate)} />
      {portfolioCandidate && (
        <PortfolioViewer
          content={portfolioCandidate.portfolioContent}
          url={portfolioCandidate.portfolioUrl}
          candidateName={portfolioCandidate.fullName}
          candidateEmail={portfolioCandidate.email}
          onClose={() => setPortfolioCandidate(null)}
        />
      )}
    </div>
  );
}
