import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOpenVacancyById } from "../../../src/server/jobs";
import JobDetailClientPage from "../../_client/JobDetailClientPage";

type Props = { params: Promise<{ id: string }> };

function descriptionSnippet(text: string, max = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "Open role on TalentBridge.";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const job = await getOpenVacancyById(id.trim());
  if (!job) {
    return { title: "Job not found" };
  }
  const title = `${job.jobTitle} — ${job.companyName}`;
  const desc = descriptionSnippet(`${job.jobTitle} at ${job.companyName}. ${job.description}`);
  return {
    title,
    description: desc,
    alternates: { canonical: `/jobs/${job.id}` },
    openGraph: {
      title,
      description: descriptionSnippet(job.description),
      type: "article",
    },
  };
}

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;
  const trimmed = id.trim();
  if (!trimmed) notFound();
  const job = await getOpenVacancyById(trimmed);
  if (!job) notFound();
  return <JobDetailClientPage job={job} />;
}
