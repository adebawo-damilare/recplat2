"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Briefcase, LogOut, Plus, User as UserIcon } from "lucide-react";
import { useTalentBridgeUser } from "../../../lib/useTalentBridgeUser";

export default function NextAppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useTalentBridgeUser();

  const activeClass = "text-blue-600";

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-neutral-200" data-testid="app-nav" aria-label="Primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 cursor-pointer group">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-neutral-900">TalentBridge</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600">
            <Link href="/jobs" className={`hover:text-blue-600 transition-colors ${pathname === "/jobs" || pathname.startsWith("/jobs/") ? activeClass : ""}`}>
              Find Jobs
            </Link>
            <Link href="/talent" data-testid="nav-find-candidates" className={`hover:text-blue-600 transition-colors ${pathname === "/talent" ? activeClass : ""}`}>
              Find Candidates
            </Link>
            <Link href="/about" className={`hover:text-blue-600 transition-colors ${pathname === "/about" ? activeClass : ""}`}>
              About
            </Link>

            <div className="flex items-center gap-3">
              {!loading && user ? (
                <div className="flex items-center gap-4">
                  {user.role === "recruiter" ? (
                    <Link
                      href="/dashboard/company"
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                        pathname === "/dashboard/company" ? "bg-neutral-900 text-white shadow-lg" : "text-neutral-500 hover:bg-neutral-100"
                      }`}
                    >
                      Recruiter Panel
                    </Link>
                  ) : (
                    <Link
                      href="/dashboard/profile"
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                        pathname === "/dashboard/profile" ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-neutral-500 hover:bg-neutral-100"
                      }`}
                    >
                      My Profile
                    </Link>
                  )}
                  <div className="flex items-center gap-2 px-3 py-1 bg-neutral-100 rounded-full">
                    <UserIcon className="w-4 h-4 text-neutral-500" />
                    <span className="text-xs font-bold truncate max-w-[100px]">{user.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      router.push("/");
                    }}
                    className="text-neutral-400 hover:text-red-500 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : !loading ? (
                <Link href="/sign-in" data-testid="nav-sign-in" className="bg-neutral-900 text-white px-5 py-2 rounded-full hover:bg-neutral-800 transition-colors">
                  Sign In
                </Link>
              ) : null}
            </div>
          </div>

          <div className="md:hidden">
            <Plus className="w-6 h-6 rotate-45" />
          </div>
        </div>
      </div>
    </nav>
  );
}
