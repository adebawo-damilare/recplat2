"use client";

import AlertProvider from "../../src/components/ui/alert/AlertProvider";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return <AlertProvider>{children}</AlertProvider>;
}
