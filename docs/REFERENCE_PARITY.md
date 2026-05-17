# Reference app parity (nested `recruit/` vs TalentBridge)

The nested **`recruit/`** tree is a **pattern reference only** (not a second product UI). This document tracks what we **adopted** in TalentBridge (`recruit2`) versus what the reference implements in full, so expectations stay clear as we add features.

**Last reviewed:** 2026-05-17 (promoted reference product/workflow learnings into roadmap; reaffirmed Firebase/local seed and JSON-store exclusions).

---

## Adopted in TalentBridge (done)

| Area | Reference idea | In TalentBridge |
|------|----------------|-----------------|
| Data | Postgres as source of truth, Neon-style URL | `DATABASE_URL`, `drizzle-orm` + `postgres` pool, `database/migrations/*.sql` |
| Schema | Relational companies + roles | `companies`, **`categories`**, `vacancies` (+ optional `category_id` FK), `applications`, `ai_audit_events` (not the full recruit ERD) |
| Categories | MVP talent lanes (“templates” wedge before `category_fields`) | **`GET /api/categories`**, `src/server/categories/*`, `src/shared/mvpCategories.ts`, migration `database/migrations/0002_categories.sql` |
| API | Many small `route.ts` handlers | `app/api/jobs/*`, **`app/api/categories`**, `app/api/applications`, `app/api/ai/health`, etc. |
| Auth (server) | “API resolves the user on the server” | Postgres users + bcrypt password hash + signed HTTP-only session cookie |
| AI | Provider switch + server-side audit | `TALENTBRIDGE_AI_PROVIDER`, `src/server/ai/*`, `ai_audit_events` |
| Ops | DB apply, smoke | `npm run db:apply`, `npm run smoke:api`, `npm run db:seed:samples` |
| Reads | Postgres API-backed listings and applications | Jobs Slice v1 **production** sets **`TALENTBRIDGE_JOBS_POSTGRES_ONLY`** + **`NEXT_PUBLIC_TALENTBRIDGE_JOBS_POSTGRES_ONLY`** for strict behavior (**`docs/MVP_JOBS_SLICE_V1.md`**) |
| Public reads | Job listings + detail | **`GET /api/jobs`** (filters, cursor, `includeTotal`), **`GET /api/jobs/[id]`** (open vacancies only), **`/jobs/[id]`** |
| UI | N/A | **We do not copy reference UI** — only TalentBridge components |
| CI | N/A (added for this repo) | `.github/workflows/ci.yml` — see `docs/CICD.md` |

---

## Intentionally not implemented (or removed)

| Reference | Why / current stance |
|-----------|----------------------|
| Full ERD: DB sessions, invitations, screening sessions, pipeline tables, moderation, search index, … | **Out of scope** for the first slice; add tables when product needs them (`docs/ROADMAP.md`). |
| `recruit` cookie + scrypt + `getRequestUser()` | Not copied verbatim; this repo uses a JWT session-cookie flow with Postgres-backed users. |
| `recruit` JSON file store + `db:backfill` from that world | Not used and should not be adopted; product ideas may be reused, but runtime data stays on Postgres-backed APIs. |
| `talentbridge` Firebase/local seed machinery | Not used and should not be adopted; keep demo data on repo-specific Postgres seed scripts. |
| Legacy migration tooling from non-Postgres stores | **Removed** — we standardize on SQL migrations plus app/API writes. |
| Reference app’s `smoke-api` / `backfill` scripts verbatim | Replaced with repo-specific `scripts/smoke-api.mjs`, `scripts/db-apply.mjs`, `scripts/seed-neon-sample.ts`. |

---

## Product ideas promoted from references

These are **not adopted as code yet**, but are now named in **`docs/ROADMAP.md`** so they can be scheduled intentionally:

| Reference learning | TalentBridge roadmap shape |
|--------------------|----------------------------|
| Company onboarding + team/company membership | Company-scoped recruiter setup and permissions |
| Follow-up feed | Pending invites, submitted screenings awaiting review, and copyable nudges |
| Pipeline notes + stage history | Lightweight auditable pipeline trail, not a full ATS |
| Notification contract with email delivery records | In-app notifications plus delivery ledger/outbox |
| Admin moderation and analytics surfaces | Thin admin cockpit once workflow events exist |
| Old TalentBridge candidate toolkit affordances | Resume builder and salary insights backlog |
| Public pricing/contact page | Launch support surface for paying/public milestone |

Adopt these as product/workflow lessons only; do not import `talentbridge` Firebase/local seed code or `recruit` JSON-store patterns.

---

## Partial / “same idea, different shape”

| Reference | TalentBridge |
|-----------|----------------|
| Dual local JSON vs Postgres | Postgres-only job/application APIs in this repo. |
| Neon HTTP driver (`@neondatabase/serverless`) | We use **`postgres` + `drizzle-orm/postgres-js`**; still valid for Vercel; can swap to Neon serverless later if needed. |

---

## How to use this file

- When you **intentionally** add a table or API from the reference, update **Adopted** or **Partial**.
- When you **defer** something, add a row under **Not implemented** or extend **`docs/ROADMAP.md`**.
- Keep **`Last reviewed`** current after substantive merges.

---

## Related docs

- `docs/ROADMAP.md` — forward-looking backlog  
- `docs/TALENTBRIDGE_MVP_PLAN.md` — MVP scope, phases, and synthesis-aligned boundaries  
- `docs/CATEGORY_MODEL.md` — how MVP category lanes ship in TalentBridge  
- `docs/MVP_JOBS_SLICE_V1.md` — Jobs Slice v1 milestone (Postgres-only job data flags)  
- `docs/ROADMAP_FROM_REFERENCE.md` — **feature ideas** extracted from `recruit/docs` for future phases  
- `docs/CICD.md` — branch workflow + CI  
- `docs/DEPLOYMENT_ENV.md` — Vercel env (Postgres / Redis), no auth secrets  
- `database/README.md` — schema apply + seed  
