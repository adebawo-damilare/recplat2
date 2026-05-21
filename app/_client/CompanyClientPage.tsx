"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTalentBridgeUser } from "../../src/lib/useTalentBridgeUser";
import CompanyDashboard from "../../src/components/CompanyDashboard";
import { RecruiterCompanySelectionProvider } from "../../src/lib/recruiterCompanySelection";

function CompanyDashboardFromUrl() {
  const searchParams = useSearchParams();
  const applicationId = searchParams.get("application");
  return <CompanyDashboard initialOpenApplicationId={applicationId} />;
}

function CompanyDashboardFallback() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="h-12 w-48 rounded-xl bg-neutral-200/80 animate-pulse mb-8" />
      <div className="h-64 w-full rounded-3xl bg-neutral-200/60 animate-pulse" />
    </div>
  );
}

export default function CompanyClientPage() {
  const router = useRouter();
  const { user, loading } = useTalentBridgeUser();

  useEffect(() => {
    if (!loading && !user) router.replace("/sign-in");
    if (!loading && user?.role !== "recruiter") router.replace("/dashboard/profile");
  }, [loading, user, router]);

  if (loading || !user || user.role !== "recruiter") {
    return (
      <div className="pt-24 min-h-screen bg-neutral-50/50" data-testid="recruiter-dashboard-page">
        <div className="h-64 bg-neutral-200/60 animate-pulse max-w-7xl mx-auto mt-12 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-neutral-50/50" data-testid="recruiter-dashboard-page">
      <RecruiterCompanySelectionProvider>
        <Suspense fallback={<CompanyDashboardFallback />}>
          <CompanyDashboardFromUrl />
        </Suspense>
      </RecruiterCompanySelectionProvider>
    </div>
  );
}
