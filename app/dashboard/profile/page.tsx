import type { Metadata } from "next";
import ProfileClientPage from "../../_client/ProfileClientPage";

export const metadata: Metadata = {
  title: "Candidate Dashboard",
  robots: { index: false, follow: false },
};

export default function ProfileDashboardPage() {
  return <ProfileClientPage />;
}