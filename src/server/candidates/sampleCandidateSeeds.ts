/** Demo talent-board rows inserted by POST /api/candidates/seed-samples (one user + profile each). */

export type SampleCandidateSeed = {
  email: string;
  fullName: string;
  headline: string;
  summary: string;
  skills: string;
  experience: string;
  portfolioUrl?: string | null;
  portfolioContent?: string | null;
};

export const SAMPLE_CANDIDATE_SEEDS: SampleCandidateSeed[] = [
  {
    fullName: "Marcus Holloway",
    email: "marcus.sample@talentbridge.invalid",
    headline: "Cloud Architect | AWS & Azure Expert",
    summary:
      "I build rock-solid infrastructure at scale. Passionate about security, automation, and reducing latency.",
    skills: "AWS, Kubernetes, Terraform, Go, Docker",
    experience: "Cloud Architect at Blume Corp (3yrs), DevOps Lead at DeadSec (2yrs).",
    portfolioUrl: "https://github.com/marcus-h",
    portfolioContent:
      "# Marcus Holloway\n\n## Cloud Architect & infrastructure Hero\n\nExperienced in designing and deploying scalable cloud infrastructures.",
  },
  {
    fullName: "Elena Fisher",
    email: "elena.sample@talentbridge.invalid",
    headline: "UI/UX Specialist & Framer Motion Enthusiast",
    summary: "Designing interfaces that feel like magic. I bridge the gap between aesthetics and function.",
    skills: "Figma, React, Framer Motion, Tailwind, Next.js",
    experience: "Senior Designer at Fortune Media, Freelance Brand Strategist.",
    portfolioUrl: "https://dribbble.com/elena_design",
    portfolioContent:
      "# Elena Fisher\n\n## UI/UX Designer & Product Strategist\n\nI create digital experiences that people love.",
  },
  {
    fullName: "Satoshi Tanaka",
    email: "satoshi.sample@talentbridge.invalid",
    headline: "Smart Contract Developer | Rust & Solidity",
    summary: "Writing secure code for decentralized futures. Specialist in DeFi protocols and ZK proofs.",
    skills: "Solidity, Rust, Web3.js, Ethers, Hardhat",
    experience: "Core Dev at EtherPulse, Security Auditor at OpenZeppelin.",
    portfolioUrl: "https://etherscan.io",
  },
  {
    fullName: "Sarah Connor",
    email: "sarah.sample@talentbridge.invalid",
    headline: "Cybersecurity Analyst | Threat Intelligence",
    summary: "Protecting systems from the future. Expert in penetration testing and network infrastructure.",
    skills: "Python, Kali Linux, Wireshark, Metasploit, SIEM",
    experience: "Lead Security Analyst at Cyberdyne (Self-employed), Military Intelligence.",
    portfolioUrl: "https://sarahconnor.tech",
  },
  {
    fullName: "James Holden",
    email: "holden.sample@talentbridge.invalid",
    headline: "Operations Manager | Logistics & Team Leadership",
    summary: "Managing complex operations in high-pressure environments. Doing the right thing, always.",
    skills: "Logistics, Crisis Management, Communication, Strategic Planning",
    experience: "Captain of the Rocinante, XO at Pur'n'Kleen Water Co.",
    portfolioUrl: "https://rocinante.space",
  },
  {
    fullName: "Diana Prince",
    email: "diana.sample@talentbridge.invalid",
    headline: "Principal Researcher & Strategy Advisor",
    summary:
      "Expert in historical data analysis and strategic planning. Deep experience in museum curation and international relations.",
    skills: "Research, Strategy, Curating, Languages, Mediation",
    experience: "Senior Researcher at the Louvre, Independent Consultant for global NGOs.",
    portfolioUrl: "https://diana-prince.com",
  },
  {
    fullName: "Arthur Dent",
    email: "arthur.sample@talentbridge.invalid",
    headline: "Technical Writer & Content Strategist",
    summary: "I explain complex things simply. Specialist in documentation for galaxy-scale systems.",
    skills: "Technical Writing, Editing, Storytelling, BBC Radio Experience",
    experience: "Contributor to The Hitchhiker's Guide to the Galaxy, Former Radio Producer.",
    portfolioUrl: "https://hitchhikers.guide",
  },
  {
    fullName: "Lara Croft",
    email: "lara.sample@talentbridge.invalid",
    headline: "Field Researcher | Digital Heritage Specialist",
    summary:
      "Combining physical exploration with digital preservation. Expert in recovery of lost information architectures.",
    skills: "Data Recovery, Historical Analysis, Photography, Problem Solving",
    experience: "Independent Explorer and Researcher, Fellow of the Royal Geographical Society.",
    portfolioUrl: "https://laracroft.com",
  },
];
