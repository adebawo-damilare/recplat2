import type { Metadata } from "next";
import ApplicationsClientPage from "../../_client/ApplicationsClientPage";

export const metadata: Metadata = {
  title: "My applications",
  robots: { index: false, follow: false },
};

export default function ApplicationsDashboardPage() {
  return <ApplicationsClientPage />;
}
