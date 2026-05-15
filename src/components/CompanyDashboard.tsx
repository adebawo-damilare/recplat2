/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Briefcase, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  MapPin, 
  Users, 
  TrendingUp,
  Clock,
  ChevronRight,
  Search,
  LayoutDashboard,
  ListOrdered,
} from "lucide-react";
import type { Application, Vacancy } from "../lib/domainTypes";
import { fetchMyVacanciesWithFallback, closeVacancyWithFallback } from "../lib/jobsApi";
import {
  fetchRecruiterApplicationBoard,
  patchApplicationStatus,
  type RecruiterBoardApplication,
} from "../lib/recruiterApplicationsApi";
import { useTalentBridgeUser } from "../lib/useTalentBridgeUser";
import { formatCandidateFullName } from "../lib/candidateName";
import { jobTypeLabel } from "../shared/jobTypes";
import VacancyForm from './VacancyForm';

const PIPELINE_STATUSES: Application["status"][] = ["applied", "viewed", "interviewing", "rejected", "hired"];

const PIPELINE_STATUS_LABELS: Record<Application["status"], string> = {
  applied: "Applied",
  viewed: "Viewed",
  interviewing: "Interviewing",
  rejected: "Rejected",
  hired: "Hired",
};

function vacancyMatchesSearch(v: Vacancy, qRaw: string): boolean {
  const q = qRaw.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    v.jobTitle,
    v.companyName,
    v.location,
    v.salary,
    v.status,
    v.category?.label ?? "",
    v.description,
    v.requirements,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export default function CompanyDashboard() {
  const { user } = useTalentBridgeUser();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [vacancySearchQuery, setVacancySearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState<Vacancy | null>(null);
  const [roleEmail, setRoleEmail] = useState("");
  const [roleValue, setRoleValue] = useState<"candidate" | "recruiter">("recruiter");
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleResult, setRoleResult] = useState<string | null>(null);
  const [pipelineRows, setPipelineRows] = useState<RecruiterBoardApplication[]>([]);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineVacancyFilter, setPipelineVacancyFilter] = useState("");
  const [pipelineStatusFilter, setPipelineStatusFilter] = useState("");
  const [pipelineLaneFilter, setPipelineLaneFilter] = useState("");

  const fetchDataForUser = useCallback(async () => {
    if (!user) {
      setVacancies([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchMyVacanciesWithFallback();
      setVacancies(data || []);
    } catch (error) {
      console.error("Error fetching vacancies", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchDataForUser();
  }, [fetchDataForUser]);

  const fetchPipelineBoard = useCallback(async () => {
    if (!user || user.role !== "recruiter") {
      setPipelineRows([]);
      return;
    }
    setPipelineLoading(true);
    try {
      const data = await fetchRecruiterApplicationBoard({
        vacancyId: pipelineVacancyFilter.trim() || undefined,
        status: (pipelineStatusFilter.trim() || "all") as Application["status"] | "all",
        category: pipelineLaneFilter.trim() || "all",
      });
      setPipelineRows(data);
    } catch (e) {
      console.error("Pipeline board load failed", e);
      setPipelineRows([]);
    } finally {
      setPipelineLoading(false);
    }
  }, [user, pipelineVacancyFilter, pipelineStatusFilter, pipelineLaneFilter]);

  const pipelineLaneOptions = useMemo(() => {
    const bySlug = new Map<string, string>();
    for (const v of vacancies) {
      if (v.category?.slug && v.category?.label) {
        bySlug.set(v.category.slug, v.category.label);
      }
    }
    return Array.from(bySlug.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [vacancies]);

  const pipelineFiltersActive = Boolean(
    pipelineVacancyFilter.trim() || pipelineStatusFilter.trim() || pipelineLaneFilter.trim(),
  );

  useEffect(() => {
    void fetchPipelineBoard();
  }, [fetchPipelineBoard]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to close this vacancy?")) return;
    try {
      await closeVacancyWithFallback(id);
      await fetchDataForUser();
      await fetchPipelineBoard();
    } catch (error) {
      console.error("Error deleting vacancy", error);
    }
  };

  const handleEdit = (vacancy: Vacancy) => {
    setEditingVacancy(vacancy);
    setShowForm(true);
  };

  const activeCount = vacancies.filter((v) => v.status === "open").length;

  const filteredVacancies = useMemo(
    () => vacancies.filter((v) => vacancyMatchesSearch(v, vacancySearchQuery)),
    [vacancies, vacancySearchQuery],
  );

  const handlePipelineStatusChange = async (
    applicationId: string,
    previous: Application["status"],
    next: Application["status"],
  ) => {
    const ok = await patchApplicationStatus(applicationId, next);
    await fetchPipelineBoard();
    if (!ok) {
      console.warn("[pipeline] status update failed", { applicationId, previous, next });
    }
  };

  const handleRoleUpdate = async () => {
    if (!roleEmail.trim()) return;
    setRoleSaving(true);
    setRoleResult(null);
    try {
      const res = await fetch("/api/admin/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: roleEmail.trim(), role: roleValue }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        changed?: boolean;
        user?: { email: string; role: string };
      };
      if (!res.ok) {
        setRoleResult(body.error || "Unable to update role.");
        return;
      }
      if (body.changed) {
        setRoleResult(`Updated ${body.user?.email ?? roleEmail} to ${body.user?.role ?? roleValue}.`);
      } else {
        setRoleResult(`No change needed for ${body.user?.email ?? roleEmail}.`);
      }
      setRoleEmail("");
    } catch (error) {
      console.error("Role update failed", error);
      setRoleResult("Unable to update role right now.");
    } finally {
      setRoleSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 sm:p-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-xl">
              <LayoutDashboard className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-3xl font-black text-neutral-900 tracking-tight">Recruiter Dashboard</h2>
          </div>
          <p className="text-neutral-500 font-medium">Manage your job listings and track candidate interest</p>
        </div>
        <button
          type="button"
          data-testid="recruiter-post-vacancy-open"
          onClick={() => {
            setEditingVacancy(null);
            setShowForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> Post Vacancy
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm relative overflow-hidden group">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 rounded-2xl group-hover:scale-110 transition-transform">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Active Jobs</span>
          </div>
          <div className="text-4xl font-black text-neutral-900">{activeCount}</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm relative overflow-hidden group">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-50 rounded-2xl group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Total Reach</span>
          </div>
          <div className="text-4xl font-black text-neutral-900">1.2k</div>
          <div className="mt-2 flex items-center gap-1 text-emerald-600 font-bold text-sm">
            <TrendingUp className="w-4 h-4" /> +12% this month
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm relative overflow-hidden group">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-neutral-50 rounded-2xl group-hover:scale-110 transition-transform">
              <Eye className="w-6 h-6 text-neutral-600" />
            </div>
            <span className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Avg. Views</span>
          </div>
          <div className="text-4xl font-black text-neutral-900">42</div>
        </div>
      </div>

      {/* Application pipeline */}
      <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-8 mb-12" data-testid="recruiter-pipeline-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-xl">
              <ListOrdered className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="font-black text-neutral-900">Application pipeline</h3>
              <p className="text-sm text-neutral-500">Track candidates who applied to your listings and move them through stages.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={pipelineStatusFilter}
              onChange={(e) => setPipelineStatusFilter(e.target.value)}
              aria-label="Filter by application stage"
              data-testid="recruiter-pipeline-status-filter"
              className="px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-sm font-semibold outline-none"
            >
              <option value="">All stages</option>
              {PIPELINE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PIPELINE_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              value={pipelineLaneFilter}
              onChange={(e) => setPipelineLaneFilter(e.target.value)}
              aria-label="Filter by talent lane"
              data-testid="recruiter-pipeline-lane-filter"
              className="px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-sm font-semibold outline-none"
              disabled={pipelineLaneOptions.length === 0}
            >
              <option value="">All lanes</option>
              {pipelineLaneOptions.map(([slug, label]) => (
                <option key={slug} value={slug}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={pipelineVacancyFilter}
              onChange={(e) => setPipelineVacancyFilter(e.target.value)}
              aria-label="Filter by job"
              data-testid="recruiter-pipeline-vacancy-filter"
              className="px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-sm font-semibold outline-none"
            >
              <option value="">All jobs</option>
              {vacancies
                .filter((v) => v.id)
                .map((v) => (
                  <option key={v.id} value={v.id!}>
                    {v.jobTitle}
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={() => void fetchPipelineBoard()}
              className="px-3 py-2 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-600 hover:bg-neutral-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {pipelineLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-10 bg-neutral-100 rounded-xl" />
            <div className="h-10 bg-neutral-100 rounded-xl" />
            <div className="h-10 bg-neutral-100 rounded-xl" />
          </div>
        ) : pipelineRows.length === 0 ? (
          <div className="py-10 text-center" data-testid="recruiter-pipeline-empty">
            <p className="text-sm font-semibold text-neutral-700 mb-1">
              {pipelineFiltersActive ? "No applications match these filters" : "No applications yet"}
            </p>
            <p className="text-sm text-neutral-500 max-w-md mx-auto">
              {pipelineFiltersActive
                ? "Try clearing stage, lane, or job filters to see more candidates."
                : "When candidates apply to your open listings, they will appear here so you can move them through stages."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto" data-testid="recruiter-pipeline-table">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100">
                  <th className="pb-3 pr-4">Candidate</th>
                  <th className="pb-3 pr-4">Job</th>
                  <th className="pb-3 pr-4">Applied</th>
                  <th className="pb-3">Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {pipelineRows.map((row) => (
                  <tr key={row.id} className="hover:bg-neutral-50/80">
                    <td className="py-3 pr-4 align-top">
                      <div className="font-bold text-neutral-900">
                        {formatCandidateFullName(row.candidate.firstName, row.candidate.lastName) || "(No profile)"}
                      </div>
                      <div className="text-xs text-neutral-500 truncate max-w-[200px]">{row.candidate.email}</div>
                      {row.candidate.headline ? (
                        <div className="text-xs text-neutral-400 mt-0.5 line-clamp-2">{row.candidate.headline}</div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      <a
                        href={`/jobs/${encodeURIComponent(row.vacancy.id)}`}
                        className="font-semibold text-blue-600 hover:underline"
                        data-testid={`recruiter-pipeline-job-link-${row.vacancyId}`}
                      >
                        {row.vacancy.jobTitle}
                      </a>
                      <div className="text-xs text-neutral-500">{row.vacancy.companyName}</div>
                      {row.vacancy.category?.label ? (
                        <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                          {row.vacancy.category.label}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 align-top text-neutral-600 whitespace-nowrap">
                      {new Date(row.appliedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 align-top">
                      <select
                        value={row.status}
                        onChange={(e) =>
                          void handlePipelineStatusChange(
                            row.id,
                            row.status,
                            e.target.value as Application["status"],
                          )
                        }
                        className="px-2 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs font-bold uppercase tracking-tight"
                        aria-label={`Stage for ${row.vacancy.jobTitle}`}
                      >
                        {PIPELINE_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vacancies List */}
      <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden mb-12">
        <div className="px-8 py-6 border-b border-neutral-50 flex items-center justify-between">
          <h3 className="font-black text-neutral-900">Your Vacancies</h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={vacancySearchQuery}
              onChange={(e) => setVacancySearchQuery(e.target.value)}
              placeholder="Search titles, location…"
              aria-label="Search your vacancies"
              data-testid="recruiter-vacancies-search"
              className="pl-9 pr-4 py-2 bg-neutral-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none w-48 md:w-64"
            />
          </div>
        </div>

        <div className="divide-y divide-neutral-50">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-8 animate-pulse flex items-center gap-6">
                <div className="w-12 h-12 bg-neutral-100 rounded-2xl"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-neutral-100 rounded w-1/4"></div>
                  <div className="h-3 bg-neutral-100 rounded w-1/6"></div>
                </div>
              </div>
            ))
          ) : vacancies.length > 0 ? (
            filteredVacancies.length === 0 ? (
              <div className="p-12 text-center text-sm font-medium text-neutral-500">
                No vacancies match your search.
              </div>
            ) : (
            filteredVacancies.map((v) => (
              <div 
                key={v.id} 
                className="p-8 hover:bg-neutral-50/50 transition-colors flex flex-col md:flex-row md:items-center gap-6"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h4 className="text-lg font-black text-neutral-900">{v.jobTitle}</h4>
                    {v.category?.label ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-100">
                        {v.category.label}
                      </span>
                    ) : null}
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-violet-50 text-violet-700 border border-violet-100">
                      {jobTypeLabel(v.jobType)}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${
                      v.status === 'open' ? 'bg-emerald-100 text-emerald-600' : 'bg-neutral-100 text-neutral-400'
                    }`}>
                      {v.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" /> {v.location}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" /> Posted 2 days ago
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-600 font-bold">
                      {v.salary}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleEdit(v)}
                    className="p-3 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 hover:border-neutral-300 transition-all text-neutral-600 shadow-sm"
                    title="Edit"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => v.id && handleDelete(v.id)}
                    className="p-3 bg-white border border-neutral-200 rounded-xl hover:bg-red-50 hover:border-red-200 transition-all text-red-500 shadow-sm"
                    title="Close Vacancy"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <div className="h-8 w-px bg-neutral-100 mx-2" />
                  <button className="p-3 text-neutral-400 hover:text-neutral-900 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
            )
          ) : (
            <div className="p-20 text-center">
              <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Briefcase className="w-8 h-8 text-neutral-200" />
              </div>
              <h4 className="text-xl font-black text-neutral-900 mb-2">No Vacancies Yet</h4>
              <p className="text-neutral-500 mb-8">Start by posting your first job opening</p>
              <button 
                onClick={() => setShowForm(true)}
                className="bg-neutral-900 text-white px-8 py-3 rounded-2xl font-black hover:bg-neutral-800 transition-all"
              >
                Create Listing
              </button>
            </div>
          )}
        </div>
      </div>

      {user?.canManageUserRoles ? (
        <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-8 mb-12">
          <h3 className="font-black text-neutral-900 mb-2">Role Management</h3>
          <p className="text-sm text-neutral-500 mb-5">
            Promote or demote a user account by email. This action is restricted to allowlisted recruiter admins.
          </p>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="email"
              value={roleEmail}
              onChange={(e) => setRoleEmail(e.target.value)}
              placeholder="user@example.com"
              className="flex-1 px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <select
              value={roleValue}
              onChange={(e) => setRoleValue(e.target.value as "candidate" | "recruiter")}
              className="px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none"
            >
              <option value="recruiter">Recruiter</option>
              <option value="candidate">Candidate</option>
            </select>
            <button
              type="button"
              onClick={() => void handleRoleUpdate()}
              disabled={roleSaving || !roleEmail.trim()}
              className="px-5 py-3 rounded-xl bg-neutral-900 text-white font-bold disabled:opacity-50"
            >
              {roleSaving ? "Updating..." : "Update Role"}
            </button>
          </div>
          {roleResult ? <p className="text-sm mt-3 text-neutral-600">{roleResult}</p> : null}
        </div>
      ) : null}

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            >
              <VacancyForm 
                vacancy={editingVacancy || undefined}
                onSuccess={() => {
                  setShowForm(false);
                  void fetchDataForUser();
                  void fetchPipelineBoard();
                }}
                onCancel={() => setShowForm(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
