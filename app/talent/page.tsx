import type { Metadata } from "next";
import TalentClientPage from "../_client/TalentClientPage";

export const metadata: Metadata = {
  title: "Talent",
  description: "Browse candidate profiles and portfolios.",
  alternates: { canonical: "/talent" },
};

export default function TalentPage() {
  return <TalentClientPage />;
}