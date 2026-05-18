/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from "motion/react";
import { User, Mail, Briefcase, FileText, Code, Clock, Save, ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { fetchCategoryProfileFields, type CategoryFieldDefinition } from "../lib/categoryFieldsApi";
import { fetchMyCandidateProfile, saveMyCandidateProfile } from "../lib/candidatesApi";
import { useTalentBridgeUser } from "../lib/useTalentBridgeUser";
import { candidateHasDisplayableName } from "../lib/candidateName";
import { MVP_TALENT_CATEGORIES } from "../shared/mvpCategories";

interface CandidateFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CandidateForm({ onSuccess, onCancel }: CandidateFormProps) {
  const { user } = useTalentBridgeUser();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    headline: "",
    summary: "",
    skills: "",
    experience: "",
    portfolioUrl: "",
    portfolioContent: "",
    primaryTalentLaneSlug: "",
    categoryFieldValues: {} as Record<string, string>,
  });
  const [laneFields, setLaneFields] = useState<CategoryFieldDefinition[]>([]);

  React.useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setInitialLoading(false);
        return;
      }
      try {
        const profile = await fetchMyCandidateProfile();
        if (profile) {
          setFormData({
            firstName: profile.firstName || "",
            lastName: profile.lastName || "",
            email: profile.email || user.email || "",
            headline: profile.headline || "",
            summary: profile.summary || "",
            skills: profile.skills || "",
            experience: profile.experience || "",
            portfolioUrl: profile.portfolioUrl || "",
            portfolioContent: profile.portfolioContent || "",
            primaryTalentLaneSlug: profile.primaryTalentLaneSlug || "",
            categoryFieldValues: Object.fromEntries(
              (profile.categoryFieldValues ?? []).map((f) => [f.fieldKey, f.value]),
            ),
          });
        } else {
          setFormData((prev) => ({ ...prev, email: user.email || "" }));
        }
      } catch (error) {
        console.error("Error loading profile", error);
      } finally {
        setInitialLoading(false);
      }
    };
    void loadProfile();
  }, [user]);

  React.useEffect(() => {
    const slug = formData.primaryTalentLaneSlug.trim();
    if (!slug) {
      setLaneFields([]);
      return;
    }
    void fetchCategoryProfileFields(slug).then(setLaneFields);
  }, [formData.primaryTalentLaneSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const saved = await saveMyCandidateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        headline: formData.headline,
        summary: formData.summary,
        skills: formData.skills,
        experience: formData.experience,
        portfolioUrl: formData.portfolioUrl || null,
        portfolioContent: formData.portfolioContent || null,
        primaryTalentLaneSlug: formData.primaryTalentLaneSlug.trim() || null,
        categoryFieldValues: formData.categoryFieldValues,
      });
      if (!saved) {
        alert("Failed to save profile. Check that you are signed in.");
        return;
      }
      onSuccess();
    } catch (error) {
      alert("Failed to save profile. Please see console for details.");
    } finally {
      setLoading(false);
    }
  };

  const hasSavedName = candidateHasDisplayableName(formData.firstName, formData.lastName);

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] bg-white rounded-3xl border border-neutral-100 p-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <p className="text-neutral-500 font-medium">Loading form data...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto bg-white p-8 rounded-3xl shadow-xl border border-neutral-100"
    >
      <button 
        onClick={onCancel}
        className="mb-8 flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="mb-10">
        <h2 className="text-3xl font-bold tracking-tight mb-2">
          {hasSavedName ? 'Edit Your Profile' : 'Build Your Profile'}
        </h2>
        <p className="text-neutral-500">Highlight your expertise and get discovered by top companies.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" /> First name
            </label>
            <input
              required
              type="text"
              autoComplete="given-name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="Jordan"
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" /> Last name
            </label>
            <input
              type="text"
              autoComplete="family-name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="Lee"
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-600" /> Professional Email
            </label>
            <input
              required
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="jordan@company.com"
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-600" /> Primary talent lane
          </label>
          <select
            value={formData.primaryTalentLaneSlug}
            onChange={(e) =>
              setFormData({ ...formData, primaryTalentLaneSlug: e.target.value, categoryFieldValues: {} })
            }
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            data-testid="candidate-profile-lane-select"
          >
            <option value="">Select a lane (optional)</option>
            {MVP_TALENT_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {laneFields.length > 0 ? (
          <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-800">Lane-specific details</p>
            {laneFields.map((field) => (
              <div key={field.id} className="space-y-2">
                <label className="text-sm font-bold text-neutral-800">{field.label}</label>
                {field.fieldType === "textarea" ? (
                  <textarea
                    rows={3}
                    value={formData.categoryFieldValues[field.fieldKey] ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        categoryFieldValues: {
                          ...formData.categoryFieldValues,
                          [field.fieldKey]: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={formData.categoryFieldValues[field.fieldKey] ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        categoryFieldValues: {
                          ...formData.categoryFieldValues,
                          [field.fieldKey]: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                )}
              </div>
            ))}
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="text-sm font-bold flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-600" /> Professional Headline
          </label>
          <input
            required
            type="text"
            value={formData.headline}
            onChange={(e) => setFormData({...formData, headline: e.target.value})}
            placeholder="Senior Full Stack Engineer | React & Node.js Expert"
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" /> Professional Summary
          </label>
          <textarea
            required
            rows={4}
            value={formData.summary}
            onChange={(e) => setFormData({...formData, summary: e.target.value})}
            placeholder="Tell us about your background and what drives you..."
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold flex items-center gap-2">
            <Code className="w-4 h-4 text-blue-600" /> Key Skills
          </label>
          <input
            required
            type="text"
            value={formData.skills}
            onChange={(e) => setFormData({...formData, skills: e.target.value})}
            placeholder="React, TypeScript, AWS, Python, Figma"
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Separate with commas</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-blue-600" /> Portfolio URL (Optional)
          </label>
          <input
            type="url"
            value={formData.portfolioUrl}
            onChange={(e) => setFormData({...formData, portfolioUrl: e.target.value})}
            placeholder="https://yourportfolio.com"
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold flex items-center gap-2">
            <Code className="w-4 h-4 text-blue-600" /> In-App Portfolio (Markdown)
          </label>
          <textarea
            rows={8}
            value={formData.portfolioContent}
            onChange={(e) => setFormData({...formData, portfolioContent: e.target.value})}
            placeholder="# My Portfolio&#10;&#10;## About Me&#10;I am a dedicated developer...&#10;&#10;## Projects&#10;- **AwesomeApp**: A cool React project..."
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-sm"
          />
          <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Describe your work using Markdown</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" /> Relevant Experience
          </label>
          <textarea
            required
            rows={4}
            value={formData.experience}
            onChange={(e) => setFormData({...formData, experience: e.target.value})}
            placeholder="List your key roles and achievements..."
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
          />
        </div>

        <button
          disabled={loading}
          type="submit"
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-200"
        >
          {loading ? "Saving..." : <><Save className="w-5 h-5" /> Save Profile</>}
        </button>
      </form>
    </motion.div>
  );
}
