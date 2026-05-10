/**
 * Shared Postgres + Firestore sample vacancies (keeps backends aligned).
 */

export interface SampleVacancySeed {
  jobTitle: string;
  companyName: string;
  location: string;
  salary: string;
  description: string;
  requirements: string;
  categorySlug: "marketers" | "designers" | "sales";
}

export const SAMPLE_VACANCY_TEMPLATES: SampleVacancySeed[] = [
  {
    categorySlug: "marketers",
    jobTitle: "Growth Marketing Lead",
    companyName: "Northwind Labs",
    location: "Remote (Americas)",
    salary: "$120k - $160k",
    description:
      "Own paid and lifecycle programs across SaaS onboarding. Collaborate with product on messaging, experiments, and conversion analytics.",
    requirements:
      "3+ years B2B growth experience. Comfortable with attribution, experimentation, and copy testing across email and paid social.",
  },
  {
    categorySlug: "designers",
    jobTitle: "Senior Product Designer",
    companyName: "CreativePulse Studio",
    location: "London, UK · Hybrid",
    salary: "£70k - £90k",
    description:
      "Lead end-to-end product design for fintech dashboards. Ship systems in Figma, partner with engineers on accessible UI polish.",
    requirements:
      "Portfolio with shipped product work and design systems familiarity. Fluency in Figma, prototyping, and workshop facilitation.",
  },
  {
    categorySlug: "sales",
    jobTitle: "Enterprise Account Executive",
    companyName: "Vertex Platforms",
    location: "Austin / Remote",
    salary: "$145k base + uncapped commission",
    description:
      "Run complex six-figure opportunities with CTO/CFO stakeholders. Forecast cleanly and partner tightly with solutions engineers.",
    requirements:
      "5+ years enterprise SaaS closing experience. Comfortable with MEDDPICC-style qualification and mutual close plans.",
  },
  {
    categorySlug: "sales",
    jobTitle: "Revenue Partnerships Lead",
    companyName: "Harbor Freight AI",
    location: "NYC Hybrid",
    salary: "$165k base + bonuses",
    description:
      "Build and execute co-sell and channel motions with hyperscalers. Coordinate legal, ops, and field teams for joint go-to-market.",
    requirements:
      "Demonstrated playbook for partner pipelines in B2B software. Outstanding executive communication skills.",
  },
];
