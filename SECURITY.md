# Security and Data Privacy — ReputAI

This document describes how ReputAI protects its data and its users. ReputAI handles public Google reviews for dental clinics, staff accounts, Google access tokens and AI-generated replies. The biggest risk for a dental clinic is a public reply that shows a patient's health details, so the controls below start there.

## 1. Data We Store

| Data | Where | Sensitivity | Why we keep it |
| --- | --- | --- | --- |
| Google reviews (author display name, rating, text, date) | PostgreSQL (`Review`) | Public on Google, but can contain health details | Triage, drafting, reports |
| Reply drafts and posted replies, staff notes | `Reply` | Internal until posted | Approval workflow, history |
| Staff accounts (name, email, password hash, role) | `User` | Personal data | Sign-in and roles |
| Google OAuth tokens | `GoogleConnection` | Secret | Read reviews and post replies |
| Audit log, overrides, alerts | `AuditLog`, `ComplianceOverride`, `Alert` | Internal | Accountability (FR17) |

We do not store patient records, treatment plans, phone numbers or payment data. Reviewers are identified only by the display name that Google shows publicly.

## 2. Patient Privacy in Replies (PHIPA)

- **Rules first.** `src/lib/compliance.ts` checks every draft, edited reply and template. A reply that mentions a treatment, diagnosis, medication or health condition gets a **BLOCK** flag. A BLOCK reply cannot be submitted or approved, and a manager cannot override it.
- **The AI cannot remove a BLOCK.** The model-based tone check can only add WARN flags. If the model call fails, the rule check still runs.
- **Revise loop.** The LangGraph pipeline revises a blocked draft up to 2 times. If it is still blocked, it stays blocked.
- **Human approval.** Nothing is posted to Google unless a manager approves it. A WARN override needs a reason from a fixed list, and it is saved with the manager, the reason and the rules.
- **Privacy escalation.** Reviews that describe a privacy breach get the `PRIVACY_RISK` level, the highest priority and a 4-hour reply due time. The draft asks the reviewer to contact the clinic privately and does not repeat the details.
- **Tested.** The 30-review dental test set (`docs/pipeline-eval.md`) includes privacy, legal and prompt-injection reviews. All 30 final drafts passed the rule check.

## 3. Authentication and Access Control

- **Sign-in:** Auth.js credentials provider. Passwords are hashed with bcrypt (cost 10). Sessions are signed JWT cookies (`AUTH_SECRET`).
- **Route protection:** `src/proxy.ts` sends every request without a session to `/login`, except the landing page, the auth routes and the job routes (which use their own secret).
- **Roles:** two roles, Agent and Manager (FR12). Every server action starts with `requireUser()` or `requireManager()` from `src/lib/guard.ts`. Manager-only actions: approve and post, send back, WARN override, brand voice, templates, locations, Google connection, SLA check, flagged export and the audit log.
- **Organization isolation:** every query is filtered by the user's `organizationId`. Actions that take a review or reply ID first check that it belongs to the user's organization (`assertReviewInOrg`, `assertReplyInOrg`). A user cannot read or change another organization's data by changing an ID.
- **Tested:** the end-to-end tests check that pages need a session and that an agent cannot open the audit log or the export.

## 4. Secrets

- All secrets are environment variables: `AUTH_SECRET`, `GITHUB_MODELS_TOKEN`, `TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`, `RESEND_API_KEY`, `GOOGLE_CLIENT_SECRET` and `DATABASE_URL`. Locally they are in `.env` (ignored by git). In production they are encrypted Vercel environment variables.
- Production uses its own `AUTH_SECRET`, `TOKEN_ENCRYPTION_KEY` and `CRON_SECRET`, different from the local values.
- **Secrets check (November 15, 2026):** we searched the full git history and the working tree for API key, Resend, GitHub and database URL patterns. No secret was found. `.env` and `.env.local` were never committed.
- Google access and refresh tokens are encrypted with AES-256-GCM (`src/lib/crypto.ts`) before they are saved.

## 5. Rate Limits and Abuse

Rate limits use a fixed window stored in PostgreSQL (`RateLimit` table), so they work on serverless functions without Redis (`src/lib/rate-limit.ts`).

| Action | Limit |
| --- | --- |
| AI draft | 20 per minute per user |
| Review sync (manual) | 5 per minute per organization |
| Sign-in | 10 attempts per 15 minutes per email |
| Flagged export | 10 per minute per user |

Other controls:

- **Job routes** (`/api/jobs/sync`, `/api/jobs/sla`) need `Authorization: Bearer <CRON_SECRET>`. The secret is compared in constant time. Without `CRON_SECRET` set, every request is refused.
- **Input limits:** reply 4,000 characters, template 2,000, brand voice tone 300, location name 120.
- **CSV injection:** the flagged export adds a quote in front of cells that start with `=`, `+`, `-` or `@`, so review text cannot run as a spreadsheet formula.
- **Prompt injection:** review text is sent to the model only as quoted data. A review that tells the model to "admit fault" or "guarantee a refund" still goes through the rule check and manager approval (test case T29).
- **Security headers** (`next.config.ts`): `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy` and `Permissions-Policy`. The `X-Powered-By` header is off.

## 6. Third-Party Services

| Service | Data sent | Purpose |
| --- | --- | --- |
| OpenAI (through the OpenAI-compatible API) | Review text, star rating, brand voice, draft text | Triage, drafting, tone check |
| Google Business Profile API | OAuth tokens, reply text | Read reviews, post replies |
| Resend | Manager email, reviewer display name, location, review link | SLA reminder email |
| Vercel and Neon | All app data (hosting and database, encrypted in transit with TLS) | Hosting |

We do not send staff passwords, tokens or the audit log to the AI model. The OpenAI API does not use API data to train models by default.

## 7. Audit, Monitoring and Backups

- **Audit log (FR17):** Google connect and disconnect, reply approved, WARN override, reply posted, sync errors, SLA alerts and flagged exports. Managers see it in **Settings → Audit log**.
- **Monitoring:** Vercel function logs. The job routes write one summary line per run (`[job:sync]`, `[job:sla]`). Failed syncs are also saved in the audit log.
- **Backups:** Neon keeps point-in-time restore history for the database. Before a release we also take a manual dump (see the README).

## 8. Data Retention and Deletion

- Deleting an organization deletes its locations, reviews, replies, alerts, audit log and Google connection (cascade delete).
- **Settings → Google → Disconnect** deletes the stored Google tokens.
- Reviews deleted on Google stay in ReputAI until the organization removes them. In a real release we would add an automatic clean-up.

## 9. Known Limits

- `npm audit` reports one high-severity issue in `deepmerge-ts`, used only by the Prisma CLI config loader at build time. User input never reaches it. The fix needs Prisma 7 (a breaking upgrade), so we plan it after the course.
- The demo uses the mock review provider, because Google did not approve Business Profile API access in time (Stakeholder Review 3, D6). The Google code path, token encryption and retries are built and tested with mocks.
- Email is sent from Resend's test sender, so it reaches only the account owner. A real release needs a verified domain.
- The preview (staging) deployments share the production Neon database in this course project. A real release would use a separate Neon branch.
