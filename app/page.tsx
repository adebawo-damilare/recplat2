import type { Metadata } from "next";
import HomeClientPage from "./_client/HomeClientPage";

export const metadata: Metadata = {
  title: "Home",
  description: "TalentBridge connects elite talent with high-performing teams.",
  alternates: { canonical: "/" },
};

export default function Page() {
  return <HomeClientPage />;
}