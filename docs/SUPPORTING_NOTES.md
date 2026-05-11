# Supporting notes (external strategy sessions)

Product strategy from **outside conversations** (email, other AI chats, meetings) should be **summarized here** or in **`docs/TALENTBRIDGE_MVP_PLAN.md`**—not left only in long raw exports in-repo (they go stale and duplicate the MVP plan).

**Consolidated product intent (themes + MVP framing):** **`docs/TALENTBRIDGE_MVP_PLAN.md`**. Until promoted to **`docs/ROADMAP.md`**, treat strategy notes as **non-authoritative** for shipping.

## How to use it

| Source | Role |
|--------|------|
| **`docs/TALENTBRIDGE_MVP_PLAN.md`** | **MVP narrative**: positioning, workspaces, MVP in/out/defer, AI-as-copilot, phased delivery, formal doc ordering—**this file** is where prior synthesis now lives. Does **not** replace **`ROADMAP.md`** for day-to-day execution. |
| **`docs/MVP_JOBS_SLICE_V1.md`** | **First public milestone** (named **Jobs Slice v1**): Postgres for vacancies + applications, env flags, release checklist. |
| **`docs/RELEASE_JOBS_SLICE_V1.md`** | **Production go-live** order: merge `main`, prod env, migrations on prod DB, smoke, manual sanity. |
| **`docs/RELEASE_CREDENTIAL_FILLING.md`** | **`release-production.credentials.template` → `.env.release`**: fill prod keys safely, run `release:prod:*` scripts. |
| **`docs/ROADMAP.md`** | **Single place to decide what TalentBridge builds next.** When you agree with something in the MVP plan or a new strategy note, **promote it here** as a numbered “Next” item or Done bullet. |
| **`docs/ROADMAP_FROM_REFERENCE.md`** | **Idea backlog** aligned with **`recruit/docs/`** PRD/outline. Overlaps synthesis (templates, few categories, modular monolith, search/workers deferred). Dedupe consciously. |
| **`docs/REFERENCE_PARITY.md`** | **Scope tracker** versus the nested **`recruit/`** codebase. Update when you resurrect something we previously marked “not implemented.” |
| **`docs/CATEGORY_MODEL.md`** | **Implemented slice** applying “categories as templates”: MVP lanes on **`vacancies`**, **`GET /api/categories`**, `GET /api/jobs?category=`. |

## Themes (shortcut—was captured from an external strategy session)

Summarized **non-authoritative**—the same ideas are threaded into **`docs/TALENTBRIDGE_MVP_PLAN.md`**; confirm execution in **`docs/ROADMAP.md`**:

1. **Category-based platform**: one product, multiple **category templates** (fields, screening, signals), expand categories only after demand.
2. **Launch wedge**: prefer **a few categories first** (e.g. marketer / designer / sales) over many shallow ones.
3. **Architecture**: modular **monolith**—API, relational DB, **search index**, **job queue**, analytics later.
4. **MVP boundaries**: profiles, categories, search, invites, screening, shortlist — defer payroll/contracts/full ATS and opaque autonomous hire decisions.
5. **Doc pipeline** (their suggested order): product map → **full MVP spec** → PRD → **system design** → **database + API** (**after** MVP scope stabilizes—in practice DB/API drafts iterate with MVP; see **`TALENTBRIDGE_MVP_PLAN.md`** §9).
6. **AI layers**: candidate-side suggestions, company-side summaries/ranking/tests, platform spam/quality, workflow triggers—**humans hire**.

## Maintainer hygiene

- Prefer **short deltas** in **`ROADMAP.md`** over pasting long chat exports into **`docs/`**.
- When strategy changes materially, update **`docs/TALENTBRIDGE_MVP_PLAN.md`** first; add a dated one-line note here only if you need a paper trail.
