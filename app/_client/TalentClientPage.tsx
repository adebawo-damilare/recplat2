"use client";

import { useState } from "react";
import TalentBoard from "../../src/components/TalentBoard";
import PortfolioViewer from "../../src/components/PortfolioViewer";
import type { CandidateProfile } from "../../src/lib/firebase";

export default function TalentClientPage() {
  const [portfolioCandidate, setPortfolioCandidate] = useState<CandidateProfile | null>(null);

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