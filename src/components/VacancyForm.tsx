/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { X, Briefcase, MapPin, DollarSign, FileText, CheckCircle, Building2 } from "lucide-react";
import { auth, type Vacancy } from '../lib/firebase';
import { persistVacancyWithFallback } from "../lib/jobsApi";
import { VacancyCategoryField } from "./vacancies/VacancyCategoryField";

interface VacancyFormProps {
  vacancy?: Vacancy;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function VacancyForm({ vacancy, onSuccess, onCancel }: VacancyFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    jobTitle: vacancy?.jobTitle || "",
    companyName: vacancy?.companyName || "",
    location: vacancy?.location || "",
    salary: vacancy?.salary || "",
    description: vacancy?.description || "",
    requirements: vacancy?.requirements || "",
    categorySlug: vacancy?.category?.slug ?? "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      const trimmedLane = formData.categorySlug.trim();
      const categorySlug = vacancy
        ? trimmedLane === ""
          ? null
          : trimmedLane.toLowerCase()
        : trimmedLane === ""
          ? undefined
          : trimmedLane.toLowerCase();

      await persistVacancyWithFallback(
        {
          jobTitle: formData.jobTitle,
          companyName: formData.companyName,
          location: formData.location,
          salary: formData.salary,
          description: formData.description,
          requirements: formData.requirements,
          categorySlug,
        },
        vacancy,
      );
      onSuccess();
    } catch (error) {
      console.error("Error saving vacancy", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-neutral-200 overflow-hidden">
      <div className="px-8 py-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
        <div>
          <h3 className="text-xl font-black text-neutral-900">{vacancy ? 'Edit Vacancy' : 'Post New Vacancy'}</h3>
          <p className="text-sm text-neutral-500 font-medium">Reach the best talent in the industry</p>
        </div>
        <button 
          onClick={onCancel}
          className="p-2 hover:bg-neutral-200 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-neutral-500" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <VacancyCategoryField
            value={formData.categorySlug}
            onChange={(slug) => setFormData({ ...formData, categorySlug: slug })}
          />
          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600" /> Job Title
            </label>
            <input
              required
              type="text"
              value={formData.jobTitle}
              onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
              placeholder="e.g. Senior Frontend Engineer"
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" /> Company Name
            </label>
            <input
              required
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({...formData, companyName: e.target.value})}
              placeholder="e.g. TechFlow Systems"
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" /> Location
            </label>
            <input
              required
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              placeholder="e.g. Remote / London, UK"
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-600" /> Salary Range
            </label>
            <input
              required
              type="text"
              value={formData.salary}
              onChange={(e) => setFormData({...formData, salary: e.target.value})}
              placeholder="e.g. $120k - $150k"
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" /> Job Description
          </label>
          <textarea
            required
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Describe the role and day-to-day responsibilities..."
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600" /> Key Requirements
          </label>
          <textarea
            required
            rows={4}
            value={formData.requirements}
            onChange={(e) => setFormData({...formData, requirements: e.target.value})}
            placeholder="List required skills, experience, and qualifications..."
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Saving...' : vacancy ? 'Update Vacancy' : 'Post Vacancy'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-8 py-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-2xl font-black transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
