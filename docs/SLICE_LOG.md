# Slice log (execution record)

Chronological record of shipped slices and post-deploy checks. Update when merging to **`main`** and after prod verification.

| Date | Slice | Commit | Post-deploy |
|------|--------|--------|-------------|
| 2026-05-19 | Company onboarding + company-scoped vacancies (`0014`–`0015`) | `45d0aae` | `release:prod:smoke` ok · `db:check:migrations` ok (15) |
| 2026-05-19 | Docs: ROADMAP hygiene + post-deploy runbook | `99d608e` | `release:prod:smoke` ok · migrations ok (15) |
| 2026-05-19 | Email notification channel (Resend + ledger) | `b2f187e` | enable on prod when Resend configured |
| 2026-05-19 | Pipeline notes + status history (`0016`) | `51aee6e` | run `release:prod:db:apply` for `0016` |
| 2026-05-19 | Thin admin cockpit (summary + categories) | `54e3636` | requires `TALENTBRIDGE_ENABLE_ROLE_ADMIN=1` |
| 2026-05-19 | E2E: pipeline audit, admin APIs, email ledger | `f4c1053` | `test:e2e:auth` 34/34 |
| 2026-05-19 | Docs: prod email/admin runbook | `e3bd3ae` | configure Vercel per **`docs/PROD_EMAIL_ADMIN.md`** |

**After each prod deploy:** `npm run release:prod:db:check:migrations` → `npm run release:prod:smoke` (optionally `SMOKE_EXPECT_POSTGRES_READY=1`). Optional prod config: **`docs/PROD_EMAIL_ADMIN.md`**.
