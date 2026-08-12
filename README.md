# Workforce Backend

Multi-tenant workforce management API (NestJS + MongoDB) — backend for a Connecteam-style app.
Frontend lives in a separate repo: [workforce-app](https://github.com/arminimani70/workforce-app).

## Stack

- NestJS + TypeScript
- MongoDB + Mongoose
- JWT access + refresh tokens (`@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`)
- `class-validator` / `class-transformer` for request validation

## Multi-tenancy

Every business-data collection carries an `organizationId`. Every query in every module must
filter by the caller's `organizationId` (taken from the JWT, never from the request body) so
one organization can never read or write another's data.

## Getting started

```bash
cp .env.example .env   # fill in MONGODB_URI and JWT secrets
npm install
npm run start:dev
```

Requires a running MongoDB instance (local `mongod`, Docker, or Atlas) reachable at `MONGODB_URI`.

## Current modules

- **auth** — `POST /auth/register` (creates an Organization + its Owner), `POST /auth/login`,
  `POST /auth/refresh`
- **users** — `GET /users/me`
- **organizations** — `GET /organizations/me`
- **operations/time-clock** — `POST /time-clock/clock-in`, `POST /time-clock/clock-out`
  (both accept an optional `{ lat, lng }` body), `GET /time-clock/status` (the caller's open
  entry, if any), `GET /time-clock/history?limit=20`, `GET /time-clock/total?from=&to=`
  (`{ totalSeconds }` summed over entries that started in that window; an entry still open
  counts up to now)
- **operations/scheduling** — `POST /shifts` (owner/manager only, starts `confirmed: false`),
  `PATCH /shifts/:id/confirm` (owner/manager only), `GET /shifts/me?from=&to=` (the caller's
  own shifts, optionally filtered by `startTime` — an `employee` token only ever gets
  `confirmed: true` shifts; owner/manager also see their own unconfirmed ones), `GET /shifts`
  (every shift in the org, confirmed or not, owner/manager only)
- **operations/availability** — `GET /availability/me`, `PUT /availability/me`. A recurring
  weekly pattern (not tied to a specific date): 7 entries, one per day of week (0=Monday),
  each with a `status` of `unavailable`, `available` (with an `HH:mm` start/end and one or
  more `positions`: `frontdesk`/`helpdesk`/`information`/`consultation`), or `flexible` (no
  preference — the manager decides).

All non-auth routes require `Authorization: Bearer <accessToken>`. Routes marked
"owner/manager only" are enforced by `RolesGuard` + `@Roles(...)` — an employee token gets a
`403`.

## Planned modules (see [docs/PROJECT_SPEC.md](docs/PROJECT_SPEC.md))

`operations/{forms-checklists,tasks}`,
`communication/{chat,announcements,directory,help-desk}`,
`hr/{onboarding,documents,time-off,recognition}`.

## Scripts

- `npm run start:dev` — watch mode
- `npm run build` — compile to `dist/`
- `npm run lint` — ESLint with autofix
- `npm run test` / `npm run test:e2e` — Jest
