/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const googleProvider = new GoogleAuthProvider();

export const signIn = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in", error);
    throw error;
  }
};

export const logout = () => signOut(auth);

export const signUpByEmail = async (email: string, pass: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error("Error signing up with email", error);
    throw error;
  }
};

export const signInByEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error("Error signing in with email", error);
    throw error;
  }
};

// --- Operation Helper with Error Wrapping ---

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Domain Helpers ---

export interface CandidateProfile {
  fullName: string;
  email: string;
  headline: string;
  summary: string;
  skills: string;
  experience: string;
  userId: string;
  portfolioUrl?: string | null;
  portfolioContent?: string | null;
  createdAt?: any;
  updatedAt?: any;
}

export interface Vacancy {
  id?: string;
  jobTitle: string;
  companyName: string;
  location: string;
  salary: string;
  description: string;
  requirements: string;
  status: 'open' | 'closed';
  postedBy: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Application {
  id?: string;
  vacancyId: string;
  candidateId: string;
  status: 'applied' | 'viewed' | 'interviewing' | 'rejected' | 'hired';
  appliedAt: any;
  vacancy?: Vacancy; // Joined data for convenience
}

export const saveCandidateProfile = async (profile: CandidateProfile) => {
  const path = `candidates/${profile.userId}`;
  try {
    const docRef = doc(db, "candidates", profile.userId);
    const docSnap = await getDoc(docRef);
    
    const data: any = {
      ...profile,
      updatedAt: serverTimestamp()
    };

    if (!docSnap.exists()) {
      data.createdAt = serverTimestamp();
      await setDoc(docRef, data);
    } else {
      // Preserve createdAt
      delete data.createdAt;
      await setDoc(docRef, data, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getCandidateProfile = async (userId: string) => {
  const path = `candidates/${userId}`;
  try {
    const docSnap = await getDoc(doc(db, "candidates", userId));
    return docSnap.exists() ? docSnap.data() as CandidateProfile : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const postVacancy = async (vacancy: Omit<Vacancy, 'id' | 'status'>) => {
  const path = 'vacancies';
  try {
    const docRef = await addDoc(collection(db, "vacancies"), {
      ...vacancy,
      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const getVacancies = async () => {
  const path = 'vacancies';
  try {
    const q = query(collection(db, "vacancies"), where("status", "==", "open"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vacancy));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const getVacanciesByUser = async (userId: string) => {
  const path = 'vacancies';
  try {
    const q = query(collection(db, "vacancies"), where("postedBy", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vacancy));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const updateVacancy = async (id: string, updates: Partial<Vacancy>) => {
  const path = `vacancies/${id}`;
  try {
    const docRef = doc(db, "vacancies", id);
    await setDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteVacancy = async (id: string) => {
  const path = `vacancies/${id}`;
  try {
    const docRef = doc(db, "vacancies", id);
    // Instead of actual delete, we could marked as 'deleted' or 'closed' 
    // but for a dashboard management, a hard delete or status change is common.
    // Let's do a hard delete for now to keep the dashboard clean.
    // Note: In production, soft-deletes are usually safer.
    await setDoc(docRef, { status: 'closed', updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const applyToJob = async (vacancyId: string, candidateId: string) => {
  const path = 'applications';
  try {
    // Check if already applied
    const q = query(
      collection(db, "applications"), 
      where("vacancyId", "==", vacancyId), 
      where("candidateId", "==", candidateId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].id;

    const docRef = await addDoc(collection(db, "applications"), {
      vacancyId,
      candidateId,
      status: 'applied',
      appliedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const getApplicationsByUser = async (candidateId: string) => {
  const path = 'applications';
  try {
    const q = query(collection(db, "applications"), where("candidateId", "==", candidateId));
    const querySnapshot = await getDocs(q);
    const apps = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
    
    // Join with vacancy data
    const enrichedApps = await Promise.all(apps.map(async (app) => {
      const vSnap = await getDoc(doc(db, "vacancies", app.vacancyId));
      if (vSnap.exists()) {
        app.vacancy = { id: vSnap.id, ...vSnap.data() } as Vacancy;
      }
      return app;
    }));
    
    return enrichedApps;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const getAllCandidates = async () => {
  const path = 'candidates';
  try {
    const querySnapshot = await getDocs(collection(db, "candidates"));
    return querySnapshot.docs.map(doc => doc.data() as CandidateProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const seedVacancies = async (userId: string) => {
  const samples: Omit<Vacancy, 'id' | 'status'>[] = [
    {
      jobTitle: "Senior Frontend Engineer",
      companyName: "TechFlow Systems",
      location: "Remote (Global)",
      salary: "$140k - $180k",
      description: "We are looking for a React expert to lead our dashboard team. You will be responsible for building high-performance UIs and mentoring junior developers.",
      requirements: "5+ years experience with React, TypeScript, and modern CSS. Strong architectural skills are a must.",
      postedBy: userId
    },
    {
      jobTitle: "Lead Product Designer",
      companyName: "CreativePulse",
      location: "London, UK / Hybrid",
      salary: "£70k - £90k",
      description: "Join our boutique design agency and lead projects for top-tier fintech clients. You will own the entire design process from wireframing to high-fidelity prototypes.",
      requirements: "Portfolio showcasing end-to-end product design. Expert in Figma and Design Systems.",
      postedBy: userId
    },
    {
      jobTitle: "Backend Infrastructure Developer",
      companyName: "DataCore",
      location: "San Francisco, CA",
      salary: "$160k - $210k",
      description: "Focus on scalability and reliability for our core data processing engine. You'll work with Go, Kubernetes, and distributed systems at scale.",
      requirements: "Strong background in Go or C++. Experience with cloud-native infrastructure and microservices.",
      postedBy: userId
    },
    {
      jobTitle: "AI Research Scientist",
      companyName: "Nexus Intelligence",
      location: "Remote",
      salary: "$180k - $240k",
      description: "Push the boundaries of what's possible with LLMs. Work on fine-tuning, RAG optimization, and agentic workflows for enterprise customers.",
      requirements: "MS/PhD in CS/AI or equivalent industry experience. Strong Python and PyTorch skills.",
      postedBy: userId
    }
  ];

  for (const sample of samples) {
    await postVacancy(sample);
  }
};

export const seedCandidates = async () => {
  const samples: CandidateProfile[] = [
    {
      fullName: "Marcus Holloway",
      email: "marcus@ctos.io",
      headline: "Cloud Architect | AWS & Azure Expert",
      summary: "I build rock-solid infrastructure at scale. Passionate about security, automation, and reducing latency.",
      skills: "AWS, Kubernetes, Terraform, Go, Docker",
      experience: "Cloud Architect at Blume Corp (3yrs), DevOps Lead at DeadSec (2yrs).",
      userId: "sample-1",
      portfolioUrl: "https://github.com/marcus-h",
      portfolioContent: "# Marcus Holloway\n\n## Cloud Architect & infrastructure Hero\n\nExperienced in designing and deploying scalable cloud infrastructures. I specialize in automation and security.\n\n### Core Projects\n- **Project Blume**: Optimized AWS spend by 40% using custom Terraform modules.\n- **DeadSec Security Framework**: Implemented zero-trust architecture across all microservices.\n\n### Education\n- BS in Computer Science, University of California, Berkeley"
    },
    {
      fullName: "Elena Fisher",
      email: "elena@uncharted.com",
      headline: "UI/UX Specialist & Framer Motion Enthusiast",
      summary: "Designing interfaces that feel like magic. I bridge the gap between aesthetics and function.",
      skills: "Figma, React, Framer Motion, Tailwind, Next.js",
      experience: "Senior Designer at Fortune Media, Freelance Brand Strategist.",
      userId: "sample-2",
      portfolioUrl: "https://dribbble.com/elena_design",
      portfolioContent: "# Elena Fisher\n\n## UI/UX Designer & Product Strategist\n\nI create digital experiences that people love. My design philosophy is rooted in usability and delight.\n\n### Recent Work\n- **Fortune Media Redesign**: Lead the responsive redesign for a major media outlet.\n- **CryptoFlow App**: Designed the end-to-end user experience for a high-growth crypto wallet.\n\nCheck out my work below for more details on my process."
    },
    {
      fullName: "Satoshi Tanaka",
      email: "satoshi@block.net",
      headline: "Smart Contract Developer | Rust & Solidity",
      summary: "Writing secure code for decentralized futures. Specialist in DeFi protocols and ZK proofs.",
      skills: "Solidity, Rust, Web3.js, Ethers, Hardhat",
      experience: "Core Dev at EtherPulse, Security Auditor at OpenZeppelin.",
      userId: "sample-3",
      portfolioUrl: "https://etherscan.io",
    },
    {
      fullName: "Sarah Connor",
      email: "sarah@resistance.tech",
      headline: "Cybersecurity Analyst | Threat Intelligence",
      summary: "Protecting systems from the future. Expert in penetration testing and network infrastructure.",
      skills: "Python, Kali Linux, Wireshark, Metasploit, SIEM",
      experience: "Lead Security Analyst at Cyberdyne (Self-employed), Military Intelligence.",
      userId: "sample-4",
      portfolioUrl: "https://sarahconnor.tech",
    },
    {
      fullName: "James Holden",
      email: "holden@rocinante.space",
      headline: "Operations Manager | Logistics & Team Leadership",
      summary: "Managing complex operations in high-pressure environments. Doing the right thing, always.",
      skills: "Logistics, Crisis Management, Communication, Strategic Planning",
      experience: "Captain of the Rocinante, XO at Pur'n'Kleen Water Co.",
      userId: "sample-5",
      portfolioUrl: "https://rocinante.space",
    },
    {
      fullName: "Diana Prince",
      email: "diana@themyscira.org",
      headline: "Principal Researcher & Strategy Advisor",
      summary: "Expert in historical data analysis and strategic planning. Deep experience in museum curation and international relations.",
      skills: "Research, Strategy, Curating, Languages, Mediation",
      experience: "Senior Researcher at the Louvre, Independent Consultant for global NGOs.",
      userId: "sample-6",
      portfolioUrl: "https://diana-prince.com",
    },
    {
      fullName: "Arthur Dent",
      email: "arthur@hitchhikers.guide",
      headline: "Technical Writer & Content Strategist",
      summary: "I explain complex things simply. Specialist in documentation for galaxy-scale systems.",
      skills: "Technical Writing, Editing, Storytelling, BBC Radio Experience",
      experience: "Contributor to The Hitchhiker's Guide to the Galaxy, Former Radio Producer.",
      userId: "sample-7",
      portfolioUrl: "https://hitchhikers.guide",
    },
    {
      fullName: "Lara Croft",
      email: "lara@manor.co.uk",
      headline: "Field Researcher | Digital Heritage Specialist",
      summary: "Combining physical exploration with digital preservation. Expert in recovery of lost information architectures.",
      skills: "Data Recovery, Historical Analysis, Photography, Problem Solving",
      experience: "Independent Explorer and Researcher, Fellow of the Royal Geographical Society.",
      userId: "sample-8",
      portfolioUrl: "https://laracroft.com",
    }
  ];

  for (const sample of samples) {
    await saveCandidateProfile(sample);
  }
};
