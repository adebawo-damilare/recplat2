/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Briefcase, LogOut, User as UserIcon, Plus } from "lucide-react";
import type { User } from "firebase/auth";
import { AppView } from "../../appView";

interface AppNavProps {
  currentView: AppView;
  user: User | null;
  onNavigate: (view: AppView) => void;
  onAuthAction: () => void | Promise<void>;
}

export default function AppNav({ currentView, user, onNavigate, onAuthAction }: AppNavProps) {
  return (
    <nav
      className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-neutral-200"
      data-testid="app-nav"
      aria-label="Primary"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => onNavigate(AppView.HOME)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onNavigate(AppView.HOME);
              }
            }}
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-neutral-900">TalentBridge</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600">
            <button
              type="button"
              onClick={() => onNavigate(AppView.FIND_JOBS)}
              className={`hover:text-blue-600 transition-colors ${currentView === AppView.FIND_JOBS ? "text-blue-600" : ""}`}
            >
              Find Jobs
            </button>
            <button
              type="button"
              data-testid="nav-find-candidates"
              onClick={() => onNavigate(AppView.FIND_TALENT)}
              className={`hover:text-blue-600 transition-colors ${currentView === AppView.FIND_TALENT ? "text-blue-600" : ""}`}
            >
              Find Candidates
            </button>
            <a href="#" className="hover:text-blue-600 transition-colors">
              About
            </a>

            <div className="flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => onNavigate(AppView.COMPANY_DASHBOARD)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                      currentView === AppView.COMPANY_DASHBOARD
                        ? "bg-neutral-900 text-white shadow-lg"
                        : "text-neutral-500 hover:bg-neutral-100"
                    }`}
                  >
                    Recruiter Panel
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate(AppView.MY_PROFILE)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                      currentView === AppView.MY_PROFILE
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                        : "text-neutral-500 hover:bg-neutral-100"
                    }`}
                  >
                    My Profile
                  </button>
                  <div className="flex items-center gap-2 px-3 py-1 bg-neutral-100 rounded-full">
                    <UserIcon className="w-4 h-4 text-neutral-500" />
                    <span className="text-xs font-bold truncate max-w-[100px]">{user.displayName || user.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onAuthAction()}
                    className="text-neutral-400 hover:text-red-500 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  data-testid="nav-sign-in"
                  onClick={() => void onAuthAction()}
                  className="bg-neutral-900 text-white px-5 py-2 rounded-full hover:bg-neutral-800 transition-colors"
                >
                  Sign In
                </button>
              )}
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
