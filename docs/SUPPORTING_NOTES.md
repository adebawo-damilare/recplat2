# Supporting notes (external strategy sessions)

Some product strategy was captured outside this repo’s canonical docs—for example **`docs/interraction with another ai.txt`** (verbatim export from another AI session).

**Consolidated product intent (including synthesis themes + MVP framing):** **`docs/TALENTBRIDGE_MVP_PLAN.md`**. The transcript stays **verbatim** and **non-authoritative** until items are promoted to **`docs/ROADMAP.md`**.

## How to use it

| Source | Role |
|--------|------|
| **`docs/interraction with another ai.txt`** | Raw **archive**. Category-platform thinking: architecture diagrams, MVP ordering, modules (auth, category templates, profiles, screening, search, messaging, pipeline, admin, analytics), phased doc order (product map → MVP spec → PRD → system design → DB/API), Go-to-market ideas, expanded feature tables. |
| **`docs/TALENTBRIDGE_MVP_PLAN.md`** | **MVP narrative** distilled from synthesis + **`recruit/`** references: positioning, workspaces, MVP in/out/defer, AI-as-copilot, phased delivery, formal doc ordering. Does **not** replace **`ROADMAP.md`** for day-to-day execution. |
| **`docs/ROADMAP.md`** | **Single place to decide what TalentBridge builds next.** When you agree with something in the transcript or MVP plan, **promote it here** as a numbered “Next” item or Done bullet. |
| **`docs/ROADMAP_FROM_REFERENCE.md`** | **Idea backlog** aligned with **`recruit/docs/`** PRD/outline. Overlaps synthesis (templates, few categories, modular monolith, search/workers deferred). Dedupe consciously. |
| **`docs/REFERENCE_PARITY.md`** | **Scope tracker** versus the nested **`recruit/`** codebase. Update when you resurrect something we previously marked “not implemented.” |
| **`docs/CATEGORY_MODEL.md`** | **Implemented slice** applying “categories as templates”: MVP lanes on **`vacancies`**, **`GET /api/categories`**, `GET /api/jobs?category=`. |

## Themes from the archived session (shortcut)

Summarized **non-authoritative**—the same ideas are threaded into **`docs/TALENTBRIDGE_MVP_PLAN.md`**; confirm execution in **`docs/ROADMAP.md`**:

1. **Category-based platform**: one product, multiple **category templates** (fields, screening, signals), expand categories only after demand.
2. **Launch wedge**: prefer **a few categories first** (e.g. marketer / designer / sales) over many shallow ones.
3. **Architecture**: modular **monolith**—API, relational DB, **search index**, **job queue**, analytics later.
4. **MVP boundaries**: profiles, categories, search, invites, screening, shortlist — defer payroll/contracts/full ATS and opaque autonomous hire decisions.
5. **Doc pipeline** (their suggested order): product map → **full MVP spec** → PRD → **system design** → **database + API** (**after** MVP scope stabilizes—in practice DB/API drafts iterate with MVP; see **`TALENTBRIDGE_MVP_PLAN.md`** §9).
6. **AI layers**: candidate-side suggestions, company-side summaries/ranking/tests, platform spam/quality, workflow triggers—**humans hire**.

## Maintainer hygiene

- Prefer **short deltas** in `ROADMAP.md` over copying the full `.txt` into new markdown files.
- Prefer updating **`docs/TALENTBRIDGE_MVP_PLAN.md`** when synthesis-level strategy changes, then link from here instead of lengthening this file.
- If the transcript grows stale, add a note at the top of this file (**“Archived as of DATE; see TALENTBRIDGE_MVP_PLAN + ROADMAP for current intent”**).
