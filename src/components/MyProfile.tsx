/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from "motion/react";
import { User, Plus, ArrowLeft, Loader2 } from "lucide-react";
import { getCandidateProfile, auth, type CandidateProfile } from '../lib/firebase';
import ProfileCard from './ProfileCard';

interface MyProfileProps {
  onEdit: () => void;
  onBack: () => void;
  onViewPortfolio: (candidate: CandidateProfile) => void;
}

export default function MyProfile({ onEdit, onBack, onViewPortfolio }: MyProfileProps) {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const data = await getCandidateProfile(user.uid);
        setProfile(data || null);
      } catch (error) {
        console.error("Error fetching my profile", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-neutral-500 font-medium">Loading your profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto p-12 bg-white rounded-3xl border border-neutral-100 shadow-sm text-center"
      >
        <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-8">
          <User className="w-10 h-10 text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold mb-4">No Profile Found</h2>
        <p className="text-neutral-500 mb-10 text-lg">
          You haven't created a professional profile yet. Create one to start connecting with elite companies.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={onEdit}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <Plus className="w-5 h-5" /> Create Profile
          </button>
          <button 
            onClick={onBack}
            className="px-8 py-4 bg-white border border-neutral-200 rounded-xl font-bold text-neutral-600 hover:bg-neutral-50 transition-all"
          >
            <ArrowLeft className="w-5 h-5" /> Back to Home
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      <div className="mb-12 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">My Profile</h1>
          <p className="text-neutral-500">This is how companies and recruiters see you on TalentBridge.</p>
        </div>
        <button 
          onClick={onBack}
          className="p-3 hover:bg-white rounded-full transition-colors border border-transparent hover:border-neutral-200"
        >
          <ArrowLeft className="w-6 h-6 text-neutral-400" />
        </button>
      </div>

      <ProfileCard 
        candidate={profile} 
        isOwnProfile={true}
        onEdit={onEdit}
        onViewPortfolio={onViewPortfolio}
      />
    </div>
  );
}
