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
- **users** — `GET /users/me`, `GET /users` (list every member of the org, passwordHash never
  included), `POST /users` (owner/manager only — creates a new employee with a temporary
  password; no self-registration flow for team members), `PATCH /users/me` (any authenticated
  user — self-service profile edit: `fullName`, `phone`, `birthDate`, `address`,
  `emergencyContactName`, `emergencyContactPhone`, `avatarUrl`; every field optional/partial.
  `email` and `role` are deliberately not editable here — those stay admin-set. `avatarUrl` is
  a base64 `data:image/...` URI, not an external link, capped at 700,000 characters — the
  client should resize/compress before upload), `PATCH /users/me/password` (`currentPassword`
  + `newPassword`, verified against the stored hash before it's changed — `401` on a wrong
  current password).
- **organizations** — `GET /organizations/me`
- **operations/time-clock** — `POST /time-clock/clock-in`, `POST /time-clock/clock-out`
  (both accept an optional `{ lat, lng }` body), `GET /time-clock/status` (the caller's open
  entry, if any), `GET /time-clock/history?limit=20`, `GET /time-clock/total?from=&to=`
  (`{ totalSeconds }` summed over entries that started in that window; an entry still open
  counts up to now)
- **operations/scheduling** — `POST /shifts` (owner/manager only, starts `approval: pending`,
  optional `position`: `frontdesk`/`helpdesk`/`information`/`consultation`/`manager`),
  `PATCH /shifts/:id/confirm` / `PATCH /shifts/:id/reject` (owner/manager only),
  `PATCH /shifts/publish?from=&to=` (owner/manager only — bulk-confirms every still-`pending`
  shift with `startTime` in the range in one call, `{ publishedCount }`; the "Publish Week"
  action after building a week's schedule shift by shift, so it becomes visible to employees
  all at once instead of one shift at a time), `GET /shifts/me?from=&to=` (the caller's own
  shifts, optionally filtered by `startTime` — an `employee` token only ever gets
  `approval: approved` shifts; owner/manager also see their own pending/rejected ones),
  `GET /shifts` (every shift in the org regardless of approval, owner/manager only),
  `GET /shifts/coworkers?from=&to=` (any authenticated user — every approved shift org-wide
  with `startTime` in that window, `employeeId` populated with `fullName`/`role`, for "who else
  is working today"; takes an explicit window rather than a bare date so the caller's
  local-timezone day boundaries are used, not the server's)
- **operations/availability** — date-based, not a recurring weekly pattern: one entry per
  (employee, exact calendar date), so availability can be set independently for any date in
  any future week. `GET /availability/me?from=&to=` (every date the caller has set a
  preference for in that range — a date with no entry simply hasn't been touched), `PUT
  /availability/me` (upserts a single date: `{ date, status, startTime?, endTime?, positions?
  }`, `status` one of `unavailable`, `available` (with an `HH:mm` start/end and one or more
  `positions`: `frontdesk`/`helpdesk`/`information`/`consultation`/`manager`), or `flexible`
  (no preference — the manager decides)), `DELETE /availability/me?date=` (clears a date back
  to "not set", distinct from explicitly marking it `unavailable`). `GET
  /availability?from=&to=` (owner/manager only — every entry in the range org-wide,
  `employeeId` populated with `fullName`/`role`) powers the week-builder's "who marked
  themselves available this day" cross-reference against the exact dates being built.
- **operations/scheduling/swap-requests** — direct 1:1 shift trades, gated by both the target
  employee and a manager: `POST /shifts/swap-requests` (any authenticated user — offers one of
  the caller's own *approved* shifts in trade for another employee's *approved* shift, both by
  `id`; starts `status: pending_target`), `GET /shifts/swap-requests/me` (every request the
  caller is on either side of, sent or received), `GET /shifts/swap-requests` (owner/manager
  only — every request already accepted by its target and now awaiting manager approval),
  `PATCH /shifts/swap-requests/:id/accept` / `/decline` (target employee only, while
  `pending_target` — accept moves it to `pending_manager`, decline moves it to `rejected`),
  `PATCH /shifts/swap-requests/:id/cancel` (requester only, while still `pending_target`),
  `PATCH /shifts/swap-requests/:id/approve` / `/deny` (owner/manager only, while
  `pending_manager` — approve is the only place the actual swap happens: the two shifts'
  `employeeId` are exchanged and the request becomes `approved`; deny leaves both shifts
  untouched and marks it `rejected`).
- **operations/tasks** — `POST /tasks` (owner/manager only — assign directly with
  `assignedTo`, or omit it and give `position` + `dueDate` instead: the server finds whoever
  has an *approved* shift for that position on that date and assigns them; 404s if nobody
  does), `POST /tasks/batch` (owner/manager only — same title/description across multiple
  `dueDates`, each resolved independently by `position`, so different days can land on
  different people; returns one result per date noting whether it was created), `GET /tasks/me`
  (the caller's own tasks), `GET /tasks` (every task in the org, owner/manager only, employee
  populated), `PATCH /tasks/:id/status` (`pending`/`in_progress`/`done` — the assignee or
  owner/manager can update; anyone else gets a `403`).
- **hr/onboarding** — `GET /onboarding` (any authenticated user — the org's onboarding guide;
  `{ organizationId: '', content: '', updatedAt: null }` if the org hasn't written one yet, no
  404), `PUT /onboarding` (owner/manager only — replaces the guide's `content`, a single plain-
  text/markdown-ish blob capped at 20,000 characters; upserts, so there's nothing to create up
  front). One guide per organization, not per employee — unlike Availability/Shift/Task, there's
  no per-user dimension here.
- **communication/chat** — direct 1:1 messages between any two org members, no role
  restriction and no group chat; a "conversation" is derived from `Message` documents rather
  than stored as its own entity. `POST /messages` (`{ recipientId, text }`, recipient must be
  in the same org), `GET /messages/conversations` (every person the caller has exchanged
  messages with, each with the last message, its timestamp, and an unread count — newest
  first), `GET /messages/unread-count` (`{ count }`, total unread across every conversation,
  for a badge), `GET /messages/with/:employeeId` (the full thread with one coworker, oldest
  first), `PATCH /messages/with/:employeeId/read` (marks every unread message from that
  coworker as read — called when opening the thread). Text-only for now, capped at 5,000
  characters; the schema has room for an attachment field for a future image/PDF/Word upload,
  but nothing populates it yet.
- **operations/checklists** — opening/closing duty lists, one template per (`position`,
  `jobSite`) combination — the same position can have a different checklist at a different
  branch. `PUT /checklists/templates` (owner/manager only — upserts by `position` + `jobSite`:
  `{ position, jobSite, openingItems: string[], closingItems: string[] }`), `GET
  /checklists/templates` (owner/manager only — every template in the org). Completion is
  tracked per shift, not per template, so it resets naturally each time someone works: `GET
  /checklists/shift/:shiftId` (the shift's own employee, or owner/manager for oversight —
  resolves the template matching that shift's `position`/`jobSite`, empty lists if none exists,
  plus the current `openingCompletedItems`/`closingCompletedItems`), `PATCH
  /checklists/shift/:shiftId/opening` / `/closing` (shift's own employee only — replaces the
  completed-items list for that section with `{ completedItems: string[] }`; storing the
  checked item text rather than an index so a completion record stays meaningful even if the
  template is edited later).

All non-auth routes require `Authorization: Bearer <accessToken>`. Routes marked
"owner/manager only" are enforced by `RolesGuard` + `@Roles(...)` — an employee token gets a
`403`.

## Planned modules (see [docs/PROJECT_SPEC.md](docs/PROJECT_SPEC.md))

`communication/{announcements,directory,help-desk}`,
`hr/{documents,time-off,recognition}`.

## Scripts

- `npm run start:dev` — watch mode
- `npm run build` — compile to `dist/`
- `npm run lint` — ESLint with autofix
- `npm run test` / `npm run test:e2e` — Jest
