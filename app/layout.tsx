import type { Metadata } from "next";
import "./globals.css";
import AppProviders from "./_client/AppProviders";
import NextAppNav from "../src/components/layout/next/NextAppNav";
import NextAppFooter from "../src/components/layout/next/NextAppFooter";

export const metadata: Metadata = {
  metadataBase: new URL("https://talentbridge.example.com"),
  title: {
    default: "TalentBridge | Recruitment Platform",
    template: "%s | TalentBridge",
  },
  description: "TalentBridge helps candidates and companies connect with faster, smarter hiring workflows.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "TalentBridge",
    description: "Recruitment platform for candidates and companies.",
    url: "/",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
        <AppProviders>
          <NextAppNav />
          <main>{children}</main>
          <NextAppFooter />
        </AppProviders>
      </body>
    </html>
  );
}