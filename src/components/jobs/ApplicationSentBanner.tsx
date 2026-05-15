/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";

type ApplicationSentBannerProps = {
  className?: string;
};

/** Shown after a successful apply; links to the candidate applications dashboard. */
export default function ApplicationSentBanner({ className = "" }: ApplicationSentBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`.trim()}
      data-testid="application-sent-banner"
    >
      <p className="text-sm font-semibold text-emerald-900">Application sent. Track status anytime in My applications.</p>
      <a
        href="/dashboard/applications"
        className="inline-flex items-center justify-center px-4 py-2 bg-emerald-700 text-white rounded-xl text-sm font-bold hover:bg-emerald-800 transition-colors shrink-0"
        data-testid="application-sent-view-mine"
      >
        View my applications
      </a>
    </motion.div>
  );
}
