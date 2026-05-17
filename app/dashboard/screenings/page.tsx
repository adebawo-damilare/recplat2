import type { Metadata } from "next";
import ScreeningsListClientPage from "../../_client/ScreeningsListClientPage";

export const metadata: Metadata = {
  title: "Screenings",
  robots: { index: false, follow: false },
};

export default function ScreeningsDashboardPage() {
  return <ScreeningsListClientPage />;
}
