/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import type { Vacancy } from "../../lib/domainTypes";
import { AppView } from "../../appView";
import HomeHero from "./HomeHero";
import HomeAudience from "./HomeAudience";
import HomeFeaturedVacancies from "./HomeFeaturedVacancies";

interface HomePageProps {
  vacancies: Vacancy[];
  loading: boolean;
  onNavigate: (view: AppView) => void;
}

export default function HomePage({
  vacancies,
  loading,
  onNavigate,
}: HomePageProps) {
  return (
    <motion.div
      key="home"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-testid="home-page"
    >
      <HomeHero onNavigate={onNavigate} />
      <HomeAudience onNavigate={onNavigate} />
      <HomeFeaturedVacancies vacancies={vacancies} loading={loading} onNavigate={onNavigate} />
    </motion.div>
  );
}
