/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from "react";
import { Building2, Plus, UserPlus } from "lucide-react";

import {
  createCompany,
  fetchCompanyMembers,
  inviteCompanyMember,
  type CompanyMember,
} from "../../lib/companiesApi";
import { useRecruiterCompanySelection } from "../../lib/recruiterCompanySelection";

function memberRoleLabel(role: string): string {
  if (role === "owner") return "Owner";
  if (role === "manager" || role === "admin") return "Manager";
  return "Recruiter";
}

export default function CompanyWorkspacePanel() {
  const {
    companies,
    loading,
    activeCompanyId,
    activeCompany,
    setActiveCompanyId,
    refreshCompanies,
  } = useRecruiterCompanySelection();

  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const companySelectRef = useRef<HTMLSelectElement>(null);

  const loadMembers = async (companyId: string) => {
    if (!companyId) {
      setMembers([]);
      return;
    }
    setMembersLoading(true);
    try {
      setMembers(await fetchCompanyMembers(companyId));
    } finally {
      setMembersLoading(false);
    }
  };

  React.useEffect(() => {
    void loadMembers(activeCompanyId);
  }, [activeCompanyId]);

  const canInvite =
    activeCompany?.memberRole === "owner" || activeCompany?.memberRole === "manager";

  const handleCreateCompany = async () => {
    const name = newCompanyName.trim();
    if (!name) return;
    setCreating(true);
    setMessage(null);
    const result = await createCompany(name);
    setCreating(false);
    if (!result.ok) {
      setMessage(result.error ?? "Could not create company.");
      return;
    }
    setNewCompanyName("");
    setShowAddCompany(false);
    setMessage(`Created ${result.company?.name ?? name}. You can post a vacancy using the button above.`);
    await refreshCompanies(result.company?.id);
  };

  const handleInvite = async () => {
    const companyId = companySelectRef.current?.value.trim() || activeCompanyId;
    if (!companyId || !inviteEmail.trim()) return;
    setInviting(true);
    setMessage(null);
    const result = await inviteCompanyMember(companyId, inviteEmail.trim());
    setInviting(false);
    if (!result.ok) {
      setMessage(result.error ?? "Could not invite member.");
      return;
    }
    setInviteEmail("");
    setMessage("Team member added.");
    await loadMembers(companyId);
    if (companyId !== activeCompanyId) setActiveCompanyId(companyId);
  };

  return (
    <section
      className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden mb-12"
      data-testid="recruiter-company-workspace"
    >
      <WorkspaceHeader />

      <div className="px-8 py-6 border-b border-neutral-50">
        {loading ? (
          <p className="text-sm text-neutral-500">Loading your companies…</p>
        ) : companies.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Create a company workspace so your team can share vacancies, pipeline, and screening.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Company name"
                className="flex-1 px-4 py-3 rounded-xl border border-neutral-200"
                data-testid="recruiter-company-create-name"
              />
              <button
                type="button"
                onClick={() => void handleCreateCompany()}
                disabled={creating || !newCompanyName.trim()}
                className="px-5 py-3 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-50"
                data-testid="recruiter-company-create-submit"
              >
                {creating ? "Creating…" : "Create company"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wide">
                Active company
              </label>
              <select
                ref={companySelectRef}
                value={activeCompanyId}
                onChange={(e) => setActiveCompanyId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-neutral-200 bg-white text-sm font-semibold min-w-[200px]"
                data-testid="recruiter-company-select"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({memberRoleLabel(c.memberRole)})
                  </option>
                ))}
              </select>
            </div>

            {canInvite ? (
              <InviteRow
                inviteEmail={inviteEmail}
                inviting={inviting}
                onEmailChange={setInviteEmail}
                onInvite={() => void handleInvite()}
              />
            ) : (
              <p className="text-xs text-neutral-500">
                Only owners and managers can invite teammates.
              </p>
            )}

            <p className="text-sm text-neutral-600 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              Posting vacancies for{" "}
              <span className="font-semibold text-neutral-900">{activeCompany?.name ?? "your company"}</span>.
              Use <span className="font-semibold">Post Vacancy</span> at the top of this page.
            </p>

            <div className="pt-2 border-t border-neutral-100">
              {!showAddCompany ? (
                <button
                  type="button"
                  onClick={() => setShowAddCompany(true)}
                  className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700"
                  data-testid="recruiter-company-add-another-toggle"
                >
                  <Plus className="w-4 h-4" />
                  Add another company
                </button>
              ) : (
                <div className="space-y-3 mt-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                    New company
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      placeholder="Company name"
                      className="flex-1 px-4 py-3 rounded-xl border border-neutral-200"
                      data-testid="recruiter-company-create-name"
                    />
                    <button
                      type="button"
                      onClick={() => void handleCreateCompany()}
                      disabled={creating || !newCompanyName.trim()}
                      className="px-5 py-3 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-50"
                      data-testid="recruiter-company-create-submit"
                    >
                      {creating ? "Creating…" : "Create company"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddCompany(false);
                        setNewCompanyName("");
                      }}
                      className="px-5 py-3 rounded-xl bg-neutral-100 text-neutral-700 font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {companies.length > 0 ? (
        <div className="px-8 py-6">
          <h4 className="text-sm font-black text-neutral-900 mb-3">Team members</h4>
          {membersLoading ? (
            <p className="text-sm text-neutral-500">Loading team…</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-neutral-500">No members yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-50" data-testid="recruiter-company-members">
              {members.map((m) => (
                <li key={m.id} className="py-3 flex items-center justify-between gap-4">
                  <span className="font-semibold text-neutral-800">{m.email}</span>
                  <span className="text-[10px] font-black uppercase tracking-wide text-neutral-500 bg-neutral-50 px-2 py-1 rounded-md">
                    {memberRoleLabel(m.memberRole)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {message ? (
        <p className="px-8 pb-6 text-sm text-neutral-600" data-testid="recruiter-company-message">
          {message}
        </p>
      ) : null}
    </section>
  );
}

function WorkspaceHeader() {
  return (
    <div className="px-8 py-6 border-b border-neutral-50">
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="w-5 h-5 text-blue-600" />
        <h3 className="font-black text-neutral-900">Company workspace</h3>
      </div>
      <p className="text-sm text-neutral-500">
        Vacancies you post are tied to the active company below. Teammates on that company share
        pipeline and screening.
      </p>
    </div>
  );
}

function InviteRow(props: {
  inviteEmail: string;
  inviting: boolean;
  onEmailChange: (v: string) => void;
  onInvite: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <input
        type="email"
        value={props.inviteEmail}
        onChange={(e) => props.onEmailChange(e.target.value)}
        placeholder="Recruiter email to add"
        className="flex-1 px-4 py-3 rounded-xl border border-neutral-200"
        data-testid="recruiter-company-invite-email"
      />
      <button
        type="button"
        onClick={props.onInvite}
        disabled={props.inviting || !props.inviteEmail.trim()}
        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-neutral-900 text-white font-bold disabled:opacity-50"
        data-testid="recruiter-company-invite-submit"
      >
        <UserPlus className="w-4 h-4" />
        {props.inviting ? "Adding…" : "Add recruiter"}
      </button>
    </div>
  );
}
