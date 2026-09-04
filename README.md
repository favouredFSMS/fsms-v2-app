# FSMS V2 — application

Next.js + React + TypeScript front end for **FSMS** (FAVOURED Student Management
System) — the V2 successor to the V101 Google Apps Script system. Supabase
(PostgreSQL) is the persistence + auth backend.

## Status

Phases 5–8 complete: development environment, database foundation, data
migration engine, and authentication & authorization.

## Run locally (dev harness)

No Supabase project is required for local development. When
`NEXT_PUBLIC_SUPABASE_URL` is empty, the app uses the **dev auth harness**
against a local PostgreSQL harness:

```bash
# 1. provision + migrate the local database (from the FSMS-V2 root)
bash scripts/db_reset.sh

# 2. run the app
npm install
npm run dev
```

Open http://localhost:3000 → sign in with a seeded demo account:

| Role | Email | Password |
|---|---|---|
| Owner (admin1) | `owner@favoured.test` | `owner123` |
| Teacher | `teacher@favoured.test` | `teacher123` |
| Parent (ru locale) | `parent@favoured.test` | `parent123` |
| Student | `student@favoured.test` | `student123` |

> These credentials and the dev harness are **local-only**. Production
> authentication is Supabase Auth (email/password + O1 email recovery) —
> configuration-only via environment variables, never committed.

## Environment

Copy `.env.example` → `.env.local` (never commit `.env.local`). Key variables:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` — Supabase project (production auth).
- `AUTH_MODE` — `supabase` (production) or `local` (dev-only harness).
- `LOCAL_DB_URL`, `AUTH_LOCAL_SECRET` — dev harness only.
- `RESEND_API_KEY`, `EMAIL_FROM` — email provider (O5).
- `GOOGLE_TRANSLATE_API_KEY` — translation provider (O3).

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm test` — vitest (unit + local-DB integration; integration skips if the
  harness DB is unreachable)

## Code layout

- `src/lib/auth/` — roles, permission catalog, authorize, session, guards,
  actions, dev adapter (see `docs/PHASE8_AUTH_AUTHORIZATION.md`).
- `src/lib/supabase/` — server (service-role + SSR) and browser clients.
- `src/lib/env.ts` — typed env access (secrets stay out of the repo).
- `src/proxy.ts` — session refresh + route protection.
- `src/app/` — routes: `/login`, `/forgot-password`, `/auth/*`, `/dashboard`.
