"use client";

import { useRouter } from "next/navigation";
import SignIn from "../../src/components/SignIn";

export default function SignInClientPage() {
  const router = useRouter();

  return (
    <div className="pt-24 min-h-screen bg-neutral-50/50">
      <SignIn onSuccess={() => router.push("/")} onCancel={() => router.push("/")} />
    </div>
  );
}