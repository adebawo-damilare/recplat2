"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useTalentBridgeUser } from "../../src/lib/useTalentBridgeUser";
import { fetchMyApplicationsWithFallback } from "../../src/lib/applicationsApi";
import type { Application } from "../../src/lib/domainTypes";
import MyApplicationsBoard from "../../src/components/MyApplicationsBoard";

export default function ApplicationsClientPage() {
  const router = useRouter();
  const { user, loading } = useTalentBridgeUser();
  const [applications, setApplications] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/sign-in");
    if (!loading && user && user.role !== "candidate") router.replace("/dashboard/company");
  }, [loading, user, router]);

  const load = useCallback(async () => {
    if (!user || user.role !== "candidate") return;
    setAppsLoading(true);
    try {
      const apps = await fetchMyApplicationsWithFallback();
      setApplications(apps ?? []);
    } finally {
      setAppsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !user || user.role !== "candidate") {
    return (
      <div className="pt-24 min-h-screen bg-neutral-50/50" data-testid="my-applications-page">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
          <div className="h-10 bg-neutral-200 rounded-xl w-2/3 max-w-md mb-4" />
          <div className="h-6 bg-neutral-200 rounded-lg w-1/2 max-w-sm mb-12" />
          <div className="h-48 bg-neutral-200 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-neutral-50/50" data-testid="my-applications-page">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/dashboard/profile"
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 mb-8 hover:underline"
          data-testid="my-applications-back-dashboard"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Back to dashboard
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">My applications</h1>
          <p className="text-neutral-500 font-medium mt-2">Track roles you&apos;ve applied to and open the listing anytime.</p>
        </header>

        <MyApplicationsBoard applications={applications} loading={appsLoading} />
      </div>
    </div>
  );
}
