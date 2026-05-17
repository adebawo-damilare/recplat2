import type { Metadata } from "next";
import ScreeningDetailClientPage from "../../../_client/ScreeningDetailClientPage";

export const metadata: Metadata = {
  title: "Screening",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ id: string }> };

export default async function ScreeningDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <ScreeningDetailClientPage invitationId={id} />;
}
