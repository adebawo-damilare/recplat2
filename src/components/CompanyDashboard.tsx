/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  LayoutDashboard
} from "lucide-react";
import { auth, getVacanciesByUser, deleteVacancy, type Vacancy } from '../lib/firebase';
import VacancyForm from './VacancyForm';

export default function CompanyDashboard() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState<Vacancy | null>(null);

  const fetchData = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const data = await getVacanciesByUser(auth.currentUser.uid);
      setVacancies(data || []);
    } catch (error) {
      console.error("Error fetching vacancies", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to close this vacancy?")) return;
    try {
      await deleteVacancy(id);
      fetchData();
    } catch (error) {
      console.error("Error deleting vacancy", error);
    }
  };

  const handleEdit = (vacancy: Vacancy) => {
    setEditingVacancy(vacancy);
    setShowForm(true);
  };

  const activeCount = vacancies.filter(v => v.status === 'open').length;

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

      {/* Vacancies List */}
      <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden mb-12">
        <div className="px-8 py-6 border-b border-neutral-50 flex items-center justify-between">
          <h3 className="font-black text-neutral-900">Your Vacancies</h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Search..." 
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
            vacancies.map((v) => (
              <div 
                key={v.id} 
                className="p-8 hover:bg-neutral-50/50 transition-colors flex flex-col md:flex-row md:items-center gap-6"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-black text-neutral-900">{v.jobTitle}</h4>
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
                  fetchData();
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
