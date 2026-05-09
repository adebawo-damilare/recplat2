/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import {
  auth,
  signIn,
  logout,
  type Vacancy,
  type CandidateProfile,
} from "./lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { fetchPublicJobsWithFallback, seedSampleVacanciesViaApi } from "./lib/jobsApi";
import CandidateForm from "./components/CandidateForm";
import JobBoard from "./components/JobBoard";
import TalentBoard from "./components/TalentBoard";
import SignIn from "./components/SignIn";
import CandidateDashboard from "./components/CandidateDashboard";
import PortfolioViewer from "./components/PortfolioViewer";
import CompanyDashboard from "./components/CompanyDashboard";
import HomePage from "./components/home/HomePage";
import AppNav from "./components/layout/AppNav";
import AppFooter from "./components/layout/AppFooter";
import { AppView } from "./appView";

export default function App() {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [user, setUser] = useState<User | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [portfolioCandidate, setPortfolioCandidate] = useState<CandidateProfile | null>(null);

  const fetchVacancies = async () => {
    setLoading(true);
    try {
      const data = await fetchPublicJobsWithFallback(75);
      setVacancies(data);
    } catch (error) {
      console.error("Failed to fetch vacancies", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchVacancies();
  }, []);

  const handleSeed = async () => {
    if (!user) {
      signIn().then((u) => {
        if (u) handleSeed();
      });
      return;
    }
    setSeeding(true);
    try {
      await seedSampleVacanciesViaApi();
      await fetchVacancies();
    } catch (error) {
      console.error("Seeding failed", error);
    } finally {
      setSeeding(false);
    }
  };

  const handleAuthAction = async () => {
    if (user) {
      await logout();
      setView(AppView.HOME);
    } else {
      setView(AppView.SIGN_IN);
    }
  };

  const navigateTo = (newView: AppView) => {
    if (
      !user &&
      (newView === AppView.JOIN_CANDIDATE ||
        newView === AppView.COMPANY_DASHBOARD ||
        newView === AppView.MY_PROFILE)
    ) {
      setView(AppView.SIGN_IN);
    } else {
      setView(newView);
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      <AppNav currentView={view} user={user} onNavigate={navigateTo} onAuthAction={handleAuthAction} />

      <AnimatePresence mode="wait">
        {view === AppView.HOME && (
          <HomePage
            vacancies={vacancies}
            loading={loading}
            seeding={seeding}
            onNavigate={navigateTo}
            onSeedSampleJobs={handleSeed}
          />
        )}

        {view === AppView.JOIN_CANDIDATE && (
          <div className="pt-32 pb-20 px-4">
            <CandidateForm onSuccess={() => setView(AppView.MY_PROFILE)} onCancel={() => setView(AppView.MY_PROFILE)} />
          </div>
        )}

        {view === AppView.FIND_JOBS && (
          <div className="pt-24 min-h-screen bg-neutral-50/50">
            <JobBoard />
          </div>
        )}

        {view === AppView.FIND_TALENT && (
          <div className="pt-24 min-h-screen bg-neutral-50/50">
            <TalentBoard onViewPortfolio={(candidate) => setPortfolioCandidate(candidate)} />
          </div>
        )}

        {view === AppView.COMPANY_DASHBOARD && (
          <div className="pt-24 min-h-screen bg-neutral-50/50">
            <CompanyDashboard />
          </div>
        )}

        {view === AppView.MY_PROFILE && (
          <div className="pt-24 min-h-screen bg-neutral-50/50">
            <CandidateDashboard onViewPortfolio={(candidate) => setPortfolioCandidate(candidate)} />
          </div>
        )}

        {view === AppView.SIGN_IN && (
          <div className="pt-24 min-h-screen bg-neutral-50/50">
            <SignIn onSuccess={() => setView(AppView.HOME)} onCancel={() => setView(AppView.HOME)} />
          </div>
        )}

        {portfolioCandidate && (
          <PortfolioViewer
            content={portfolioCandidate.portfolioContent}
            url={portfolioCandidate.portfolioUrl}
            candidateName={portfolioCandidate.fullName}
            candidateEmail={portfolioCandidate.email}
            onClose={() => setPortfolioCandidate(null)}
          />
        )}
      </AnimatePresence>

      <AppFooter onNavigate={navigateTo} />
    </div>
  );
}
