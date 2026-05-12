"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import SignIn from "../../src/components/SignIn";
import TalentBoard from "../../src/components/TalentBoard";
import PortfolioViewer from "../../src/components/PortfolioViewer";
import type { CandidateProfile } from "../../src/lib/domainTypes";
import { formatCandidateFullName } from "../../src/lib/candidateName";
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

  return (
    <div className="pt-24 min-h-screen bg-neutral-50/50">
      <TalentBoard onViewPortfolio={(candidate) => setPortfolioCandidate(candidate)} />
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
