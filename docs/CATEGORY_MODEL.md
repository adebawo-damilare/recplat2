# Category model (TalentBridge)

This document captures how we applied the **“categories as templates”** idea from the strategy synthesis (`docs/SUPPORTING_NOTES.md`, **`docs/TALENTBRIDGE_MVP_PLAN.md`** §4) **without** rewriting the existing jobs stack.

## Goals

- Ship a **small MVP catalog** of talent lanes (avoid many shallow categories at launch).
- Classify **`vacancies`** for discovery and UI, with a path toward profile/screening templates later.
- Keep code **modular** (`src/server/categories/*`, `src/shared/*`, thin API routes).

## Data

- Table **`categories`** (migration `database/migrations/0002_categories.sql`): `slug`, `label`, `sort_order`, `is_active`.
- Column **`vacancies.category_id`** nullable FK → `categories(id)` `ON DELETE SET NULL`.
- Canonical MVP slugs are mirrored in **`src/shared/mvpCategories.ts`** for validation and for `/api/categories` when Postgres is empty/unset.

## APIs

- **`GET /api/categories`** — public list of active lanes (cached briefly).
- **`GET /api/jobs?category=marketers|designers|sales`** — server-side filter when using Postgres.
- **`POST /api/jobs` / `PATCH /api/jobs/[id]`** — optional `categorySlug` (string or `null` to clear on PATCH).

## Client

- **`src/lib/jobsApi.ts`** — passes `category` query param to `/api/jobs`; client behavior is API-only.
- **`VacancyCategoryField`** — recruiter vacancy form lane selector.
- **Job board** — lane dropdown + badges on listings.

## Next steps (not built here)

Per synthesis + **`docs/TALENTBRIDGE_MVP_PLAN.md`** + **`docs/ROADMAP_FROM_REFERENCE.md`**: **`category_fields`**, **`category_screening_questions`**, denormalized **search docs**, **`candidate_profiles`**, invitations/screenings — promote into **`docs/ROADMAP.md`** when prioritized.
