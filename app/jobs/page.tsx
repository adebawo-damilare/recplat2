import type { Metadata } from "next";
import JobsClientPage from "../_client/JobsClientPage";

export const metadata: Metadata = {
  title: "Jobs",
  description: "Explore active job opportunities on TalentBridge.",
  alternates: { canonical: "/jobs" },
};

export default function JobsPage() {
  return <JobsClientPage />;
}