/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClipboardList } from "lucide-react";
import type { ScreeningMatrix } from "../../lib/screeningsApi";
import { screeningInvitationStatusLabel } from "../../shared/screeningPilot";

function shortPrompt(prompt: string, max = 48): string {
  const t = prompt.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

function cellDisplay(
  screeningStatus: ScreeningMatrix["rows"][0]["screeningStatus"],
  answer: string | null | undefined,
): { text: string; className: string } {
  if (screeningStatus === "not_invited") {
    return { text: "—", className: "text-neutral-300" };
  }
  if (screeningStatus === "pending") {
    return { text: "Awaiting", className: "text-amber-600 italic font-medium" };
  }
  if (answer?.trim()) {
    return { text: answer.trim(), className: "text-neutral-800" };
  }
  return { text: "—", className: "text-neutral-300" };
}

function screeningStatusLabel(status: ScreeningMatrix["rows"][0]["screeningStatus"]): string {
  if (status === "not_invited") return "Not invited";
  if (status === "pending") return screeningInvitationStatusLabel("pending");
  return screeningInvitationStatusLabel("submitted");
}

export type MarketersScreeningMatrixProps = {
  matrix: ScreeningMatrix;
  loading?: boolean;
  vacancyFilter: string;
  marketerVacancies: { id: string; jobTitle: string }[];
  onVacancyFilterChange: (vacancyId: string) => void;
  onRefresh: () => void;
  onSelectApplicant?: (applicationId: string) => void;
};

export default function MarketersScreeningMatrix({
  matrix,
  loading,
  vacancyFilter,
  marketerVacancies,
  onVacancyFilterChange,
  onRefresh,
  onSelectApplicant,
}: MarketersScreeningMatrixProps) {
  const { questions, rows } = matrix;

  return (
    <div
      className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-8 mb-12"
      data-testid="recruiter-screening-matrix-section"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-xl">
            <ClipboardList className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-black text-neutral-900">Marketers screening responses</h3>
            <p className="text-sm text-neutral-500">
              All applicants on Marketers roles — blank cells until invited or answered.
            </p>
            {!loading ? (
              <p className="text-xs font-bold text-neutral-400 mt-2" data-testid="recruiter-screening-matrix-count">
                {rows.length} applicant{rows.length === 1 ? "" : "s"} · {questions.length} question
                {questions.length === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={vacancyFilter}
            onChange={(e) => onVacancyFilterChange(e.target.value)}
            aria-label="Filter screening matrix by job"
            data-testid="recruiter-screening-matrix-vacancy-filter"
            className="px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-sm font-semibold outline-none max-w-[220px]"
          >
            <option value="">All Marketers jobs</option>
            {marketerVacancies.map((v) => (
              <option key={v.id} value={v.id}>
                {v.jobTitle}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-2 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-600 hover:bg-neutral-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-10 bg-neutral-100 rounded-xl" />
          <div className="h-10 bg-neutral-100 rounded-xl" />
        </div>
      ) : questions.length === 0 ? (
        <p className="text-sm text-neutral-500">Screening questions are not configured.</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-neutral-500 py-8 text-center" data-testid="recruiter-screening-matrix-empty">
          No applications on Marketers vacancies yet. When candidates apply, they will appear here.
        </p>
      ) : (
        <div className="overflow-x-auto border border-neutral-100 rounded-2xl" data-testid="recruiter-screening-matrix-table">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-xs font-bold text-neutral-400 uppercase tracking-wider bg-neutral-50/80 border-b border-neutral-100">
                <th className="p-3 pr-4 sticky left-0 z-10 bg-neutral-50/95 min-w-[160px]">Candidate</th>
                <th className="p-3 pr-4 min-w-[120px]">Job</th>
                <th className="p-3 pr-4 min-w-[100px]">Screening</th>
                {questions.map((q, i) => (
                  <th
                    key={q.id}
                    className="p-3 pr-4 min-w-[180px] max-w-[240px] font-bold text-violet-800 normal-case"
                    title={q.prompt}
                  >
                    <span className="text-[10px] uppercase tracking-widest text-violet-500 block mb-0.5">
                      Q{i + 1}
                    </span>
                    <span className="text-xs text-neutral-600 font-semibold leading-snug line-clamp-2">
                      {shortPrompt(q.prompt, 56)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {rows.map((row) => (
                <tr key={row.applicationId} className="hover:bg-neutral-50/50 align-top group">
                  <td className="p-3 pr-4 sticky left-0 z-[1] bg-white group-hover:bg-neutral-50/50 border-r border-neutral-50">
                    {onSelectApplicant ? (
                      <button
                        type="button"
                        onClick={() => onSelectApplicant(row.applicationId)}
                        className="text-left font-bold text-neutral-900 hover:text-blue-600"
                        data-testid={`screening-matrix-candidate-${row.applicationId}`}
                      >
                        {row.candidateName}
                      </button>
                    ) : (
                      <span className="font-bold text-neutral-900">{row.candidateName}</span>
                    )}
                    {row.candidateEmail ? (
                      <div className="text-xs text-neutral-500 truncate max-w-[180px]">{row.candidateEmail}</div>
                    ) : null}
                  </td>
                  <td className="p-3 pr-4 text-neutral-700 font-medium">{row.jobTitle}</td>
                  <td className="p-3 pr-4">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        row.screeningStatus === "submitted"
                          ? "bg-emerald-50 text-emerald-800"
                          : row.screeningStatus === "pending"
                            ? "bg-amber-50 text-amber-800"
                            : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {screeningStatusLabel(row.screeningStatus)}
                    </span>
                  </td>
                  {questions.map((q) => {
                    const cell = cellDisplay(row.screeningStatus, row.answersByQuestionId[q.id]);
                    return (
                      <td key={q.id} className="p-3 pr-4 max-w-[280px]">
                        <p
                          className={`text-sm whitespace-pre-wrap line-clamp-4 ${cell.className}`}
                          title={cell.text === "—" || cell.text === "Awaiting" ? undefined : cell.text}
                          data-testid={`screening-matrix-cell-${row.applicationId}-${q.id}`}
                        >
                          {cell.text}
                        </p>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
