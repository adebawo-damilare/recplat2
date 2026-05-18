/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useState } from "react";
import { BellRing, ClipboardCopy, RefreshCw } from "lucide-react";

import {
  SCREENING_ENABLED_CATEGORY_SLUGS,
  screeningLaneLabel,
  type ScreeningEnabledCategorySlug,
} from "../../shared/screeningPilot";
import type { ScreeningFollowUpItem } from "../../lib/screeningsApi";

const KIND_LABEL: Record<ScreeningFollowUpItem["kind"], string> = {
  needs_invite: "Send invite",
  awaiting_candidate: "Awaiting candidate",
  awaiting_review: "Review responses",
};

const KIND_STYLE: Record<ScreeningFollowUpItem["kind"], string> = {
  needs_invite: "bg-amber-50 text-amber-800 border-amber-100",
  awaiting_candidate: "bg-sky-50 text-sky-800 border-sky-100",
  awaiting_review: "bg-emerald-50 text-emerald-800 border-emerald-100",
};

type Props = {
  items: ScreeningFollowUpItem[];
  loading: boolean;
  laneFilter: ScreeningEnabledCategorySlug | "";
  onLaneFilterChange: (slug: ScreeningEnabledCategorySlug | "") => void;
  onRefresh: () => void;
  onOpenApplicant: (applicationId: string) => void;
};

export default function RecruiterScreeningFollowUp({
  items,
  loading,
  laneFilter,
  onLaneFilterChange,
  onRefresh,
  onOpenApplicant,
}: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyReminder = useCallback(async (item: ScreeningFollowUpItem) => {
    const key = item.invitationId ?? item.applicationId;
    try {
      await navigator.clipboard.writeText(item.reminderText);
      setCopiedId(key);
      window.setTimeout(() => setCopiedId((cur) => (cur === key ? null : cur)), 2000);
    } catch {
      setCopiedId(null);
    }
  }, []);

  return (
    <section
      className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden mb-12"
      data-testid="recruiter-screening-follow-up"
    >
      <div className="px-8 py-6 border-b border-neutral-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BellRing className="w-5 h-5 text-blue-600" />
            <h3 className="font-black text-neutral-900">Screening follow-up</h3>
          </div>
          <p className="text-sm text-neutral-500">
            Pending invites, candidate nudges, and submissions awaiting your review.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 text-sm font-bold hover:bg-neutral-50 disabled:opacity-50"
          data-testid="recruiter-follow-up-refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <LaneFilterRow laneFilter={laneFilter} onLaneFilterChange={onLaneFilterChange} />

      {loading ? (
        <div className="px-8 py-10 text-sm text-neutral-500">Loading follow-up queue…</div>
      ) : items.length === 0 ? (
        <div className="px-8 py-12 text-center text-sm text-neutral-500">
          No screening follow-ups right now. Applicants on Marketers, Designers, or Sales lanes will
          appear here when they need an invite, a reminder, or your review.
        </div>
      ) : (
        <ul className="divide-y divide-neutral-50">
          {items.map((item) => {
            const rowKey = item.invitationId ?? item.applicationId;
            const copied = copiedId === rowKey;
            return (
              <li key={rowKey} className="px-8 py-5 flex flex-col md:flex-row md:items-start gap-4">
                <span
                  className={`self-start px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border ${KIND_STYLE[item.kind]}`}
                >
                  {KIND_LABEL[item.kind]}
                </span>
                <FollowUpRowBody item={item} />
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void copyReminder(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 text-xs font-bold hover:bg-neutral-50"
                    data-testid={`recruiter-follow-up-copy-${rowKey}`}
                  >
                    <ClipboardCopy className="w-3.5 h-3.5" />
                    {copied ? "Copied" : "Copy nudge"}
                  </button>
                  {item.linkPath ? (
                    <a
                      href={item.linkPath}
                      className="px-3 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800"
                    >
                      Open screening
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenApplicant(item.applicationId)}
                      className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                      data-testid={`recruiter-follow-up-open-${item.applicationId}`}
                    >
                      {item.kind === "needs_invite" ? "Invite in pipeline" : "View in pipeline"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function LaneFilterRow(props: {
  laneFilter: ScreeningEnabledCategorySlug | "";
  onLaneFilterChange: (slug: ScreeningEnabledCategorySlug | "") => void;
}) {
  return (
    <div className="px-8 py-4 border-b border-neutral-50 flex flex-wrap items-center gap-3">
      <label className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Lane</label>
      <select
        value={props.laneFilter}
        onChange={(e) =>
          props.onLaneFilterChange((e.target.value || "") as ScreeningEnabledCategorySlug | "")
        }
        className="px-3 py-2 rounded-xl border border-neutral-200 bg-white text-sm font-semibold"
        data-testid="recruiter-follow-up-lane-filter"
      >
        <option value="">All screening lanes</option>
        {SCREENING_ENABLED_CATEGORY_SLUGS.map((slug) => (
          <option key={slug} value={slug}>
            {screeningLaneLabel(slug)}
          </option>
        ))}
      </select>
    </div>
  );
}

function FollowUpRowBody({ item }: { item: ScreeningFollowUpItem }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="font-bold text-neutral-900">{item.candidateName}</div>
      {item.candidateEmail ? (
        <div className="text-xs text-neutral-500 truncate">{item.candidateEmail}</div>
      ) : null}
      <div className="text-sm font-semibold text-neutral-700 mt-1">
        {item.jobTitle}
        {item.companyName ? (
          <span className="text-neutral-400 font-medium"> · {item.companyName}</span>
        ) : null}
      </div>
      <p className="text-sm text-neutral-600 mt-2 line-clamp-3">{item.reminderText}</p>
    </div>
  );
}
