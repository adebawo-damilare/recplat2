# Production: email notifications and platform admin

Use this after deploying to Vercel **Production**. Pair with **`docs/RELEASE_JOBS_SLICE_V1.md`** §6 (migrations + smoke).

## Post-deploy commands

```bash
npm run release:prod:db:check:migrations
npm run release:prod:smoke
```

Record results in **`docs/SLICE_LOG.md`**.

---

## Email notifications (Resend)

Enables a second delivery attempt for every **`createNotification`** (screening invite/submit, etc.). In-app delivery is unchanged; **`notification_delivery_log`** gains rows with **`channel: email`**.

| Vercel Production variable | Value |
|--------------------------|--------|
| `TALENTBRIDGE_EMAIL_ENABLED` | `1` |
| `RESEND_API_KEY` | Your Resend API key |
| `TALENTBRIDGE_EMAIL_FROM` | Verified sender, e.g. `TalentBridge <notifications@yourdomain.com>` |
| `NEXT_PUBLIC_APP_URL` or `TALENTBRIDGE_APP_URL` | `https://recplat2.vercel.app` (or your prod URL) |

**Redeploy** after changing env vars.

**Verify:** trigger a screening invite → in Neon:

```sql
SELECT channel, status, detail, created_at
FROM notification_delivery_log
ORDER BY created_at DESC
LIMIT 10;
```

Expect **`email`** / **`sent`** (or **`skipped`** / **`failed`** with detail if misconfigured).

---

## Platform admin cockpit

Gates **`/api/admin/*`**, **Platform admin** UI, and **Platform account roles** on `/dashboard/company`.

| Vercel Production variable | Value |
|--------------------------|--------|
| `TALENTBRIDGE_ENABLE_ROLE_ADMIN` | `1` |
| `TALENTBRIDGE_ROLE_ADMIN_EMAILS` | Comma-separated recruiter emails, e.g. `you@company.com,ops@company.com` |

**Verify (signed in as allowlisted recruiter):**

1. Open **`/dashboard/company`** → **Platform admin** section with user/job counts.
2. Toggle a category **Active/Inactive** (restores easily).
3. **`GET /api/auth/session`** → **`canManageUserRoles: true`**.

Non-allowlisted recruiters must **not** see Platform admin (API returns **`403 FORBIDDEN_ADMIN`**).

---

## E2E / CI (not for Production)

These are set automatically in **GitHub Actions** and local **`npm run test:e2e:auth`** — **do not** set on Production:

| Variable | Purpose |
|----------|---------|
| `TALENTBRIDGE_E2E_ADMIN_RECRUITERS` | Allow `@example.test` recruiters as platform admins |
| `TALENTBRIDGE_E2E_FAKE_EMAIL` | Record fake **`email`/`sent`** without Resend |
| `TALENTBRIDGE_E2E_EXPOSE_NOTIFICATION_DELIVERY` | Expose delivery ledger on **`GET /api/notifications/mine?includeDelivery=1`** |

Specs: **`recruiter-pipeline-audit.spec.ts`**, **`recruiter-admin.spec.ts`**, **`recruiter-notification-email.spec.ts`**.
