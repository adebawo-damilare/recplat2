"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HomePage from "../../src/components/home/HomePage";
import { AppView } from "../../src/appView";
import { auth, signIn, type Vacancy } from "../../src/lib/firebase";
import { fetchPublicJobsWithFallback, seedSampleVacanciesViaApi } from "../../src/lib/jobsApi";
import { onAuthStateChanged, type User } from "firebase/auth";

export default function HomeClientPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

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
    fetchVacancies();
  }, []);

  const handleSeed = async () => {
    if (!user) {
      const u = await signIn();
      if (!u) return;
    }

    if (!auth.currentUser) return;

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

  const routeForView = (newView: AppView) => {
    if (!user && [AppView.JOIN_CANDIDATE, AppView.COMPANY_DASHBOARD, AppView.MY_PROFILE].includes(newView)) {
      return "/sign-in";
    }

    switch (newView) {
      case AppView.HOME:
        return "/";
      case AppView.FIND_JOBS:
        return "/jobs";
      case AppView.FIND_TALENT:
        return "/talent";
      case AppView.SIGN_IN:
        return "/sign-in";
      case AppView.COMPANY_DASHBOARD:
        return "/dashboard/company";
      case AppView.MY_PROFILE:
      case AppView.JOIN_CANDIDATE:
        return "/dashboard/profile";
      default:
        return "/";
    }
  };

  return (
    <div className="pt-0">
      <HomePage
        vacancies={vacancies}
        loading={loading}
        seeding={seeding}
        onNavigate={(v) => router.push(routeForView(v))}
        onSeedSampleJobs={handleSeed}
      />
    </div>
  );
}