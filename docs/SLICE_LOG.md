# Slice log (execution record)

Chronological record of shipped slices and post-deploy checks. Update when merging to **`main`** and after prod verification.

| Date | Slice | Commit | Post-deploy |
|------|--------|--------|-------------|
| 2026-05-19 | Company onboarding + company-scoped vacancies (`0014`–`0015`) | `45d0aae` | `release:prod:smoke` ok · `db:check:migrations` ok (15) |
| 2026-05-19 | Docs: ROADMAP hygiene + post-deploy runbook | (this series) | — |
| 2026-05-19 | Email notification channel (Resend + ledger) | (pending) | — |
| 2026-05-19 | Pipeline notes + status history (`0016`) | (pending) | — |
| 2026-05-19 | Thin admin cockpit (summary + categories) | (pending) | — |

**After each prod deploy:** `npm run release:prod:db:check:migrations` → `npm run release:prod:smoke` (optionally `SMOKE_EXPECT_POSTGRES_READY=1`).
