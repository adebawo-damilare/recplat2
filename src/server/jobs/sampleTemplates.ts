/**
 * Mirrors the Firestore seed set so UX stays consistent across backends.
 */

export interface SampleVacancySeed {
  jobTitle: string;
  companyName: string;
  location: string;
  salary: string;
  description: string;
  requirements: string;
}

export const SAMPLE_VACANCY_TEMPLATES: SampleVacancySeed[] = [
  {
    jobTitle: "Senior Frontend Engineer",
    companyName: "TechFlow Systems",
    location: "Remote (Global)",
    salary: "$140k - $180k",
    description:
      "We are looking for a React expert to lead our dashboard team. You will be responsible for building high-performance UIs and mentoring junior developers.",
    requirements:
      "5+ years experience with React, TypeScript, and modern CSS. Strong architectural skills are a must.",
  },
  {
    jobTitle: "Lead Product Designer",
    companyName: "CreativePulse",
    location: "London, UK / Hybrid",
    salary: "£70k - £90k",
    description:
      "Join our boutique design agency and lead projects for top-tier fintech clients. You will own the entire design process from wireframing to high-fidelity prototypes.",
    requirements: "Portfolio showcasing end-to-end product design. Expert in Figma and Design Systems.",
  },
  {
    jobTitle: "Backend Infrastructure Developer",
    companyName: "DataCore",
    location: "San Francisco, CA",
    salary: "$160k - $210k",
    description:
      "Focus on scalability and reliability for our core data processing engine. You'll work with Go, Kubernetes, and distributed systems at scale.",
    requirements:
      "Strong background in Go or C++. Experience with cloud-native infrastructure and microservices.",
  },
  {
    jobTitle: "AI Research Scientist",
    companyName: "Nexus Intelligence",
    location: "Remote",
    salary: "$180k - $240k",
    description:
      "Push the boundaries of what's possible with LLMs. Work on fine-tuning, RAG optimization, and agentic workflows for enterprise customers.",
    requirements: "MS/PhD in CS/AI or equivalent industry experience. Strong Python and PyTorch skills.",
  },
];
