/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from "motion/react";
import { Mail, User, FileText, Code, ExternalLink, Edit3 } from "lucide-react";
import { type CandidateProfile } from "../lib/domainTypes";
import { formatCandidateFullName } from "../lib/candidateName";
import { screeningLaneLabel } from "../shared/screeningPilot";

interface ProfileCardProps {
  candidate: CandidateProfile;
  isOwnProfile?: boolean;
  onEdit?: () => void;
  onViewPortfolio?: (candidate: CandidateProfile) => void;
}

export default function ProfileCard({ candidate, isOwnProfile, onEdit, onViewPortfolio }: ProfileCardProps) {
  const displayName = formatCandidateFullName(candidate.firstName, candidate.lastName);
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm w-full max-w-4xl mx-auto"
    >
      <div className="flex flex-col md:flex-row items-center md:items-start justify-between mb-8 gap-6">
        <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
          <img 
            src={`https://picsum.photos/seed/${candidate.userId}/200/200`} 
            className="w-32 h-32 rounded-3xl object-cover shadow-xl ring-4 ring-neutral-50"
            alt={displayName || "Candidate"}
          />
          <div>
            <h2 className="text-4xl font-bold mb-2 tracking-tight">{displayName || "Candidate"}</h2>
            <p className="text-blue-600 font-bold text-lg">{candidate.headline}</p>
            <div className="flex items-center justify-center md:justify-start gap-2 mt-2 text-neutral-400">
               <Mail className="w-3 h-3" />
               <span className="text-xs font-medium">{candidate.email}</span>
            </div>
          </div>
        </div>
        {isOwnProfile && onEdit && (
          <button 
            onClick={onEdit}
            className="flex items-center gap-2 px-6 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-bold hover:bg-neutral-800 transition-colors shadow-lg shadow-neutral-200"
          >
            <Edit3 className="w-4 h-4" /> Edit Profile
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-12 mt-12">
        <div className="md:col-span-2 space-y-10">
          <section>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" /> About the Candidate
            </h4>
            <p className="text-neutral-700 text-lg leading-relaxed italic border-l-4 border-blue-100 pl-6 py-2">
              "{candidate.summary}"
            </p>
          </section>

          <section>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" /> Professional Experience
            </h4>
            <div className="text-neutral-700 leading-relaxed bg-neutral-50 p-8 rounded-2xl border border-neutral-100 whitespace-pre-wrap font-medium">
              {candidate.experience}
            </div>
          </section>
        </div>

        <div className="space-y-10">
          {candidate.primaryTalentLaneSlug && candidate.categoryFieldValues?.length ? (
            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-4">
                {screeningLaneLabel(candidate.primaryTalentLaneSlug)} profile
              </h4>
              <div className="space-y-3 bg-neutral-50 rounded-2xl border border-neutral-100 p-6">
                {candidate.categoryFieldValues.map((f) => (
                  <div key={f.fieldId}>
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-wide">{f.label}</p>
                    <p className="text-sm text-neutral-800 mt-1 whitespace-pre-wrap">{f.value || "—"}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
              <Code className="w-4 h-4 text-blue-600" /> Key Skills
            </h4>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.split(',').map((skill, idx) => {
                const trimmed = skill.trim();
                if (!trimmed) return null;
                return (
                  <span key={`${candidate.userId}-skill-${idx}`} className="px-3 py-1.5 bg-white text-neutral-900 rounded-xl text-xs font-bold ring-1 ring-neutral-200 shadow-sm">
                    {trimmed}
                  </span>
                );
              })}
            </div>
          </section>

          <div className="flex flex-col gap-3">
             <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Connect</h4>
             <a 
              href={`mailto:${candidate.email}`}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-50 flex items-center justify-center gap-2"
            >
              <Mail className="w-5 h-5" /> Contact via Email
            </a>
            <button 
              onClick={() => {
                const hasUrl = candidate.portfolioUrl && candidate.portfolioUrl.trim() !== '';
                const hasContent = candidate.portfolioContent && candidate.portfolioContent.trim() !== '';
                if ((hasUrl || hasContent) && onViewPortfolio) {
                  onViewPortfolio(candidate);
                }
              }}
              className={`w-full py-4 border rounded-2xl transition-all font-bold flex flex-col items-center justify-center relative overflow-hidden group ${
                (candidate.portfolioUrl && candidate.portfolioUrl.trim() !== '') || (candidate.portfolioContent && candidate.portfolioContent.trim() !== '')
                  ? 'bg-white border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 text-neutral-900 shadow-sm active:scale-[0.98]' 
                  : 'bg-neutral-50 border-neutral-100 text-neutral-400 cursor-not-allowed opacity-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5" /> View Portfolio
              </div>
              {candidate.portfolioContent && candidate.portfolioContent.trim() !== '' && (
                <div className="absolute top-0 right-0">
                   <div className="bg-emerald-500 text-[8px] text-white px-2 py-0.5 rounded-bl-lg font-bold uppercase tracking-tighter">
                     In-App
                   </div>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
