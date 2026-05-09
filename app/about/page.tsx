import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "Learn how TalentBridge supports modern recruitment workflows.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <section className="pt-32 pb-20 px-4">
      <div className="max-w-4xl mx-auto bg-white border border-neutral-200 rounded-3xl p-10">
        <h1 className="text-4xl font-bold tracking-tight mb-6">About TalentBridge</h1>
        <p className="text-neutral-600 leading-relaxed">
          TalentBridge is built for candidates and recruiters who need transparent, structured hiring workflows.
          We combine profile storytelling, role discovery, and selection operations in one platform.
        </p>
      </div>
    </section>
  );
}