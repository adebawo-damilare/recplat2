# Reference app parity (nested `recruit/` vs TalentBridge)

The nested **`recruit/`** tree is a **pattern reference only** (not a second product UI). This document tracks what we **adopted** in TalentBridge (`recruit2`) versus what the reference implements in full, so expectations stay clear as we add features.

**Last reviewed:** 2026-05-09 (categories slice; update this line when the table changes materially).

---

## Adopted in TalentBridge (done)

| Area | Reference idea | In TalentBridge |
|------|----------------|-----------------|
| Data | Postgres as source of truth, Neon-style URL | `DATABASE_URL`, `drizzle-orm` + `postgres` pool, `database/migrations/*.sql` |
| Schema | Relational companies + roles | `companies`, **`categories`**, `vacancies` (+ optional `category_id` FK), `applications`, `ai_audit_events` (not the full recruit ERD) |
| Categories | MVP talent lanes (“templates” wedge before `category_fields`) | **`GET /api/categories`**, `src/server/categories/*`, `src/shared/mvpCategories.ts`, migration `database/migrations/0002_categories.sql` |
| API | Many small `route.ts` handlers | `app/api/jobs/*`, **`app/api/categories`**, `app/api/applications`, `app/api/ai/health`, etc. |
| Auth (server) | “API resolves the user on the server” | Firebase **ID token** + **Firebase Admin** verify (not cookie + scrypt + DB sessions) |
| AI | Provider switch + server-side audit | `TALENTBRIDGE_AI_PROVIDER`, `src/server/ai/*`, `ai_audit_events` |
| Ops | DB apply, smoke | `npm run db:apply`, `npm run smoke:api`, `npm run db:seed:samples` |
| Reads | Optional legacy store | When `DATABASE_URL` unset, Firestore listing still used for jobs list path in parts of the stack |
| UI | N/A | **We do not copy reference UI** — only TalentBridge components |
| CI | N/A (added for this repo) | `.github/workflows/ci.yml` — see `docs/CICD.md` |

---

## Intentionally not implemented (or removed)

| Reference | Why / current stance |
|-----------|----------------------|
| Full ERD: DB sessions, invitations, screening sessions, pipeline tables, moderation, search index, … | **Out of scope** for the first slice; add tables when product needs them (`docs/ROADMAP.md`). |
| `recruit` cookie + scrypt + `getRequestUser()` | We use **Firebase client auth + Admin token** until a Supabase (or other) auth migration. |
| JSON file store + `db:backfill` from that world | Not used. |
| Firestore → Postgres vacancy migration tool | **Removed** — we standardize on `db:seed:samples` and app/API writes. |
| Reference app’s `smoke-api` / `backfill` scripts verbatim | Replaced with repo-specific `scripts/smoke-api.mjs`, `scripts/db-apply.mjs`, `scripts/seed-neon-sample.ts`. |

---

## Partial / “same idea, different shape”

| Reference | TalentBridge |
|-----------|----------------|
| Dual local JSON vs Postgres | **Postgres** when `DATABASE_URL` set, else **Firestore** for some job reads (see `src/server/jobs/index.ts`). |
| Neon HTTP driver (`@neondatabase/serverless`) | We use **`postgres` + `drizzle-orm/postgres-js`**; still valid for Vercel; can swap to Neon serverless later if needed. |

---

## How to use this file

- When you **intentionally** add a table or API from the reference, update **Adopted** or **Partial**.
- When you **defer** something, add a row under **Not implemented** or extend **`docs/ROADMAP.md`**.
- Keep **`Last reviewed`** current after substantive merges.

---

## Related docs

- `docs/ROADMAP.md` — forward-looking backlog  
- `docs/CATEGORY_MODEL.md` — how MVP category lanes ship in TalentBridge  
- `docs/ROADMAP_FROM_REFERENCE.md` — **feature ideas** extracted from `recruit/docs` for future phases  
- `docs/CICD.md` — branch workflow + CI  
- `docs/DEPLOYMENT_ENV.md` — Vercel env (Postgres / Redis), no auth secrets  
- `database/README.md` — schema apply + seed  
