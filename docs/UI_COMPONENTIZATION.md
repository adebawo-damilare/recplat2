# UI componentization (App shell)

## What changed

The marketing shell and landing experience were extracted from `App.tsx` into focused components so routing/state stay in `App.tsx` while layout and homepage sections remain easy to iterate on.

## Source layout

| Area | Location | Responsibility |
|------|----------|----------------|
| Route keys | `src/appView.ts` | `AppView` enum shared by navigation and `App.tsx` |
| Shell | `src/components/layout/AppNav.tsx` | Fixed header, auth affordances, primary nav |
| Shell | `src/components/layout/AppFooter.tsx` | Site footer and secondary links |
| Home | `src/components/home/HomePage.tsx` | Composes homepage + `AnimatePresence` motion wrapper |
| Home | `src/components/home/HomeHero.tsx` | Hero + illustrative panel |
| Home | `src/components/home/HomeAudience.tsx` | Candidate vs company value props |
| Home | `src/components/home/HomeFeaturedVacancies.tsx` | Featured jobs grid / empty state + seed |
| Motion presets | `src/components/home/homeMotion.ts` | Reused stagger variants for audience section |

## `App.tsx` role

`App.tsx` retains:

- Session-aware auth checks and vacancy loading / seed orchestration for the home teaser
- `navigateTo` guard for unauthenticated access to recruiter/candidate/profile views
- `AnimatePresence` and view switching (`JobBoard`, `TalentBoard`, dashboards, etc.)

## Testing hooks (`data-testid`)

Added for stable e2e selectors:

- `app-nav`, `home-page`, `home-hero`, `home-audience`, `home-featured-jobs`
- `nav-find-candidates`, `nav-sign-in`
- `app-footer`
- `job-board`, `talent-board`

## End-to-end tests

Playwright specs live under `e2e/`. They start the Vite dev server automatically (see `playwright.config.ts`).

Commands:

```bash
npm install
npx playwright install chromium
npm run test:e2e
```
