/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Users, Search, ChevronRight, ArrowRight } from "lucide-react";
import { AppView } from "../../appView";
import { homeContainerVariants, homeItemVariants } from "./homeMotion";

interface HomeAudienceProps {
  onNavigate: (view: AppView) => void;
}

export default function HomeAudience({ onNavigate }: HomeAudienceProps) {
  return (
    <section className="py-24 bg-white" data-testid="home-audience">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">One platform. Two distinct experiences.</h2>
          <p className="mt-4 text-lg text-neutral-600 max-w-2xl mx-auto">
            Whether you're looking for your next challenge or building your dream team, we've got you covered.
          </p>
        </div>

        <motion.div
          variants={homeContainerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 gap-8"
        >
          <motion.div
            variants={homeItemVariants}
            className="group p-8 rounded-3xl bg-neutral-50 border border-neutral-100 hover:border-blue-200 hover:shadow-xl transition-all h-full"
          >
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-4">For Candidates</h3>
            <ul className="space-y-4 mb-8 text-neutral-600">
              <li className="flex items-start gap-3">
                <div className="mt-1 w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <ChevronRight className="w-3 h-3 text-blue-600" />
                </div>
                <span>Create a dynamic profile that showcases your real projects and impact.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <ChevronRight className="w-3 h-3 text-blue-600" />
                </div>
                <span>Get matched with roles that actually fit your skill set and goals.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <ChevronRight className="w-3 h-3 text-blue-600" />
                </div>
                <span>Track your applications in real-time with transparent selection status.</span>
              </li>
            </ul>
            <button
              type="button"
              onClick={() => onNavigate(AppView.MY_PROFILE)}
              className="text-blue-600 font-bold flex items-center gap-2 group-hover:gap-3 transition-all"
            >
              Build your profile <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>

          <motion.div
            variants={homeItemVariants}
            className="group p-8 rounded-3xl bg-neutral-900 text-white hover:shadow-xl transition-all h-full"
          >
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Search className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-4">For Companies</h3>
            <ul className="space-y-4 mb-8 text-neutral-400">
              <li className="flex items-start gap-3">
                <div className="mt-1 w-4 h-4 rounded-full bg-emerald-900 flex items-center justify-center flex-shrink-0">
                  <ChevronRight className="w-3 h-3 text-emerald-500" />
                </div>
                <span>Post vacancy notices that reach a vetted pool of professional candidates.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 w-4 h-4 rounded-full bg-emerald-900 flex items-center justify-center flex-shrink-0">
                  <ChevronRight className="w-3 h-3 text-emerald-500" />
                </div>
                <span>Run end-to-end selections with built-in assessment and feedback tools.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 w-4 h-4 rounded-full bg-emerald-900 flex items-center justify-center flex-shrink-0">
                  <ChevronRight className="w-3 h-3 text-emerald-500" />
                </div>
                <span>Manage team collaboration on every hire in one unified interface.</span>
              </li>
            </ul>
            <button
              type="button"
              onClick={() => onNavigate(AppView.COMPANY_DASHBOARD)}
              className="text-emerald-500 font-bold flex items-center gap-2 group-hover:gap-3 transition-all"
            >
              Get started for business <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
