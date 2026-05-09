import type { Metadata } from "next";
import SignInClientPage from "../_client/SignInClientPage";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to manage your profile or recruiter dashboard.",
  alternates: { canonical: "/sign-in" },
};

export default function SignInPage() {
  return <SignInClientPage />;
}