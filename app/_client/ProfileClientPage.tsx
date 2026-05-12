"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTalentBridgeUser } from "../../src/lib/useTalentBridgeUser";
import CandidateDashboard from "../../src/components/CandidateDashboard";
import PortfolioViewer from "../../src/components/PortfolioViewer";
import type { CandidateProfile } from "../../src/lib/domainTypes";
import { formatCandidateFullName } from "../../src/lib/candidateName";

export default function ProfileClientPage() {
  const router = useRouter();
  const { user, loading } = useTalentBridgeUser();
  const [portfolioCandidate, setPortfolioCandidate] = useState<CandidateProfile | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/sign-in");
    if (!loading && user?.role !== "candidate") router.replace("/dashboard/company");
  }, [loading, user, router]);

  return (
    <div className="pt-24 min-h-screen bg-neutral-50/50">
      <CandidateDashboard onViewPortfolio={(candidate) => setPortfolioCandidate(candidate)} />
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
