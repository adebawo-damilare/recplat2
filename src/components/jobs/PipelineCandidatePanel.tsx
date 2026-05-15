/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { X, Mail, Eye, Briefcase } from "lucide-react";
import type { RecruiterBoardApplication } from "../../lib/recruiterApplicationsApi";
import { formatCandidateFullName } from "../../lib/candidateName";
import { applicationStatusLabel } from "../../lib/applicationStatus";

type PipelineCandidatePanelProps = {
  row: RecruiterBoardApplication | null;
  onClose: () => void;
  onViewPortfolio: (row: RecruiterBoardApplication) => void;
};

export default function PipelineCandidatePanel({ row, onClose, onViewPortfolio }: PipelineCandidatePanelProps) {
  const name = row
    ? formatCandidateFullName(row.candidate.firstName, row.candidate.lastName) || row.candidate.email || "Candidate"
    : "";

  const hasPortfolio = Boolean(row?.candidate.portfolioContent?.trim() || row?.candidate.portfolioUrl?.trim());

  return (
    <AnimatePresence>
      {row ? (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[105] bg-neutral-900/40 backdrop-blur-sm"
            aria-label="Close candidate profile"
            onClick={onClose}
          />
          <motion.aside
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            className="fixed top-0 right-0 z-[110] h-full w-full max-w-md bg-white shadow-2xl border-l border-neutral-100 flex flex-col"
            data-testid="recruiter-pipeline-candidate-panel"
          >
            <motion.div className="flex items-start justify-between gap-4 p-6 border-b border-neutral-100">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-1">Applicant</p>
                <h4 className="text-xl font-black text-neutral-900 truncate">{name}</h4>
                {row.candidate.headline ? (
                  <p className="text-sm text-neutral-600 mt-1">{row.candidate.headline}</p>
                ) : null}
                <p className="text-xs text-neutral-500 mt-2 truncate">{row.candidate.email}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-500"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="rounded-2xl bg-neutral-50 border border-neutral-100 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Applied for</p>
                <a
                  href={`/jobs/${encodeURIComponent(row.vacancy.id)}`}
                  className="font-bold text-blue-600 hover:underline"
                >
                  {row.vacancy.jobTitle}
                </a>
                <p className="text-sm text-neutral-500 mt-1">{row.vacancy.companyName}</p>
                <p className="text-xs text-neutral-500 mt-3">
                  Stage: <span className="font-semibold text-neutral-800">{applicationStatusLabel(row.status)}</span>
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  Applied {new Date(row.appliedAt).toLocaleDateString()}
                </p>
              </div>

              {row.candidate.summary ? (
                <section>
                  <h5 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">Summary</h5>
                  <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap line-clamp-6">
                    {row.candidate.summary}
                  </p>
                </section>
              ) : null}

              {row.candidate.skills ? (
                <section>
                  <h5 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">Skills</h5>
                  <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap line-clamp-4">
                    {row.candidate.skills}
                  </p>
                </section>
              ) : null}

              {row.candidate.experience ? (
                <section>
                  <h5 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">Experience</h5>
                  <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap line-clamp-6">
                    {row.candidate.experience}
                  </p>
                </section>
              ) : null}

              {!row.candidate.summary && !row.candidate.skills && !row.candidate.experience && !hasPortfolio ? (
                <p className="text-sm text-neutral-500">This candidate has not completed a detailed profile yet.</p>
              ) : null}
            </div>

            <div className="p-6 border-t border-neutral-100 flex flex-col gap-2">
              {hasPortfolio ? (
                <button
                  type="button"
                  onClick={() => onViewPortfolio(row)}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 flex items-center justify-center gap-2"
                  data-testid="recruiter-pipeline-view-portfolio"
                >
                  <Eye className="w-4 h-4" /> View portfolio
                </button>
              ) : (
                <p className="text-xs text-center text-neutral-400 font-medium flex items-center justify-center gap-1">
                  <Briefcase className="w-3 h-3" /> No portfolio on file
                </p>
              )}
              <a
                href={`mailto:${row.candidate.email}`}
                className="w-full py-3 border border-neutral-200 rounded-xl font-bold text-sm text-neutral-800 hover:bg-neutral-50 flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" /> Email candidate
              </a>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
