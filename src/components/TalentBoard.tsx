/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Search, User, Database, X } from "lucide-react";
import type { CandidateProfile } from "../lib/domainTypes";
import { fetchAllCandidatesPublic, seedSampleCandidatesViaApi } from "../lib/candidatesApi";
import { refreshTalentBridgeSession } from "../lib/authBrowser";
import ProfileCard from "./ProfileCard";

interface TalentBoardProps {
  onViewPortfolio: (candidate: CandidateProfile) => void;
}

export default function TalentBoard({ onViewPortfolio }: TalentBoardProps) {
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile | null>(null);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const data = await fetchAllCandidatesPublic();
      setCandidates(data);
    } catch (error) {
      console.error("Failed to fetch candidates", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCandidates();
  }, []);

  const handleSeed = async () => {
    const u = await refreshTalentBridgeSession();
    if (!u) {
      alert("Please sign in to sync sample candidates.");
      return;
    }

    setSeeding(true);
    try {
      const summary = await seedSampleCandidatesViaApi();
      if (!summary) {
        alert("Unable to seed sample candidates.");
        return;
      }
      const updated = await fetchAllCandidatesPublic();
      setCandidates(updated);
      if (selectedCandidate) {
        const fresh = updated.find((c) => c.userId === selectedCandidate.userId);
        if (fresh) setSelectedCandidate(fresh);
      }
    } catch (error) {
      console.error("Failed to seed candidates", error);
      alert("Failed to seed candidates.");
    } finally {
      setSeeding(false);
    }
  };

  const filteredCandidates = candidates.filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.headline.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.skills.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="talent-board">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Find Elite Candidates</h1>
        <p className="text-neutral-600 text-lg">Connect with top professionals ready for their next challenge.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name, skills, or headline..."
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {!loading && (
          <button
            type="button"
            onClick={() => void handleSeed()}
            disabled={seeding}
            className="px-6 py-4 bg-emerald-500 text-white rounded-2xl flex items-center justify-center gap-2 font-bold hover:bg-emerald-600 transition-all disabled:opacity-50 shadow-lg shadow-emerald-100 active:scale-[0.98]"
            title="Insert demo candidate rows (requires sign-in)"
          >
            <Database className="w-5 h-5" /> {seeding ? "Syncing..." : "Sync Sample Data"}
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-neutral-100 h-32 animate-pulse"></div>
            ))
          ) : filteredCandidates.length > 0 ? (
            filteredCandidates.map((c) => (
              <motion.div
                key={c.userId}
                whileHover={{ scale: 1.01 }}
                onClick={() => setSelectedCandidate(c)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  selectedCandidate?.userId === c.userId
                    ? "bg-blue-50 border-blue-200 shadow-md ring-1 ring-blue-100"
                    : "bg-white border-neutral-100 hover:border-neutral-200 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center overflow-hidden">
                    <img
                      src={`https://picsum.photos/seed/${c.userId}/100/100`}
                      alt={c.fullName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold truncate">{c.fullName}</h3>
                    <p className="text-xs text-neutral-500 truncate">{c.headline}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1">
                  {c.skills.split(",").slice(0, 3).map((skill, sIdx) => {
                    const trimmed = skill.trim();
                    if (!trimmed) return null;
                    return (
                      <span
                        key={`${c.userId}-skill-${sIdx}`}
                        className="px-1.5 py-0.5 bg-neutral-100 text-neutral-500 rounded text-[10px] font-bold uppercase truncate"
                      >
                        {trimmed}
                      </span>
                    );
                  })}
                  {c.skills.split(",").length > 3 && (
                    <span className="text-[10px] text-neutral-400 font-bold">+{c.skills.split(",").length - 3}</span>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 px-6 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
              <p className="text-neutral-500 text-sm font-medium">No candidates found.</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedCandidate ? (
            <div className="relative">
              <ProfileCard candidate={selectedCandidate} onViewPortfolio={onViewPortfolio} />
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="absolute top-6 right-6 lg:hidden p-2 hover:bg-neutral-100 rounded-full z-10"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>
          ) : (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-neutral-50 rounded-3xl border-2 border-dashed border-neutral-200 p-8 text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-neutral-100">
                <User className="w-8 h-8 text-neutral-200" />
              </div>
              <h3 className="text-xl font-bold mb-2">Select a talent to view profile</h3>
              <p className="text-neutral-500 max-w-sm">
                Browse full resumes, portfolios, and contact information to find your ideal team member.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
