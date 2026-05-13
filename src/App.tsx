/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "motion/react";
import type { Vacancy, CandidateProfile, TalentBridgeUser } from "./lib/domainTypes";
import { refreshTalentBridgeSession, logoutTalentBridgeSession } from "./lib/authBrowser";
import { fetchHomeFeaturedJobs } from "./lib/jobsApi";
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
import { formatCandidateFullName } from "./lib/candidateName";

export default function App() {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [user, setUser] = useState<TalentBridgeUser | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [totalOpenVacancies, setTotalOpenVacancies] = useState(0);
  const [loading, setLoading] = useState(true);
  const [portfolioCandidate, setPortfolioCandidate] = useState<CandidateProfile | null>(null);

  const fetchVacancies = async () => {
    setLoading(true);
    try {
      const { jobs, totalOpen } = await fetchHomeFeaturedJobs();
      setVacancies(jobs);
      setTotalOpenVacancies(totalOpen);
    } catch (error) {
      console.error("Failed to fetch vacancies", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshTalentBridgeSession().then(setUser);
  }, []);

  useEffect(() => {
    void fetchVacancies();
  }, []);

  const handleAuthAction = async () => {
    if (user) {
      await logoutTalentBridgeSession();
      setUser(null);
      setView(AppView.HOME);
    } else {
      setView(AppView.SIGN_IN);
    }
  };

  const onSignInSuccess = useCallback(async () => {
    const u = await refreshTalentBridgeSession();
    setUser(u);
    setView(AppView.HOME);
  }, []);

  const navigateTo = (newView: AppView) => {
    if (
      !user &&
      (newView === AppView.JOIN_CANDIDATE ||
        newView === AppView.COMPANY_DASHBOARD ||
        newView === AppView.MY_PROFILE)
    ) {
      setView(AppView.SIGN_IN);
    } else if (user && user.role !== "recruiter" && newView === AppView.COMPANY_DASHBOARD) {
      setView(AppView.MY_PROFILE);
    } else if (user && user.role !== "candidate" && (newView === AppView.MY_PROFILE || newView === AppView.JOIN_CANDIDATE)) {
      setView(AppView.COMPANY_DASHBOARD);
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
            totalOpenVacancies={totalOpenVacancies}
            loading={loading}
            onNavigate={navigateTo}
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
            <SignIn onSuccess={onSignInSuccess} onCancel={() => setView(AppView.HOME)} />
          </div>
        )}

        {portfolioCandidate && (
          <PortfolioViewer
            content={portfolioCandidate.portfolioContent}
            url={portfolioCandidate.portfolioUrl}
            candidateName={formatCandidateFullName(portfolioCandidate.firstName, portfolioCandidate.lastName)}
            candidateEmail={portfolioCandidate.email}
            onClose={() => setPortfolioCandidate(null)}
          />
        )}
      </AnimatePresence>

      <AppFooter onNavigate={navigateTo} />
    </div>
  );
}
