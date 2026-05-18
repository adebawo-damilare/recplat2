/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from "react";
import { Building2, UserPlus } from "lucide-react";

import {
  createCompany,
  fetchCompanyMembers,
  fetchMyCompanies,
  inviteCompanyMember,
  type CompanyMember,
  type CompanySummary,
} from "../../lib/companiesApi";

export default function CompanyWorkspacePanel() {
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchMyCompanies();
      setCompanies(list);
      setActiveCompanyId((prev) => {
        if (prev && list.some((c) => c.id === prev)) return prev;
        return list[0]?.id ?? "";
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  const loadMembers = useCallback(async (companyId: string) => {
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
  }, []);

  useEffect(() => {
    void loadMembers(activeCompanyId);
  }, [activeCompanyId, loadMembers]);

  const activeCompany = companies.find((c) => c.id === activeCompanyId) ?? null;
  const canInvite =
    activeCompany?.memberRole === "owner" || activeCompany?.memberRole === "admin";

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
    setMessage(`Created ${result.company?.name ?? name}.`);
    await loadCompanies();
    if (result.company?.id) setActiveCompanyId(result.company.id);
  };

  const handleInvite = async () => {
    if (!activeCompanyId || !inviteEmail.trim()) return;
    setInviting(true);
    setMessage(null);
    const result = await inviteCompanyMember(activeCompanyId, inviteEmail.trim());
    setInviting(false);
    if (!result.ok) {
      setMessage(result.error ?? "Could not invite member.");
      return;
    }
    setInviteEmail("");
    setMessage("Team member added.");
    await loadMembers(activeCompanyId);
  };

  return (
    <section
      className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden mb-12"
      data-testid="recruiter-company-workspace"
    >
      <div className="px-8 py-6 border-b border-neutral-50">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h3 className="font-black text-neutral-900">Company workspace</h3>
        </div>
        <p className="text-sm text-neutral-500">
          Team members share access to vacancies, pipeline, and screening for each company.
        </p>
      </div>

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
                value={activeCompanyId}
                onChange={(e) => setActiveCompanyId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-neutral-200 bg-white text-sm font-semibold min-w-[200px]"
                data-testid="recruiter-company-select"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.memberRole})
                  </option>
                ))}
              </select>
            </div>

            {canInvite ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Recruiter email to add"
                  className="flex-1 px-4 py-3 rounded-xl border border-neutral-200"
                  data-testid="recruiter-company-invite-email"
                />
                <button
                  type="button"
                  onClick={() => void handleInvite()}
                  disabled={inviting || !inviteEmail.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-neutral-900 text-white font-bold disabled:opacity-50"
                  data-testid="recruiter-company-invite-submit"
                >
                  <UserPlus className="w-4 h-4" />
                  {inviting ? "Adding…" : "Add recruiter"}
                </button>
              </div>
            ) : (
              <p className="text-xs text-neutral-500">
                Only owners and admins can invite teammates.
              </p>
            )}
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
                    {m.memberRole}
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
