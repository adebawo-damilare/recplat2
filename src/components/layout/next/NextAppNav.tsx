"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Briefcase, LogOut, Menu, User as UserIcon, X } from "lucide-react";
import { useTalentBridgeUser } from "../../../lib/useTalentBridgeUser";

export default function NextAppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useTalentBridgeUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeClass = "text-blue-600";

  const closeMobile = () => setMobileOpen(false);

  const navLinkClass = (active: boolean) =>
    `block py-3 text-base font-semibold ${active ? "text-blue-600" : "text-neutral-800 hover:text-blue-600"}`;

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-neutral-200" data-testid="app-nav" aria-label="Primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 cursor-pointer group" onClick={closeMobile}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-neutral-900">TalentBridge</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600">
            <Link href="/jobs" className={`hover:text-blue-600 transition-colors ${pathname === "/jobs" || pathname.startsWith("/jobs/") ? activeClass : ""}`}>
              Find Jobs
            </Link>
            {!loading && user?.role === "candidate" ? (
              <Link
                href="/dashboard/applications"
                data-testid="nav-my-applications-main"
                className={`hover:text-blue-600 transition-colors ${
                  pathname === "/dashboard/applications" || pathname.startsWith("/dashboard/applications/")
                    ? activeClass
                    : ""
                }`}
              >
                My applications
              </Link>
            ) : null}
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
                    <div className="flex items-center gap-2">
                      <Link
                        href="/dashboard/applications"
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                          pathname === "/dashboard/applications"
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                            : "text-neutral-500 hover:bg-neutral-100"
                        }`}
                        data-testid="nav-my-applications"
                      >
                        My applications
                      </Link>
                      <Link
                        href="/dashboard/profile"
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                          pathname === "/dashboard/profile"
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                            : "text-neutral-500 hover:bg-neutral-100"
                        }`}
                      >
                        My Profile
                      </Link>
                    </div>
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

          <button
            type="button"
            className="md:hidden p-2 rounded-lg text-neutral-700 hover:bg-neutral-100"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-menu"
            data-testid="nav-mobile-menu-toggle"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileOpen ? (
          <div
            id="mobile-nav-menu"
            className="md:hidden border-t border-neutral-100 py-4 pb-6"
            data-testid="nav-mobile-menu"
          >
            <Link href="/jobs" onClick={closeMobile} className={navLinkClass(pathname === "/jobs" || pathname.startsWith("/jobs/"))}>
              Find Jobs
            </Link>
            {!loading && user?.role === "candidate" ? (
              <Link
                href="/dashboard/applications"
                onClick={closeMobile}
                data-testid="nav-mobile-my-applications"
                className={navLinkClass(pathname === "/dashboard/applications")}
              >
                My applications
              </Link>
            ) : null}
            <Link href="/talent" onClick={closeMobile} className={navLinkClass(pathname === "/talent")}>
              Find Candidates
            </Link>
            <Link href="/about" onClick={closeMobile} className={navLinkClass(pathname === "/about")}>
              About
            </Link>

            <div className="mt-4 pt-4 border-t border-neutral-100 space-y-2">
              {!loading && user ? (
                <>
                  {user.role === "recruiter" ? (
                    <Link
                      href="/dashboard/company"
                      onClick={closeMobile}
                      className="block w-full text-center py-3 rounded-xl bg-neutral-900 text-white font-bold text-sm"
                    >
                      Recruiter Panel
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/dashboard/applications"
                        onClick={closeMobile}
                        className="block w-full text-center py-3 rounded-xl bg-blue-600 text-white font-bold text-sm"
                      >
                        My applications
                      </Link>
                      <Link
                        href="/dashboard/profile"
                        onClick={closeMobile}
                        className="block w-full text-center py-3 rounded-xl border border-neutral-200 font-bold text-sm text-neutral-800"
                      >
                        My Profile
                      </Link>
                    </>
                  )}
                  <p className="text-xs text-neutral-500 text-center pt-2 truncate px-2">{user.email}</p>
                  <button
                    type="button"
                    onClick={async () => {
                      closeMobile();
                      await logout();
                      router.push("/");
                    }}
                    className="block w-full py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl"
                  >
                    Sign out
                  </button>
                </>
              ) : !loading ? (
                <Link
                  href="/sign-in"
                  onClick={closeMobile}
                  data-testid="nav-mobile-sign-in"
                  className="block w-full text-center py-3 rounded-xl bg-neutral-900 text-white font-bold text-sm"
                >
                  Sign In
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
