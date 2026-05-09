/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { TrendingUp, FileCheck, ArrowRight } from "lucide-react";
import { AppView } from "../../appView";

interface HomeHeroProps {
  onNavigate: (view: AppView) => void;
}

export default function HomeHero({ onNavigate }: HomeHeroProps) {
  return (
    <section
      id="hero"
      className="relative pt-32 pb-20 overflow-hidden"
      data-testid="home-hero"
      aria-labelledby="home-hero-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold mb-6">
              <TrendingUp className="w-3 h-3" />
              <span>Next-Gen Recruitment Platform</span>
            </div>
            <h1
              id="home-hero-heading"
              className="text-5xl md:text-6xl font-bold leading-tight mb-6 tracking-tight"
            >
              Where Elite <span className="text-blue-600">Talent</span> Meets Exceptional{" "}
              <span className="text-neutral-400">Teams</span>.
            </h1>
            <p className="text-lg text-neutral-600 mb-8 leading-relaxed">
              TalentBridge streamlines the entire hiring lifecycle. From stunning candidate profiles to sophisticated
              selection workflows for companies.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => onNavigate(AppView.MY_PROFILE)}
                className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                Join as Candidate <ArrowRight className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate(AppView.COMPANY_DASHBOARD)}
                className="bg-white border border-neutral-200 text-neutral-900 px-8 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-neutral-50 transition-all"
              >
                Recruiter Dashboard
              </button>
            </div>

            <div className="mt-10 flex items-center gap-4 text-sm text-neutral-500">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <img
                    key={i}
                    src={`https://picsum.photos/seed/${i + 10}/100/100`}
                    className="w-8 h-8 rounded-full border-2 border-white"
                    aria-hidden="true"
                    referrerPolicy="no-referrer"
                    alt=""
                  />
                ))}
              </div>
              <span>
                Trusted by <span className="font-bold text-neutral-900">500+</span> industry leaders
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-6 border border-neutral-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <FileCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">Candidate Selection</div>
                    <div className="text-xs text-neutral-400">Reviewing: Senior Product Designer</div>
                  </div>
                </div>
                <div className="text-xs font-semibold px-2 py-1 bg-yellow-50 text-yellow-700 rounded">
                  Analysis in Progress
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { name: "Sarah Jenkins", score: 92, status: "Interview" },
                  { name: "Michael Chen", score: 88, status: "Shortlisted" },
                  { name: "Alex Rivera", score: 85, status: "Assessment" },
                ].map((candidate, idx) => (
                  <div
                    key={candidate.name}
                    className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-100"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={`https://picsum.photos/seed/${idx * 5}/40/40`}
                        className="w-8 h-8 rounded-full bg-neutral-200"
                        referrerPolicy="no-referrer"
                        alt=""
                      />
                      <span className="text-sm font-medium">{candidate.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-mono font-bold text-blue-600">{candidate.score}% Match</span>
                      <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-400">{candidate.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-50" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-100 rounded-full blur-3xl opacity-50" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
