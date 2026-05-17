# Roadmap candidates from reference docs (`recruit/docs`)

How this backlog maps to **live TalentBridge MVP phases** (synthesis + execution): **`docs/TALENTBRIDGE_MVP_PLAN.md`** (especially §7–§8). **`docs/ROADMAP.md`** stays the merged “what ships next” list.

---

Scanned reference documentation:

| Document | Focus |
|----------|--------|
| [`README.md`](../recruit/docs/README.md) | Index of all docs |
| [`roadmap.md`](../recruit/docs/roadmap.md) | Phased product vision |
| [`recruiting-platform-prd.md`](../recruit/docs/recruiting-platform-prd.md) | MVP scope, flows, roles |
| [`product-map.md`](../recruit/docs/product-map.md) | Surfaces and screens |
| [`system-design.md`](../recruit/docs/system-design.md) | Modular monolith modules |
| [`database-api-outline.md`](../recruit/docs/database-api-outline.md) | Tables + API sketch |
| [`api-contracts.md`](../recruit/docs/api-contracts.md) | Stable AI/workflow contracts |
| [`implementation-status.md`](../recruit/docs/implementation-status.md) | What reference app built |
| [`release-checklist.md`](../recruit/docs/release-checklist.md) | Ship checklist |

Use this list to **prioritize** TalentBridge work—not everything belongs in v1. Items marked **TB partial** already exist in a simpler form.

---

## P0 — Structural (matches TalentBridge direction)

| Feature | Why it’s useful | Reference detail |
|--------|------------------|-------------------|
| **RBAC + company membership** | Multi-user companies, safe recruiter vs candidate vs admin | `users`, `company_members`, roles in DB (`database-api-outline`) |
| **Category template engine** | Repeatable profile + screening shapes per domain | `categories`, `category_fields`, `category_screening_questions` |
| **Candidate profiles + dynamic fields** | Structured discovery vs free-text blobs | `candidate_profiles`, `profile_field_values` |
| **Portfolio / proof-of-work** | Evidence beyond résumé | `portfolio_items` |
| **Search index layer** | Fast filtered candidate discovery | Denormalized search docs + filters (`api-contracts` § Search) |
| **Invitations + screening sessions** | Core marketplace loop | Invitation → screening → answers (`api-contracts` § Invitation, Screening) |
| **Pipeline / shortlist per role** | Hiring stages without full ATS | Pipeline contract, stage history |
| **In-app notifications (+ optional email log)** | Workflow awareness | Notification contract |
| **Moderation queue (admin)** | Trust + spam control | `moderation_flags`, admin review |

---

## Promoted follow-up slices

These are now explicitly promoted into **`docs/ROADMAP.md`** as useful ideas to adopt from the reference projects, while still deferring implementation until the team picks the next slice:

| Slice | Source signal | TalentBridge adoption shape |
|-------|---------------|-----------------------------|
| **Recruiter company onboarding + company membership** | `recruit` product map and company-member schema | Company-scoped recruiter setup and permissions; no reference auth/session code copied |
| **Recruiter follow-up queue** | `recruit/docs/api-contracts.md` follow-up contract and implemented feed | Pending invites, submitted screenings awaiting review, and recruiter nudges |
| **Pipeline notes + stage history** | Pipeline contract, `pipeline_stage_changes`, candidate notes | Auditable status changes and lightweight notes, not a full ATS replacement |
| **Notification delivery ledger** | Notification contract includes in-app notification plus email delivery record | Observable workflow events and future email outbox support |
| **Thin admin moderation + analytics cockpit** | Admin console, moderation queue, analytics dashboard | Minimal admin review and platform counts before deeper admin tooling |
| **Candidate career toolkit** | Old `talentbridge` candidate dashboard exposed Resume Builder and Salary Insights | Candidate-development backlog after richer profiles and category fields |
| **Public pricing/contact page** | `recruit/docs/product-map.md` public surface | Paying/public milestone support page, separate from workflow screens |

These are **product/workflow learnings only**. Do not reuse `talentbridge` Firebase/local seed machinery or `recruit` local JSON-store/backfill patterns.

---

## P1 — AI assist (contracts worth implementing)

From [`api-contracts.md`](../recruit/docs/api-contracts.md)—keep outputs **structured**, human-editable, audited:

| Capability | Contract summary |
|-------------|-------------------|
| **Role draft** | Plain-English + category → structured criteria; store raw + normalized |
| **Candidate summary** | Profile + role context → strengths/gaps/fit (no autonomous hire decision) |
| **Screening summary** | Answers → recruiter-facing summary (only visible data) |
| **Profile improvement suggestions** | Profile + template → suggestions (candidate can ignore) |
| **Course / learning recommendations** | Aligns with PRD “learning” slice |
| **Test generation** | Short tests / practice items (PRD Phase 3 hooks) |

TalentBridge already has **provider switching + `ai_audit_events`**—extend with route handlers per contract as features ship.

---

## P2 — Product surfaces (from PRD + product-map)

Worth scheduling when backend exists (TalentBridge UI patterns only):

| Surface | Notes |
|---------|--------|
| **Category browse** (public) | Discovery entry |
| **Candidate workspace** | Onboarding, profile studio, portfolio, screening inbox |
| **Recruiter workspace** | Company onboarding, role builder, search results, invite modal, pipeline board, notes |
| **Admin console** | Categories, field templates, screening templates, moderation, analytics |
| **Plain-English role builder UI** | Feeds AI role-draft API |

---

## P3 — Reference roadmap phases (longer arc)

From [`roadmap.md`](../recruit/docs/roadmap.md):

| Phase | Themes |
|-------|--------|
| **Quality & trust** | Moderation depth, verification signals, richer summaries, matching, analytics |
| **Learning & assessment** | Courses, generated micro-courses, aptitude tests, third-party test integrations |
| **Marketplace maturity** | Network effects, company collaboration, recommendations, category expansion |

---

## Ops & delivery (reuse ideas, not code)

From [`release-checklist.md`](../recruit/docs/release-checklist.md):

- Migrate/seed discipline before prod cutover  
- **`smoke:api`** (or expanded suite) after deploy  
- Spot-check **candidate / recruiter / admin** flows when those surfaces exist  
- Post-deploy smoke on **live URL** + log watch  
- Align with **`docs/DEPLOYMENT_ENV.md`** + **`docs/CICD.md`** for TalentBridge

---

## Explicitly lower priority / out of scope for now

From PRD **out of scope**: payroll, contracts, invoicing, full ATS replacement, live video, deep HRIS, automated hiring decisions, marketplace escrow.

Infrastructure exclusions: do not adopt the old Firebase/local seed machinery from `talentbridge/`, and do not adopt `recruit/` local JSON-store or JSON backfill patterns. TalentBridge stays on its Postgres/API path.

---

## How to use this doc

1. Pull 1–2 **P0** items into **`docs/ROADMAP.md`** “Next” when you start them.  
2. Keep **`docs/REFERENCE_PARITY.md`** updated when a slice lands.  
3. Treat **`recruit/docs/api-contracts.md`** as the **spec** when adding AI or screening endpoints—adapt naming to TalentBridge (`TALENTBRIDGE_*`, existing audit tables).
