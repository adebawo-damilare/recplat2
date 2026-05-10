# TalentBridge MVP plan (product + execution)

This is the **product-facing MVP narrative** for the main app in this repo, aligned with the strategy themes summarized in **`docs/SUPPORTING_NOTES.md`**. Deep requirements and screens for the broader platform live in **`recruit/docs/`** (reference only); **execution order** stays in **`docs/ROADMAP.md`**.

---

## 1. Vision

Build **one** recruiting product where hiring is organized by **talent lanes** (**categories**) that act as **structured templates**: over time each lane can gain its own profile fields, screening flows, ranking signals, and guidance—without forking separate products per niche.

**North-star questions**

- Recruiters: *Who is worth contacting?*
- Candidates: *What should I improve to become more hireable?* (served progressively via profiles, prompts, and later AI-assisted learning hooks.)

---

## 2. Positioning (beyond a job board)

Combined surface area over several releases:

| Pillar | Role |
|--------|------|
| Talent marketplace | Discovery and interest (roles ↔ people) |
| Discovery | Search, filters, category-aware relevance later |
| Candidate development | Profile quality, gaps, courses/practice (phased) |
| Screening | Async questions, summaries, evaluations (post–MVP data model) |
| AI-assisted workflow | Drafting, summarizing, recommending—**not** autonomous hiring decisions |

---

## 3. Product surfaces (full platform map)

Four major areas—the **TalentBridge codebase today** implements only a **thin slice** (jobs, applications, categories on vacancies—see §7).

### Candidate workspace

- Profile, lane selection, portfolio / proof-of-work  
- Improvement suggestions and learning hooks (later)  
- Screenings inbox, invites, prep (later)

### Recruiter workspace

- Company and roles (**vacancies** today), lane selection  
- Search and review (**job board + dashboards** today)  
- Invites, pipeline, comparisons (later)

### Admin console

- Category/template governance, moderation, catalogs, integrations, analytics (mostly later; **lane list** seeded in DB today)

### AI and automation

- Candidate-side assistance, company-side summaries/ranking (bounded), platform quality, workflow triggers—**human decides** hire/contact (see §5)

---

## 4. Category strategy

- Launch with **few** lanes so each stays **deep**, not shallow across dozens of labels.  
- **Implemented:** three MVP slugs (**marketers**, **designers**, **sales**) on **`vacancies`** via **`categories`** — see **`docs/CATEGORY_MODEL.md`**.  
- **Next:** per-lane **`category_fields`** and **`category_screening_questions`** (reference: **`recruit/docs/database-api-outline.md`**), promoted through **`docs/ROADMAP.md`** when prioritized.

---

## 5. AI principle (copilot, not hiring agent)

AI should assist with **extraction, summarization, matching, drafting, recommending, organizing**. Humans retain **who to contact, interview, and hire**.

Layering (conceptual—for routing features in specs and **`recruit/docs/api-contracts.md`**):

| Layer | Examples |
|--------|-----------|
| Candidate-side | Profile improvement, course suggestions, prep |
| Company-side | Role draft, semantic search/ranking summaries, screening summaries |
| Platform | Spam/quality, shared templates, test/course catalogs |
| Workflow | Triggered nudges after events (e.g. weak screening → suggested learning) |

**MVP risk bar:** structured outputs, auditable (`ai_audit_events`), editable by users; avoid opaque auto-reject.

---

## 6. Technical shape (target architecture)

Aligned with synthesis: **modular monolith** first—not microservices.

| Piece | MVP target | TalentBridge today |
|--------|----------------|---------------------|
| App surface | One primary web app | Next.js App Router |
| API | Single backend boundary | `app/api/*` route handlers |
| Data | Postgres source of truth | Companies, categories, vacancies, applications, audit (see migrations) |
| Search | Dedicated index for candidate/marketplace search | **Deferred** (list/filter APIs first) |
| Async work | Queue + workers (notifications, scoring, AI batches) | **Deferred** beyond route-level calls |
| Files | Portfolio storage | **Deferred** |
| Analytics | Events/warehouse | **Deferred** |

---

## 7. MVP scope boundaries

### In scope for platform MVP (conceptual—“full” MVP from synthesis / PRD)

When we say “hire loop MVP” in strategy docs, we mean roughly:

- Auth and roles  
- Candidate profiles (**not** fully implemented in TalentBridge root yet—reference describes target)  
- Company accounts  
- Category **templates** (lanes first; configurable fields later)  
- Discovery / search (**basic** listings today; richer search indexed later)  
- Invitations and screening (**not** in root Postgres schema yet)  
- Shortlist/pipeline (**not** in root schema yet)  
- Bounded AI assists (infra present; routes expand per **`recruit/docs/api-contracts.md`**)

### Explicitly defer (synthesis agrees)

Payroll, contracts, invoicing, **full ATS replacement**, deep HR integrations, and **opaque** fully automated hiring decisions.

### Implemented **now** in this repo (narrow vertical slice)

- Vacancy lifecycle with Postgres/Firestore duality  
- Applications  
- MVP **three** talent lanes tied to **`vacancies`**  
- **`GET /api/categories`**, category filter/listing UX  
- AI provider + **`ai_audit_events`** wiring  

Treat anything else in **`recruit/docs`** as **target** until it appears under **Done** in **`docs/ROADMAP.md`**.

---

## 8. Phased delivery (TalentBridge-oriented)

Use this alongside **`docs/ROADMAP_FROM_REFERENCE.md`** P0/P1 buckets.

| Phase | Focus | Relation to synthesis |
|-------|--------|------------------------|
| **A — Now** | Jobs + applies + Postgres + MVP lanes | Category **wedge** + stable API surface |
| **B — Structure** | RBAC/multi-member companies, **`category_fields`**, early candidate profiles | “Templates,” not shallow categories |
| **C — Marketplace loop** | Invitations → screening sessions → pipeline tables | Core “who is worth contacting?” |
| **D — Discovery scale** | Search index, workers, notifications depth | Modular monolith + async |

Exact ordering is tightened in **`docs/ROADMAP.md`** (“Next”) as commits land.

---

## 9. Document pipeline (formal collateral)

Suggested order when writing **formal** artifacts (strategy session + reference stack):

1. Product map (**`recruit/docs/product-map.md`** exists)  
2. **Full MVP spec** (narrow v1 shipped in TalentBridge—can stay a short appendix here or a standalone doc later)  
3. PRD (**`recruit/docs/recruiting-platform-prd.md`**)  
4. System design with AI (**`recruit/docs/system-design.md`**) once MVP stable  
5. Database + API outline (**`recruit/docs/database-api-outline.md`**) finalized **after** MVP + system boundaries lock  

TalentBridge **`docs/ROADMAP.md`** stays the **checklist for what we actually merge** next.

---

## 10. Related docs (index)

| Doc | Purpose |
|-----|---------|
| **`docs/ROADMAP.md`** | Execution backlog (Done / Next) |
| **`docs/CATEGORY_MODEL.md`** | Shipped lane model on vacancies |
| **`docs/SUPPORTING_NOTES.md`** | Short pointers + themes from external strategy (chats, etc.) |
| **`docs/REFERENCE_PARITY.md`** | What we adopted vs **`recruit/`** |
| **`docs/ROADMAP_FROM_REFERENCE.md`** | P0/P1 backlog from **`recruit/docs`** |

---

## 11. Review cadence

When scope shifts materially after merges, bump **Related** links in **`docs/REFERENCE_PARITY.md`** (**Last reviewed**) and add **Done** bullets to **`docs/ROADMAP.md`**.
