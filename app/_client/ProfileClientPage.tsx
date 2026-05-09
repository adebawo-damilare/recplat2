"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, type CandidateProfile } from "../../src/lib/firebase";
import CandidateDashboard from "../../src/components/CandidateDashboard";
import PortfolioViewer from "../../src/components/PortfolioViewer";

export default function ProfileClientPage() {
  const router = useRouter();
  const [portfolioCandidate, setPortfolioCandidate] = useState<CandidateProfile | null>(null);

  useEffect(() => onAuthStateChanged(auth, (user) => {
    if (!user) router.replace("/sign-in");
  }), [router]);

  return (
    <div className="pt-24 min-h-screen bg-neutral-50/50">
      <CandidateDashboard onViewPortfolio={(candidate) => setPortfolioCandidate(candidate)} />
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