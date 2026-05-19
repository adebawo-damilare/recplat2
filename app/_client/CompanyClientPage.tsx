"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTalentBridgeUser } from "../../src/lib/useTalentBridgeUser";
import CompanyDashboard from "../../src/components/CompanyDashboard";
import { RecruiterCompanySelectionProvider } from "../../src/lib/recruiterCompanySelection";

export default function CompanyClientPage() {
  const router = useRouter();
  const { user, loading } = useTalentBridgeUser();

  useEffect(() => {
    if (!loading && !user) router.replace("/sign-in");
    if (!loading && user?.role !== "recruiter") router.replace("/dashboard/profile");
  }, [loading, user, router]);

  return (
    <div className="pt-24 min-h-screen bg-neutral-50/50" data-testid="recruiter-dashboard-page">
      <RecruiterCompanySelectionProvider>
        <CompanyDashboard />
      </RecruiterCompanySelectionProvider>
    </div>
  );
}
