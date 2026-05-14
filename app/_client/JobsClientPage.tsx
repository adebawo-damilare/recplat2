"use client";

import { Suspense } from "react";
import JobBoard from "../../src/components/JobBoard";
import { useTalentCategories } from "../../src/components/jobs/useTalentCategories";
import { useJobBoardQuerySync } from "./useJobBoardQuerySync";

function JobsBoardWithSyncedQuery() {
  const lanes = useTalentCategories();
  const syncedQuery = useJobBoardQuerySync(lanes);
  return <JobBoard syncedQuery={syncedQuery} />;
}

function JobsBoardFallback() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="h-12 w-2/3 max-w-md rounded-xl bg-neutral-200/80 animate-pulse mb-8" />
      <div className="h-14 w-full rounded-2xl bg-neutral-200/60 animate-pulse" />
    </div>
  );
}

export default function JobsClientPage() {
  return (
    <div className="pt-24 min-h-screen bg-neutral-50/50">
      <Suspense fallback={<JobsBoardFallback />}>
        <JobsBoardWithSyncedQuery />
      </Suspense>
    </div>
  );
}
