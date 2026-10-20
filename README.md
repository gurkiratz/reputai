# ReputAI — CPAN 324 Phase I

ReputAI is an AI review operations platform for multi-location dental groups (Group 5). It collects Google reviews for all locations in one inbox and sorts them by priority. It drafts on-brand replies with AI and checks each draft for unsafe content. A manager approves every reply before it posts.

Phase I continues from the CPAN 314 prototype. It adds real Google Business Profile data and a LangGraph AI pipeline, as agreed in the Revised Proposal and Stakeholder Review Report 1.

## Current State (Phase I)

| Area | Status |
| --- | --- |
| Core loop: sync → triage → AI draft → compliance check → approval → post → reports | Works end to end |
| Review source | `REVIEW_PROVIDER=google` (real Google Business Profile) or `mock` (sample dental reviews, the demo fallback) |
| Google OAuth connect flow | Settings → Google. Managers connect a Google account and link each location to a Business Profile location |
| Token storage | Access and refresh tokens are encrypted with AES-256-GCM (`TOKEN_ENCRYPTION_KEY`) |
| AI pipeline | LangGraph graph: classify → draft → compliance → revise (max 2) |
| Revise limit | A draft that fails after 2 revisions gets a `max_revisions_reached` BLOCK flag and cannot be posted |
| Planned for Phase II | Scheduled sync and SLA reminders, complaint clustering, insights dashboard, WARN override with audit log |

### Main user flow

1. Sign in as the agent. Open **Inbox** and click **Sync** (or sync one location in **Settings → Locations**).
2. Open a review. Click **Generate AI draft**. The LangGraph pipeline drafts the reply, checks it and revises it if needed.
3. Read the compliance flags. Edit the reply if needed. Click **Submit for approval**.
4. Sign in as the manager. Approve the reply. The app posts it to Google (or to the mock provider).
5. Open **Reports** to see response time and sentiment for each location.

## Setup

Prerequisites: Node.js 20+, Docker and a GitHub Models token. See [SETUP.md](./SETUP.md) for full details.

```bash
npm install
docker compose up -d                 # PostgreSQL 16 on port 5433
cp .env.example .env                 # then fill in the values below
npm run db:migrate                   # applies all migrations, including Phase I
npm run db:seed
npm run dev                          # http://localhost:3000
```

Demo logins (after seeding): `agent@brightsmile.example` and `manager@brightsmile.example`, password `password123`.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Auth.js secret (`npx auth secret`) |
| `GITHUB_MODELS_TOKEN`, `GITHUB_MODELS_BASE_URL`, `GITHUB_MODELS_MODEL` | AI model access |
| `REVIEW_PROVIDER` | `mock` or `google` |
| `APP_URL` | Public URL of the app. The OAuth redirect is `<APP_URL>/api/google/callback` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth client (type "Web application") |
| `TOKEN_ENCRYPTION_KEY` | 32-byte key, base64 (`openssl rand -base64 32`). Keep it in `.env` or Vercel secrets only |

### Use real Google reviews

1. In Google Cloud Console, enable the **My Business Account Management**, **My Business Business Information** and **Google My Business** APIs. Your project must have Business Profile API access.
2. Create an OAuth client ID (Web application). Add `<APP_URL>/api/google/callback` as an authorized redirect URI.
3. Set `REVIEW_PROVIDER="google"` and the Google variables in `.env`. Restart the app.
4. Sign in as the manager. Go to **Settings → Google** and click **Connect Google account**.
5. Link each location to its Business Profile location. Then sync.

**Demo fallback:** if Google is not available (quota, expired token or no access), set `REVIEW_PROVIDER="mock"` and restart. The app then uses the sample dental reviews in `prisma/fixtures/reviews.json`.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript
- **UI:** Astryx design system and Tailwind CSS v4
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** Auth.js v5 (credentials, JWT sessions, agent and manager roles)
- **AI:** LangGraph (`@langchain/langgraph`) orchestrates the nodes. GitHub Models (OpenAI-compatible) runs the model calls.
- **Compliance:** deterministic rules in `src/lib/compliance.ts` (patient health details = BLOCK; liability, promises and avoided topics = WARN) and a model-based tone check

## Project Structure

```
prisma/                     Schema, migrations, seed script, mock review fixtures
src/lib/pipeline/graph.ts   LangGraph pipeline (classify, draft, compliance, revise)
src/lib/ai.ts               Model prompts used by the pipeline nodes
src/lib/compliance.ts       Rule-based compliance checks
src/lib/google/             Google OAuth (oauth.ts) and Business Profile API client (client.ts)
src/lib/crypto.ts           AES-256-GCM token encryption
src/lib/reviews/            Review providers (Google and mock) and sync
src/lib/reply-service.ts    Draft, submit, approve and post workflow
src/app/(app)/              Inbox, review detail, reports, settings (incl. Google)
src/app/api/google/         OAuth connect and callback routes
scripts/                    Smoke scripts for the AI calls and the full flow
```

## Data Model Changes in Phase I

- **GoogleConnection** (new): one per organization. Stores the Google account, the Business Profile account name, the encrypted tokens and the last sync status.
- **Location.googleLocationName** (new): the linked Business Profile location, for example `accounts/123/locations/456`.
- **Reply.revisionCount** (new): the number of revise-loop passes for an AI draft.

## Testing

Smoke scripts from CPAN 314 check the AI calls and the full flow against the local database:

```bash
npx tsx --env-file=.env scripts/smoke-ai.ts
npx tsx --env-file=.env scripts/smoke-flow.ts
```

## Team (Group 5)

| Member | Role |
| --- | --- |
| Gurkirat Singh | Project Lead and AI Engineer |
| Lester Leonida | Backend and Integrations Developer |
| Yathuraakan Mathivathanan | Frontend and UX Developer |
| Celine Parmar | QA, Security and DevOps Engineer |
