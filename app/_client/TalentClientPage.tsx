"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import SignIn from "../../src/components/SignIn";
import TalentBoard from "../../src/components/TalentBoard";
import PortfolioViewer from "../../src/components/PortfolioViewer";
import type { CandidateProfile } from "../../src/lib/domainTypes";
import { formatCandidateFullName } from "../../src/lib/candidateName";
import { useTalentBridgeUser } from "../../src/lib/useTalentBridgeUser";
import { useTalentBoardQuerySync } from "./useTalentBoardQuerySync";

function TalentBoardWithSyncedQuery({
  onViewPortfolio,
}: {
  onViewPortfolio: (candidate: CandidateProfile) => void;
}) {
  const syncedQuery = useTalentBoardQuerySync();
  return <TalentBoard syncedQuery={syncedQuery} onViewPortfolio={onViewPortfolio} />;
}

function TalentBoardFallback() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="h-12 w-2/3 max-w-md rounded-xl bg-neutral-200/80 animate-pulse mb-8" />
      <div className="h-14 w-full rounded-2xl bg-neutral-200/60 animate-pulse" />
    </div>
  );
}

export default function TalentClientPage() {
  const router = useRouter();
  const { user, loading, refresh } = useTalentBridgeUser();
  const [portfolioCandidate, setPortfolioCandidate] = useState<CandidateProfile | null>(null);

  if (loading) {
    return (
      <div
        className="pt-24 min-h-screen bg-neutral-50/50 flex items-center justify-center"
        data-testid="talent-page-loading"
      >
        <p className="text-neutral-500 text-sm font-medium">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="pt-24 min-h-screen bg-neutral-50/50" data-testid="talent-sign-in-gate">
        <SignIn onSuccess={() => void refresh()} onCancel={() => router.push("/")} />
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-neutral-50/50" data-testid="talent-board-root">
      <Suspense fallback={<TalentBoardFallback />}>
        <TalentBoardWithSyncedQuery onViewPortfolio={(candidate) => setPortfolioCandidate(candidate)} />
      </Suspense>
      {portfolioCandidate && (
        <PortfolioViewer
          content={portfolioCandidate.portfolioContent}
          url={portfolioCandidate.portfolioUrl}
          candidateName={formatCandidateFullName(portfolioCandidate.firstName, portfolioCandidate.lastName)}
          candidateEmail={portfolioCandidate.email}
          onClose={() => setPortfolioCandidate(null)}
        />
      )}
    </div>
  );
}
