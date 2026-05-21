/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Mail, Eye, Briefcase, ClipboardList, Loader2 } from "lucide-react";
import type { RecruiterBoardApplication } from "../../lib/recruiterApplicationsApi";
import { formatCandidateFullName } from "../../lib/candidateName";
import { applicationStatusLabel } from "../../lib/applicationStatus";
import {
  fetchApplicationPipelineAudit,
  postApplicationNote,
  type ApplicationPipelineAudit,
} from "../../lib/recruiterApplicationsApi";
import {
  fetchScreeningByApplication,
  fetchScreeningDetail,
  inviteToScreening,
  type ScreeningInvitationDetail,
  type ScreeningInvitationSummary,
} from "../../lib/screeningsApi";
import {
  isScreeningEnabledCategorySlug,
  screeningInvitationStatusLabel,
  screeningLaneLabel,
} from "../../shared/screeningPilot";
import { talentBridgeUiNotify } from "../../lib/talentBridgeUiNotify";

type PipelineCandidatePanelProps = {
  row: RecruiterBoardApplication | null;
  onClose: () => void;
  onViewPortfolio: (row: RecruiterBoardApplication) => void;
  onScreeningChange?: () => void;
};

export default function PipelineCandidatePanel({
  row,
  onClose,
  onViewPortfolio,
  onScreeningChange,
}: PipelineCandidatePanelProps) {
  const [screening, setScreening] = useState<ScreeningInvitationSummary | null>(null);
  const [screeningDetail, setScreeningDetail] = useState<ScreeningInvitationDetail | null>(null);
  const [screeningLoading, setScreeningLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [audit, setAudit] = useState<ApplicationPipelineAudit | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  const name = row
    ? formatCandidateFullName(row.candidate.firstName, row.candidate.lastName) || row.candidate.email || "Candidate"
    : "";

  const hasPortfolio = Boolean(row?.candidate.portfolioContent?.trim() || row?.candidate.portfolioUrl?.trim());
  const screeningLane = isScreeningEnabledCategorySlug(row?.vacancy.category?.slug);
  const laneLabel = screeningLaneLabel(row?.vacancy.category?.slug);

  const loadScreening = useCallback(async (applicationId: string) => {
    setScreeningLoading(true);
    try {
      const inv = await fetchScreeningByApplication(applicationId);
      setScreening(inv);
      if (inv?.status === "submitted") {
        setScreeningDetail(await fetchScreeningDetail(inv.id));
      } else {
        setScreeningDetail(null);
      }
    } finally {
      setScreeningLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!row?.id || !screeningLane) {
      setScreening(null);
      setScreeningDetail(null);
      return;
    }
    void loadScreening(row.id);
  }, [row?.id, screeningLane, loadScreening]);

  const loadAudit = useCallback(async (applicationId: string) => {
    setAuditLoading(true);
    try {
      setAudit(await fetchApplicationPipelineAudit(applicationId));
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!row?.id) {
      setAudit(null);
      setNoteText("");
      return;
    }
    void loadAudit(row.id);
  }, [row?.id, loadAudit]);

  const handleAddNote = async () => {
    if (!row || !noteText.trim()) return;
    setNoteSaving(true);
    try {
      const ok = await postApplicationNote(row.id, noteText.trim());
      if (!ok) {
        talentBridgeUiNotify("Could not save note.", "error");
        return;
      }
      setNoteText("");
      await loadAudit(row.id);
    } finally {
      setNoteSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!row) return;
    setInviteLoading(true);
    try {
      const result = await inviteToScreening(row.id);
      if (!result.ok) {
        talentBridgeUiNotify(result.error || "Could not send screening invitation.", "error");
        return;
      }
      talentBridgeUiNotify(
        result.invitation?.status === "submitted"
          ? "Candidate already completed this screening."
          : "Screening invitation sent.",
        result.invitation?.status === "submitted" ? "info" : "success",
      );
      await loadScreening(row.id);
      onScreeningChange?.();
    } finally {
      setInviteLoading(false);
    }
  };

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

              {row.candidate.categoryFieldValues && row.candidate.categoryFieldValues.length > 0 ? (
                <section>
                  <h5 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">Lane profile</h5>
                  <div className="space-y-2">
                    {row.candidate.categoryFieldValues.map((f) => (
                      <div key={f.fieldId} className="text-sm">
                        <p className="font-semibold text-neutral-800">{f.label}</p>
                        <p className="text-neutral-600 whitespace-pre-wrap line-clamp-3">{f.value || "—"}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section
                className="rounded-2xl border border-neutral-100 bg-neutral-50/80 p-4"
                data-testid="recruiter-pipeline-audit"
              >
                <h5 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">
                  Pipeline history
                </h5>
                {auditLoading ? (
                  <p className="text-sm text-neutral-500">Loading history…</p>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto mb-4">
                    {(audit?.statusEvents ?? []).map((e) => (
                      <div key={e.id} className="text-xs text-neutral-600 border-l-2 border-blue-200 pl-3">
                        <p className="font-semibold text-neutral-800">
                          {e.fromStatus
                            ? `${applicationStatusLabel(e.fromStatus)} → ${applicationStatusLabel(e.toStatus)}`
                            : applicationStatusLabel(e.toStatus)}
                        </p>
                        {e.note ? <p className="mt-1 whitespace-pre-wrap">{e.note}</p> : null}
                        <p className="text-neutral-400 mt-1">
                          {e.actorEmail} · {new Date(e.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                    {(audit?.notes ?? []).map((n) => (
                      <div key={n.id} className="text-xs text-neutral-600 border-l-2 border-neutral-300 pl-3">
                        <p className="whitespace-pre-wrap">{n.body}</p>
                        <p className="text-neutral-400 mt-1">
                          Note · {n.authorEmail} · {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                    {!audit?.statusEvents.length && !audit?.notes.length ? (
                      <p className="text-sm text-neutral-500">No history yet.</p>
                    ) : null}
                  </div>
                )}
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add an internal note for your team…"
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm resize-none"
                  data-testid="recruiter-pipeline-note-input"
                />
                <button
                  type="button"
                  onClick={() => void handleAddNote()}
                  disabled={noteSaving || !noteText.trim()}
                  className="mt-2 px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold disabled:opacity-50"
                  data-testid="recruiter-pipeline-note-submit"
                >
                  {noteSaving ? "Saving…" : "Add note"}
                </button>
              </section>

              {screeningLane ? (
                <section
                  className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4"
                  data-testid="recruiter-pipeline-screening"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardList className="w-4 h-4 text-violet-700" />
                    <h5 className="text-xs font-bold uppercase tracking-widest text-violet-800">
                      {laneLabel} screening
                    </h5>
                  </div>
                  {screeningLoading ? (
                    <p className="text-sm text-neutral-500 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                    </p>
                  ) : screening ? (
                    <motion.div className="space-y-3">
                      <p className="text-sm font-semibold text-neutral-800">
                        {screeningInvitationStatusLabel(screening.status)}
                      </p>
                      {screening.status === "submitted" && screeningDetail?.answers.length ? (
                        <div className="space-y-3 max-h-48 overflow-y-auto">
                          {screeningDetail.answers.map((a) => (
                            <div key={a.questionId} className="text-sm">
                              <p className="font-semibold text-neutral-800 mb-1">{a.prompt}</p>
                              <p className="text-neutral-600 whitespace-pre-wrap line-clamp-4">{a.answerText}</p>
                            </div>
                          ))}
                        </div>
                      ) : screening.status === "pending" ? (
                        <p className="text-sm text-neutral-600">Waiting for the candidate to submit responses.</p>
                      ) : null}
                    </motion.div>
                  ) : (
                    <p className="text-sm text-neutral-600 mb-3">
                      Send async screening questions for this {laneLabel} role.
                    </p>
                  )}
                  {!screening && !screeningLoading ? (
                    <button
                      type="button"
                      onClick={() => void handleInvite()}
                      disabled={inviteLoading}
                      className="w-full py-2.5 bg-violet-700 text-white rounded-xl text-sm font-bold hover:bg-violet-800 disabled:opacity-60"
                      data-testid="recruiter-pipeline-invite-screening"
                    >
                      {inviteLoading ? "Sending…" : "Invite to screening"}
                    </button>
                  ) : null}
                </section>
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
