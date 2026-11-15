# ReputAI — CPAN 324 Phase III

ReputAI is an AI review operations platform for multi-location dental groups (Group 5). It collects Google reviews for all locations in one inbox and sorts them by priority. It drafts on-brand replies with AI and checks each draft for unsafe content. A manager approves every reply before it posts. Overdue reviews create alerts, and the Insights page shows how each location is doing.

- **Production:** https://reputai-tau.vercel.app
- **Repository:** https://github.com/gurkiratz/reputai
- **Demo logins:** `manager@brightsmile.example` and `agent@brightsmile.example`, password `password123`
- **Security and privacy:** see [SECURITY.md](./SECURITY.md)

## Features

| Area | What it does |
| --- | --- |
| Review sync | Pulls reviews for every location. Runs every 15 minutes (scheduled job) or with **Sync reviews now**. `REVIEW_PROVIDER=google` uses the Google Business Profile API. `mock` uses sample dental reviews |
| AI pipeline | LangGraph graph: classify → draft → compliance → revise (max 2). Sets sentiment, topics, escalation level, priority score and reply due time |
| Compliance check | Rules first: patient health details = BLOCK (cannot be posted or overridden); liability, promises and avoided topics = WARN. An AI tone check can only add WARN flags. Also runs on templates |
| Inbox | All locations in one list. Filters for location, status, sentiment and overdue. Priority, escalation and overdue badges |
| Approval | Agent submits, manager approves or sends back. A manager can approve WARN flags with a reason; the override is saved |
| SLA alerts | The SLA check finds reviews past their due time. It creates an in-app alert (**Alerts** page) and emails the managers once per review |
| Insights | Total, % answered, average response time, overdue now, replied on time, open escalations, 6-week sentiment trend, top topics, repeated complaints and a per-location table |
| Flagged export | Managers export flagged reviews (escalated or with compliance flags) as CSV |
| Audit log | Google connect and disconnect, approvals, overrides, posts, sync errors, SLA alerts and exports (**Settings → Audit log**, managers only) |
| Brand voice, templates, locations, Google | Settings pages. Managers change them; agents can view |

The weekly summary email was cut (Stakeholder Review 3, D3).

## Installation Guide (Local)

### 1. Prerequisites

- Node.js 24 (Node 20 or later works) and npm
- Docker (Docker Desktop or OrbStack) for the local PostgreSQL database
- An OpenAI API key (or a GitHub Models token)
- Optional: a Resend API key for SLA emails

### 2. Install and start the database

```bash
git clone https://github.com/gurkiratz/reputai.git
cd reputai
npm install
docker compose up -d          # PostgreSQL 16 on localhost:5433
cp .env.example .env
```

### 3. Fill in `.env`

| Variable | Required | Value |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Keep the default from `.env.example` for Docker |
| `AUTH_SECRET` | Yes | Run `npx auth secret` or `openssl rand -base64 33` |
| `GITHUB_MODELS_TOKEN` | Yes | Your OpenAI API key (or GitHub Models token) |
| `GITHUB_MODELS_BASE_URL` | Yes | `https://api.openai.com/v1` for OpenAI (`https://models.github.ai/inference` for GitHub Models) |
| `GITHUB_MODELS_MODEL` | Yes | `gpt-4o-mini` for OpenAI (`openai/gpt-4o-mini` for GitHub Models) |
| `REVIEW_PROVIDER` | Yes | `mock` (sample reviews) or `google` |
| `APP_URL` | Yes | `http://localhost:3000` |
| `TOKEN_ENCRYPTION_KEY` | Yes | `openssl rand -base64 32` |
| `CRON_SECRET` | Yes | `openssl rand -hex 24`. Protects the job routes |
| `RESEND_API_KEY` | For email | Resend API key |
| `EMAIL_FROM` | For email | `ReputAI <onboarding@resend.dev>` (or an address on a verified domain) |
| `SLA_EMAIL_TO` | Optional | Send SLA emails to this address instead of the managers. With the Resend test sender, use the Resend account email |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | For Google | Google OAuth client (Web application) |

The variable names start with `GITHUB_MODELS_` for history. Any OpenAI-compatible API works.

### 4. Create the tables and the demo data

```bash
npm run db:migrate            # applies all migrations
npm run db:seed               # demo group, 2 locations, 2 users, templates, 15 reviews
```

