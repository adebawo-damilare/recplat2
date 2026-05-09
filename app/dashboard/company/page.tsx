import type { Metadata } from "next";
import CompanyClientPage from "../../_client/CompanyClientPage";

export const metadata: Metadata = {
  title: "Recruiter Dashboard",
  robots: { index: false, follow: false },
};

export default function CompanyDashboardPage() {
  return <CompanyClientPage />;
}