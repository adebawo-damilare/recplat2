# Supporting notes (external strategy sessions)

Some product strategy was captured outside this repo’s canonical docs—for example **`docs/interraction with another ai.txt`** (verbatim export from another AI session).

## How to use it

| Source | Role |
|--------|------|
| **`docs/interraction with another ai.txt`** | Raw **archive**. Category-platform thinking: architecture diagrams, MVP ordering, modules (auth, category templates, profiles, screening, search, messaging, pipeline, admin, analytics), phased doc order (product map → MVP spec → PRD → system design → DB/API), Go-to-market ideas, expanded table lists. |
| **`docs/ROADMAP.md`** | **Single place to decide what TalentBridge builds next.** When you agree with something in the transcript, **promote it here** as a numbered “Next” item or Done bullet. |
| **`docs/ROADMAP_FROM_REFERENCE.md`** | **Idea backlog** aligned with **`recruit/docs/`** PRD/outline. Useful overlap with the transcript (categories-as-templates, 2–3 categories at launch, modular monolith, search index, workers). Dedupe consciously when both mention the same feature. |
| **`docs/REFERENCE_PARITY.md`** | **Scope tracker** versus the nested **`recruit/`** codebase. Update when you resurrect something we previously marked “not implemented.” |

## Themes from the archived session (shortcut)

Summarized **non-authoritative**—confirm in **`docs/ROADMAP.md`** before treating as commitments:

1. **Category-based platform**: one product, multiple **category templates** (fields, screening, signals), expand categories only after demand.
2. **Launch wedge**: prefer **a few categories first** (e.g. marketer / designer / sales) over many shallow ones.
3. **Architecture**: modular **monolith**—API, relational DB, **search index**, **job queue**, analytics later.
4. **MVP boundaries**: profiles, categories, search, invites, screening, shortlist — defer payroll/contracts/full ATS.
5. **Doc pipeline** (their suggested order): product map → **MVP spec** → formal PRR → **system design** → **database + API** tied to MVP.
6. **AI layers**: candidate-side suggestions, company-side summaries/ranking/tests, platform spam/quality workflow triggers.

## Maintainer hygiene

- Prefer **short deltas** in `ROADMAP.md` over copying the full `.txt` into new markdown files.
- If the transcript grows stale, add a note at the top of this file (**“Archived as of DATE; see ROADMAP for current intent”**).