The seed runs AI triage on each review, so it takes about a minute and needs the AI key.

### 5. Run

```bash
npm run dev                   # http://localhost:3000
```

Sign in with a demo login. To check the AI key: `npx tsx --env-file=.env scripts/smoke-ai.ts` (it must print two drafts).

To reset the demo data: `npx prisma migrate reset`, then `npm run db:seed`.

### Use real Google reviews

1. In Google Cloud Console, enable the **My Business Account Management**, **My Business Business Information** and **Google My Business** APIs. The project must have Business Profile API access.
2. Create an OAuth client ID (Web application). Add `<APP_URL>/api/google/callback` as an authorized redirect URI.
3. Set `REVIEW_PROVIDER="google"` and the Google variables. Restart the app.
4. Sign in as the manager. Go to **Settings → Google**, click **Connect Google account**, and link each location.

If Google is not available, set `REVIEW_PROVIDER="mock"` and restart.

## Deployment Plan

### Environments

| Environment | Where | Database | Deploys when |
| --- | --- | --- | --- |
| Local | `npm run dev` | Docker PostgreSQL | Each developer |
| Staging | Vercel preview deployment (one URL for each branch or pull request) | Neon | Push to any branch other than `main` |
| Production | Vercel, https://reputai-tau.vercel.app | Neon (`us-east-2`) | Merge or push to `main` |

### Pipeline

1. A developer pushes a branch and opens a pull request.
2. GitHub Actions (`.github/workflows/ci.yml`) runs type check, lint, 29 unit and integration tests, and 5 Playwright end-to-end tests against a fresh PostgreSQL service.
3. Vercel builds a preview (staging) deployment. The team tests it.
4. After review, the branch is merged to `main`. Vercel builds production with `npm run vercel-build`: `prisma generate`, `prisma migrate deploy` (applies new migrations to Neon), then `next build`.
5. The team checks the production site (sign in, open the inbox, open Insights).

### Scheduled jobs

`.github/workflows/jobs.yml` runs every 15 minutes. It calls two protected routes on production:

- `POST /api/jobs/sync`: syncs all locations of all organizations.
- `POST /api/jobs/sla`: creates SLA alerts and sends the emails. It never alerts the same review twice.

