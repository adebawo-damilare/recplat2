/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, 
  Briefcase, 
  Clock, 
  MapPin, 
  ChevronRight, 
  ExternalLink,
  Eye,
  Code,
  FileText,
  Settings,
  Bell,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import type { CandidateProfile, Application } from "../lib/domainTypes";
import { fetchMyApplicationsWithFallback } from "../lib/applicationsApi";
import { fetchMyCandidateProfile } from "../lib/candidatesApi";
import { useTalentBridgeUser } from "../lib/useTalentBridgeUser";
import ProfileCard from './ProfileCard';
import CandidateForm from './CandidateForm';

function formatAppliedDate(appliedAt: unknown): string {
  if (!appliedAt) return "—";
  if (typeof appliedAt === "string") {
    return new Date(appliedAt).toLocaleDateString();
  }
  const sec = appliedAt as { seconds?: number };
  if (typeof sec.seconds === "number") {
    return new Date(sec.seconds * 1000).toLocaleDateString();
  }
  return "—";
}

interface CandidateDashboardProps {
  onViewPortfolio: (candidate: CandidateProfile) => void;
}

export default function CandidateDashboard({ onViewPortfolio }: CandidateDashboardProps) {
  const { user } = useTalentBridgeUser();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [profileData, appsData] = await Promise.all([fetchMyCandidateProfile(), fetchMyApplicationsWithFallback()]);
      setProfile(profileData);
      setApplications(appsData || []);
    } catch (error) {
      console.error("Error fetching candidate data", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-12 text-center animate-pulse">
        <div className="h-12 bg-neutral-100 rounded-2xl w-1/3 mx-auto mb-12"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 h-96 bg-neutral-100 rounded-3xl"></div>
          <div className="h-96 bg-neutral-100 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  const hasMeaningfulProfile = Boolean(profile?.fullName?.trim());
  const profileCompletion = hasMeaningfulProfile ? 100 : 0;

  return (
    <div className="max-w-6xl mx-auto p-6 sm:p-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-xl">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-3xl font-black text-neutral-900 tracking-tight">Candidate Dashboard</h2>
          </div>
          <p className="text-neutral-500 font-medium whitespace-nowrap">Manage your career profile and track applications</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-3 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-all text-neutral-500 shadow-sm relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full"></span>
          </button>
          <button className="p-3 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-all text-neutral-500 shadow-sm">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-8">
          {/* Status Banner */}
          {!hasMeaningfulProfile && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-start gap-4"
            >
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-black text-amber-900 mb-1">Complete your profile</h4>
                <p className="text-sm text-amber-700 font-medium mb-4">You haven't set up your professional profile yet. Companies cannot find you in the talent board.</p>
                <button 
                  onClick={() => setShowEditForm(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all"
                >
                  Create Profile Now
                </button>
              </div>
            </motion.div>
          )}

          {/* Applications List */}
          <section>
            <div className="flex items-center justify-between mb-6 px-2">
              <h3 className="font-black text-xl text-neutral-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" /> Active Applications
              </h3>
              <span className="text-sm font-bold text-neutral-400">{applications.length} TOTAL</span>
            </div>

            <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
              {applications.length > 0 ? (
                <div className="divide-y divide-neutral-50">
                  {applications.map((app) => (
                    <motion.div 
                      key={app.id} 
                      className="p-6 hover:bg-neutral-50/50 transition-colors flex items-center gap-6 group"
                    >
                      <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center font-black text-neutral-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        {app.vacancy?.companyName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-black text-neutral-900">{app.vacancy?.jobTitle}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-tighter ${
                            app.status === 'applied' ? 'bg-blue-100 text-blue-600' :
                            app.status === 'rejected' ? 'bg-red-100 text-red-600' :
                            'bg-emerald-100 text-emerald-600'
                          }`}>
                            {app.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-neutral-500 font-medium">
                          <span className="flex items-center gap-1"><Code className="w-3 h-3"/> {app.vacancy?.companyName}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {app.vacancy?.location}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> Applied {formatAppliedDate(app.appliedAt)}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-neutral-900 transition-colors" />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-16 text-center">
                  <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Briefcase className="w-8 h-8 text-neutral-200" />
                  </div>
                  <h4 className="text-lg font-black text-neutral-900 mb-2">No applications yet</h4>
                  <p className="text-neutral-500 mb-0">Browse the job board to find your next opportunity.</p>
                </div>
              )}
            </div>
          </section>

          {/* Profile Recommendation */}
          {hasMeaningfulProfile && profile && (
            <section className="bg-neutral-900 rounded-3xl p-8 text-white relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-xs font-black uppercase tracking-widest text-neutral-400">Profile Optimized</span>
                </div>
                <h3 className="text-2xl font-black mb-2 italic">
                  Looking sharp, {profile.fullName.trim().split(/\s+/)[0] || "there"}!
                </h3>
                <p className="text-neutral-400 font-medium mb-6 max-w-md">Your profile is currently visible to companies searching for top talent. Keep your experience up to date to increase your visibility.</p>
                <div className="flex items-center gap-4">
                   <button 
                    onClick={() => setShowEditForm(true)}
                    className="bg-white text-neutral-900 px-6 py-3 rounded-xl font-black text-sm hover:bg-neutral-100 transition-all flex items-center gap-2"
                   >
                     <Settings className="w-4 h-4" /> Edit Profile
                   </button>
                   <button 
                    onClick={() => onViewPortfolio(profile)}
                    className="text-neutral-400 hover:text-white font-bold text-sm transition-colors flex items-center gap-2"
                   >
                     <Eye className="w-4 h-4" /> Preview Portfolio
                   </button>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-3xl -mr-20 -mt-20 group-hover:bg-blue-600/20 transition-all" />
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Quick Profile Card */}
          {hasMeaningfulProfile && profile && (
            <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-neutral-100 rounded-full mx-auto mb-4 flex items-center justify-center font-black text-3xl text-neutral-300">
                  {profile.fullName.trim().charAt(0)}
                </div>
                <h4 className="text-xl font-black text-neutral-900">{profile.fullName}</h4>
                <p className="text-sm text-neutral-500 font-medium">{profile.headline}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400 font-bold uppercase tracking-tighter">Completion</span>
                  <span className="text-blue-600 font-black">{profileCompletion}%</span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${profileCompletion}%` }}></div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-neutral-50 space-y-4">
                <div className="flex items-center gap-3 text-sm text-neutral-600 font-medium">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                  Searchable by recruiters
                </div>
                <div className="flex items-center gap-3 text-sm text-neutral-600 font-medium">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  Portfolio verified
                </div>
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest px-4">Career Toolkit</h4>
            <button className="w-full p-4 bg-white border border-neutral-100 rounded-2xl flex items-center gap-4 hover:border-neutral-200 transition-all text-left">
              <div className="p-2 bg-neutral-50 rounded-lg text-neutral-900">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-black text-neutral-900">Resume Builder</div>
                <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-tighter">Coming Soon</div>
              </div>
            </button>
            <button className="w-full p-4 bg-white border border-neutral-100 rounded-2xl flex items-center gap-4 hover:border-neutral-200 transition-all text-left">
              <div className="p-2 bg-neutral-50 rounded-lg text-neutral-900">
                <ExternalLink className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-black text-neutral-900">Salary Insights</div>
                <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-tighter">Global Data</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditForm && (
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
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <CandidateForm 
                onSuccess={() => {
                  setShowEditForm(false);
                  fetchData();
                }}
                onCancel={() => setShowEditForm(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
