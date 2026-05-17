"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList, ChevronRight } from "lucide-react";
import { useTalentBridgeUser } from "../../src/lib/useTalentBridgeUser";
import { fetchMyScreenings, type ScreeningInvitationSummary } from "../../src/lib/screeningsApi";
import { screeningInvitationStatusLabel } from "../../src/shared/screeningPilot";

export default function ScreeningsListClientPage() {
  const router = useRouter();
  const { user, loading } = useTalentBridgeUser();
  const [invitations, setInvitations] = useState<ScreeningInvitationSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/sign-in");
    if (!loading && user && user.role !== "candidate") router.replace("/dashboard/company");
  }, [loading, user, router]);

  const load = useCallback(async () => {
    if (!user || user.role !== "candidate") return;
    setListLoading(true);
    try {
      setInvitations(await fetchMyScreenings());
    } finally {
      setListLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !user || user.role !== "candidate") {
    return (
      <motion.div className="pt-24 min-h-screen bg-neutral-50/50 animate-pulse">
        <div className="max-w-3xl mx-auto px-4 h-48 bg-neutral-200 rounded-3xl mt-12" />
      </motion.div>
    );
  }

  const pending = invitations.filter((i) => i.status === "pending");

  return (
    <motion.div className="pt-24 min-h-screen bg-neutral-50/50" data-testid="screenings-page">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/dashboard/applications"
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 mb-8 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          My applications
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Screenings</h1>
          <p className="text-neutral-500 font-medium mt-2">
            Recruiters may invite you to answer lane-specific questions. This pilot covers{" "}
            <span className="font-semibold text-neutral-700">Marketers</span> roles only.
          </p>
        </header>

        {listLoading ? (
          <div className="h-40 bg-white rounded-3xl border border-neutral-100 animate-pulse" />
        ) : invitations.length === 0 ? (
          <motion.div
            className="bg-white rounded-3xl border border-neutral-100 p-12 text-center"
            data-testid="screenings-empty"
          >
            <ClipboardList className="w-10 h-10 text-neutral-300 mx-auto mb-4" />
            <p className="font-bold text-neutral-900 mb-2">No screening invitations yet</p>
            <p className="text-sm text-neutral-500">When a recruiter invites you, it will appear here.</p>
          </motion.div>
        ) : (
          <div className="bg-white rounded-3xl border border-neutral-100 divide-y divide-neutral-50 overflow-hidden">
            {pending.length > 0 ? (
              <p className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border-b border-amber-100">
                {pending.length} awaiting your responses
              </p>
            ) : null}
            {invitations.map((inv) => (
              <Link
                key={inv.id}
                href={`/dashboard/screenings/${encodeURIComponent(inv.id)}`}
                className="flex items-center gap-4 p-6 hover:bg-neutral-50/80 transition-colors group"
                data-testid={`screening-row-${inv.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-black text-neutral-900 truncate">{inv.vacancy.jobTitle}</p>
                  <p className="text-sm text-neutral-500 truncate">{inv.vacancy.companyName}</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    Invited {new Date(inv.invitedAt).toLocaleDateString()} ·{" "}
                    <span className={inv.status === "pending" ? "text-amber-700 font-semibold" : "text-emerald-700 font-semibold"}>
                      {screeningInvitationStatusLabel(inv.status)}
                    </span>
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-neutral-800 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