Both need `Authorization: Bearer <CRON_SECRET>`. The workflow reads the repository secrets `APP_URL` and `CRON_SECRET`. To run the jobs by hand: GitHub → Actions → **Scheduled jobs** → **Run workflow**, or:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://reputai-tau.vercel.app/api/jobs/sla
```

A manager can also click **Run SLA check now** on the Alerts page.

### Deploy a new copy (third party)

1. Create a Neon project and copy its connection string.
2. Import the GitHub repository in Vercel (framework: Next.js). `vercel.json` sets the build command.
3. In Vercel → Settings → Environment Variables, add every variable from the table in step 3 for **Production** (and **Preview** for staging). Use `DATABASE_URL` = the Neon string, `APP_URL` = the production URL, `AUTH_TRUST_HOST` = `true`, and new random values for `AUTH_SECRET`, `TOKEN_ENCRYPTION_KEY` and `CRON_SECRET`.
4. Deploy. The build applies the migrations.
5. Load the demo data once from your computer: `DATABASE_URL="<neon url>" npx tsx --env-file=.env prisma/seed.ts`.
6. In GitHub → Settings → Secrets and variables → Actions, add `APP_URL` and `CRON_SECRET` (same value as Vercel).

### Monitoring, backups and rollback

- **Logs:** Vercel → Project → Logs. The jobs write `[job:sync]` and `[job:sla]` summary lines. Sync errors also go to the audit log.
- **Backups:** Neon point-in-time restore. Before a release, take a manual dump: `pg_dump "<neon url>" > backup-$(date +%F).sql`.
- **Rollback:** Vercel → Deployments → choose the last good deployment → **Promote to Production** (or `vercel rollback`). Migrations only add tables and columns, so the previous build still works with the newer database.

## Testing

```bash
npm test                      # 29 Vitest unit and integration tests
npm run test:e2e              # 5 Playwright tests (starts the dev server; uses local Chrome)
npx tsx --env-file=.env scripts/eval-pipeline.ts   # 30-review dental test set with the real model
```

| Suite | Covers |
| --- | --- |
| `tests/compliance.test.ts`, `override.test.ts` | Rule check, BLOCK and WARN, override rules |
| `tests/complaints.test.ts` | Repeated complaint groups |
| `tests/pipeline.test.ts` | LangGraph pipeline and revise loop (model mocked) |
| `tests/phase3.test.ts` | Rate limit window, CSV escaping, SLA alert rule, insights, job route auth, retries |
| `e2e/main-flow.spec.ts` | Landing page, sign-in required, agent blocked from manager pages, full flow (sync → draft → submit → approve and post → audit log → export), BLOCK on health details |
| `scripts/eval-pipeline.ts` | Latest result in [docs/pipeline-eval.md](./docs/pipeline-eval.md): sentiment 29/30, escalation 27/30, 30/30 safe drafts, each under 10 seconds |

In CI the end-to-end tests run without an AI key. The app then falls back: reviews stay untriaged and only the rule check runs. This also tests the fallback.

## Demo Steps

1. Open the production URL. Show the landing page. Sign in as the agent.
2. **Inbox:** show priority, escalation and overdue badges. Use the **Overdue only** filter. Click **Sync reviews now**.
3. Open a high-priority review. Click **Generate AI draft**. Show the compliance flags and the staff note.
4. Edit the reply to add "your root canal". Click **Save changes**. It gets a BLOCK flag and cannot be submitted. Remove the text, add "we guarantee this will never happen again", save (WARN), and click **Submit for approval**.
5. Sign out. Sign in as the manager. Open the review, pick an override reason, and click **Approve & post to Google**.
6. **Alerts:** click **Run SLA check now**. Show the alerts and the email.
7. **Insights:** show the tiles, sentiment trend, repeated complaints and the location table.
8. **Inbox → Export flagged (CSV)**. **Settings → Audit log**: show the approval, override, post and SLA entries.

The demo uses the mock review provider, because Google did not approve Business Profile API access in time (Stakeholder Review 3, D6).

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript
- **UI:** Astryx design system and Tailwind CSS v4
- **Database:** PostgreSQL (Docker locally, Neon in production) with Prisma ORM
- **Auth:** Auth.js v5 (credentials, JWT sessions, Agent and Manager roles)
- **AI:** LangGraph (`@langchain/langgraph`) with an OpenAI-compatible model (`gpt-4o-mini`)
- **Email:** Resend REST API
- **Hosting and CI:** Vercel, GitHub Actions (CI and scheduled jobs)
- **Tests:** Vitest, Playwright

## Project Structure

```
prisma/                      Schema, migrations, seed script, mock review fixtures
src/lib/pipeline/graph.ts    LangGraph pipeline (classify, draft, compliance, revise)
src/lib/ai.ts                Model prompts
src/lib/compliance.ts        Rule-based compliance checks
src/lib/guard.ts             Role and organization checks for server actions
src/lib/rate-limit.ts        PostgreSQL rate limits
src/lib/jobs.ts              Scheduled sync and SLA check
src/lib/audit.ts             Audit log writer
src/lib/insights.ts          Insights calculations
src/lib/google/              Google OAuth and Business Profile API client (with retries)
src/lib/reviews/             Review providers (Google and mock) and sync
src/lib/reply-service.ts     Draft, submit, approve and post workflow
src/app/(app)/               Inbox, review detail, alerts, insights, settings, audit log
src/app/api/jobs/            Protected job routes (sync, SLA)
src/app/api/export/flagged/  Flagged review CSV export
e2e/                         Playwright tests
tests/                       Vitest tests and the 30-review test set
scripts/                     AI smoke test, flow smoke test, pipeline evaluation
.github/workflows/           CI and scheduled jobs
```

## Data Model Changes in Phase III

- **AuditLog** (new): organization, actor (empty for jobs), action, target and details.
- **Alert** (new): one `SLA_OVERDUE` alert per review, with email and read times.
- **RateLimit** (new): fixed-window counters for rate limits.

## Team (Group 5)

| Member | Role |
| --- | --- |
| Gurkirat Singh | Project Lead and AI Engineer |
| Lester Leonida | Backend and Integrations Developer |
| Yathuraakan Mathivathanan | Frontend and UX Developer |
| Celine Parmar | QA, Security and DevOps Engineer |
