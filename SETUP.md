# Setup Instructions — ReputAI (CPAN 324 Phase I)

This guide takes you from a clean checkout to a running prototype.

## Prerequisites

Install these before you start:

- **Node.js 20+** (tested on Node 22) and npm — https://nodejs.org
- **Docker Desktop** (or another Docker engine) — used to run a local Postgres database. https://www.docker.com/products/docker-desktop/
- **A GitHub account with access to GitHub Models** — used for AI draft generation, sentiment/topic tagging, and the AI-assisted compliance check. https://docs.github.com/en/github-models/quickstart
  - If you have the **GitHub CLI** (`gh`) installed and already logged in (`gh auth login`), you can reuse its token — see Configuration below. Otherwise create a **fine-grained personal access token** with the **"Models: read-only"** permission at https://github.com/settings/personal-access-tokens.

No other software (Postgres, Redis, etc.) needs to be installed on your machine directly — Postgres runs inside Docker.

## Installation Steps

1. **Install dependencies**

   ```bash
   cd webapp
   npm install
   ```

2. **Start the local database**

   ```bash
   docker compose up -d
   ```

   This starts a Postgres 16 container on `localhost:5433` (mapped from the container's `5432`, to avoid clashing with a Postgres instance you might already have running on the default port). Data persists in a Docker volume (`reviewops_pgdata`) across restarts.

3. **Configure environment variables**

   See **Configuration Instructions** below, then come back here.

4. **Run database migrations**

   ```bash
   npm run db:migrate
   ```

   This creates all tables (organizations, locations, users, reviews, replies, compliance flags, etc.) defined in `prisma/schema.prisma`.

5. **Seed demo data**

   ```bash
   npm run db:seed
   ```

   This creates a demo organization ("Bright Smile Dental Group") with two locations, an agent and a manager user, a brand voice profile, reply templates, and syncs ~15 sample dental reviews from the mock Google Business Profile provider — running each one through AI triage (sentiment, topics, escalation, priority score). This step calls the GitHub Models API, so it needs `GITHUB_MODELS_TOKEN` to be set first (step 3). It takes about a minute.

6. **Run the app**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000. You'll land on the marketing/landing page; click **Sign in**.

## Configuration Instructions

Copy the example environment file and fill in the two secrets:

```bash
cp .env.example .env
```

`.env` contains:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes (already set) | Points at the Docker Postgres container from step 2 above. Only change this if you changed the port/credentials in `docker-compose.yml`. |
| `AUTH_SECRET` | Yes | Secret used by NextAuth (Auth.js) to encrypt session cookies. Generate one with `npx auth secret`, or any random 32+ byte string, e.g. `openssl rand -base64 32`. |
| `GITHUB_MODELS_TOKEN` | Yes | Used to call the GitHub Models API for AI drafting/triage. Two ways to get one: <br>• **Quickest (if you use the `gh` CLI):** run `gh auth login` once, then set this to the output of `gh auth token`.<br>• **Otherwise:** create a fine-grained PAT with the "Models" permission at https://github.com/settings/personal-access-tokens and paste it here. |
| `GITHUB_MODELS_BASE_URL` | No (already set) | `https://models.github.ai/inference` — the GitHub Models OpenAI-compatible endpoint. |
| `GITHUB_MODELS_MODEL` | No (already set) | `openai/gpt-4o-mini` — swap for another model listed at https://github.com/marketplace/models if you prefer. |

If `GITHUB_MODELS_TOKEN` is missing when you run `npm run db:seed`, the seed script still creates the organization/users/locations but **skips** the review sync + AI triage step (it prints a warning and tells you how to finish later from the app itself, via Settings → Locations → "Sync now", once the token is set).

## Demo Logins

After seeding, sign in with either role at http://localhost:3000/login:

| Role | Email | Password |
|---|---|---|
| Agent | `agent@brightsmile.example` | `password123` |
| Manager | `manager@brightsmile.example` | `password123` |

Agents can draft replies and submit them for approval. Managers can additionally approve and post replies, edit the brand voice profile, and send drafts back for revision.

## Useful Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the app in development mode |
| `npm run build` / `npm run start` | Production build and start |
| `npm run db:migrate` | Apply Prisma schema migrations |
| `npm run db:seed` | (Re-)seed demo data — safe to re-run, it upserts the organization/users/locations and only creates reviews that don't already exist |
| `docker compose up -d` / `docker compose down` | Start/stop the local Postgres container |
| `npx prisma studio` | Browse/edit the database in a GUI at http://localhost:5555 |

## Troubleshooting

- **Port 5433 already in use**: edit the `ports` mapping in `docker-compose.yml` (e.g. `"5434:5432"`) and update `DATABASE_URL` in `.env` to match.
- **AI calls failing / 401 errors**: your `GITHUB_MODELS_TOKEN` is missing, expired, or the account it belongs to doesn't have Models access enabled. Re-generate it and confirm with a manual test: see the GitHub Models quickstart doc linked above.
- **"AUTH_SECRET" missing error on sign-in**: make sure `.env` exists (not just `.env.example`) and has a non-empty `AUTH_SECRET`.
