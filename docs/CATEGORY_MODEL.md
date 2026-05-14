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
- **`GET /api/jobs?category=marketers|designers|sales`** — server-side lane filter when using Postgres (unknown lane → **400**).
- **`GET /api/jobs`** also supports **`q`** (substring search), **`jobType`** (`full_time` \| `hybrid` \| `part_time` \| `remote`; unknown → **400**), **`includeTotal=1`** (returns **`totalOpen`**), and cursor **`pagination`** — see **`docs/ROADMAP.md`** (Done).
- **`GET /api/jobs/[id]`** — public read for a single **open** vacancy (`404` + **`NOT_FOUND`** when missing or not open).
- **`POST /api/jobs` / `PATCH /api/jobs/[id]`** — optional `categorySlug` (string or `null` to clear on PATCH).

## Client

- **`src/lib/jobsApi.ts`** — passes `category`, `q`, `jobType`, and optional `includeTotal` to **`GET /api/jobs`**; **`fetchPublicJobById`** for **`GET /api/jobs/[id]`**; client behavior is API-only.
- **`VacancyCategoryField`** — recruiter vacancy form lane selector.
- **Job board** — lane + work-arrangement dropdowns + badges on listings; on Next **`/jobs`**, **`category`**, **`jobType`**, and **`q`** sync to the URL via **`app/_client/useJobBoardQuerySync.ts`** (shareable links; debounced **`q`**; compares to **`window.location.search`** when pushing updates so **`router.replace`** does not thrash if **`useSearchParams()`** lags after navigation).

## Next steps (not built here)

Per synthesis + **`docs/TALENTBRIDGE_MVP_PLAN.md`** + **`docs/ROADMAP_FROM_REFERENCE.md`**: **`category_fields`**, **`category_screening_questions`**, denormalized **search docs**, **`candidate_profiles`**, invitations/screenings — promote into **`docs/ROADMAP.md`** when prioritized.
