"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../src/lib/firebase";
import CompanyDashboard from "../../src/components/CompanyDashboard";

export default function CompanyClientPage() {
  const router = useRouter();

  useEffect(() => onAuthStateChanged(auth, (user) => {
    if (!user) router.replace("/sign-in");
  }), [router]);

  return (
    <div className="pt-24 min-h-screen bg-neutral-50/50">
      <CompanyDashboard />
    </div>
  );
}