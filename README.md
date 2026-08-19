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
- **operations/time-clock** — `POST /time-clock/clock-in` (`{ lat?, lng?, dayStart?, dayEnd?,
  reason?, jobSite?, position? }`), `POST /time-clock/clock-out` (`{ lat?, lng? }`),
  `GET /time-clock/status` (the caller's open entry, if any), `GET /time-clock/history?limit=20`,
  `GET /time-clock/total?from=&to=` (`{ totalSeconds }` summed over entries that started in that
  window; an entry still open counts up to now). Clock-in rejects with `400` when the employee
  has no approved shift starting in `[dayStart, dayEnd]` (defaults to the server's UTC day if
  omitted) — unless `reason` is set, which skips that check entirely; this is the "Extra Shift
  Clock In" escape hatch for starting work with nothing scheduled (covering a coworker, an
  extra day, called in urgently, etc). When `reason` is set, `jobSite` and `position` become
  required too (`400` if missing) and are stored alongside it on the entry, since there's no
  shift to infer the branch/position from otherwise. Either way, once a branch is resolved (the
  relevant shift's `jobSite` in the normal path, current-if-underway else next like
  `useTodayShiftContext` on the app; the chosen `jobSite` in the no-shift path) and it matches
  an entry in BranchesModule by name, clock-in is geofenced: `lat`/`lng` become required
  (`400` if missing — can't verify location) and rejected with `400` if the haversine distance
  (`common/utils/geo.util.ts`, mirroring the app's client-side copy) to the branch exceeds its
  `radiusMeters`. No match against BranchesModule (a `jobSite` with no corresponding branch) —
  skips the geofence check entirely. Depends on SchedulingModule (exports `SchedulingService`)
  for the shift lookup and BranchesModule (exports `BranchesService`) for the geofence.
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
  with `startTime` in that window, `employeeId` populated with `fullName`/`role`/`avatarUrl`,
  for "who else is working today" and the Schedule screen's per-day people list; takes an
  explicit window rather than a bare date so the caller's local-timezone day boundaries are
  used, not the server's)
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
- **operations/scheduling/swap-requests** — offering one of the caller's own *approved* shifts
  to someone else, gated by both the target (or a self-selected volunteer) and a manager:
  `GET /shifts/swap-requests/candidates?shiftId=` (any authenticated user — who's eligible to
  be picked as a direct target for that shift: anyone with an *approved* shift the same day in
  the same `position` but a *different* `jobSite`, or anyone with no shift at all that day),
  `POST /shifts/swap-requests` (`requestingShiftId` required; `targetEmployeeId` optional — omit
  it to broadcast the shift as an open "Free Volunteer" request instead of targeting one
  person; the server re-validates target eligibility itself, not just trusting the candidates
  list). Three shapes fall out of this depending on what happens at approval time:
  - **Target has no shift that day** — a pure reassignment. `targetShiftId` is left unset;
    approving just hands `requestingShiftId` over to the target.
  - **Target has an approved shift that day at another branch, same position** — a true mutual
    swap. `targetShiftId` is set; approving exchanges both shifts' `employeeId`, everything else
    (time, position, jobSite) stays put.
  - **Open / "Free Volunteer"** (`targetEmployeeId` omitted) — starts `status: open` with no
    target at all. `GET /shifts/swap-requests/open` (any authenticated user — every `open`
    request where the caller has no approved shift that day; not position-filtered) and
    `PATCH /shifts/swap-requests/:id/volunteer` (self-claim — sets `targetEmployeeId` to the
    caller and skips straight to `pending_manager`, same as a direct target accepting) power
    this path.

  Remaining lifecycle, shared across all three shapes: `GET /shifts/swap-requests/me` (every
  request the caller is on either side of, sent or received), `GET /shifts/swap-requests`
  (owner/manager only — every request already agreed to and now awaiting manager approval),
  `PATCH /shifts/swap-requests/:id/accept` / `/decline` (target employee only, while
  `pending_target` — accept moves it to `pending_manager`, decline moves it to `rejected`),
  `PATCH /shifts/swap-requests/:id/cancel` (requester only, while still `pending_target` or
  `open`), `PATCH /shifts/swap-requests/:id/approve` / `/deny` (owner/manager only, while
  `pending_manager` — approve is where the shift reassignment actually happens, per the three
  shapes above; deny leaves the shift(s) untouched and marks it `rejected`).
- **operations/scheduling/shift-edit-requests** — correcting the start/end time of a shift
  that has already happened, gated by manager approval: `POST /shifts/edit-requests`
  (`shiftId`, `startTime`, `endTime` — only the shift's own employee may request it, only for an
  *approved* shift, and only if the shift's calendar day is strictly before today — a shift that
  ended earlier today is not eligible, the earliest eligible day is yesterday's), `GET
  /shifts/edit-requests/me` (the caller's own requests), `GET /shifts/edit-requests`
  (owner/manager only — every `pending` request org-wide), `PATCH
  /shifts/edit-requests/:id/cancel` (requester only, while still `pending`), `PATCH
  /shifts/edit-requests/:id/approve` (owner/manager only — applies `newStartTime`/`newEndTime`
  to the actual shift) / `/reject` (leaves the shift untouched).
- **hr/onboarding** — `GET /onboarding` (any authenticated user — the org's onboarding guide;
  `{ organizationId: '', sections: [], updatedAt: null }` if the org hasn't written one yet, no
  404), `PUT /onboarding` (owner/manager only — replaces the guide's whole `sections` array:
  `{ sections: [{ title, content }] }`, up to 100 sections, each title capped at 200 characters
  and content at 20,000; upserts, so there's nothing to create up front). A guide is a list of
  titled sections rather than one text blob, so the app can let someone search/browse it by
  title. One guide per organization, not per employee — unlike Availability/Shift, there's
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
  branch. `jobSite` is optional on a template: a blank `jobSite` is the position's default,
  applied to any pick of that position with no more specific branch template of its own. A
  template also carries an optional `title` (e.g. "Morning Opening — Front Desk") so the same
  position can read differently at different branches. `PUT /checklists/templates`
  (owner/manager only — upserts by `position` + `jobSite`: `{ position, jobSite?, title?,
  openingItems: string[], closingItems: string[] }`), `GET /checklists/templates` (any
  authenticated user — every template in the org, doubling as the catalog of checklist "forms"
  to browse and pick from).

  Filling one out is **not tied to a shift, a day, or one employee** — it's one live, shared
  sheet per (`position`, `jobSite`), since several different people can hold the same position
  at the same branch across a day (shift handoffs). It persists indefinitely: `GET
  /checklists/current?position=&jobSite=` (any authenticated user — resolves the best-matching
  template for that position+branch plus whatever's currently marked on the shared sheet).
  Every item's status is explicit — done or not done — never a silent "unchecked means not
  done": `PATCH /checklists/current/opening` / `/closing` (`{ position, jobSite?, item, done,
  photoUrl? }` — sets one item's status on the shared sheet, storing the item text rather than
  an index so a record stays meaningful even if the template is edited later; also stamps
  `lastUpdatedBy`, informational only). `photoUrl` is an optional proof-of-completion photo — a
  base64 data URI like `User.avatarUrl`, capped smaller at 400,000 characters since it should
  already be resized/compressed client-side — attached in a follow-up `PATCH` after the item is
  marked, re-sending the same `done` value alongside the new `photoUrl`.

  Once every item in a section is answered, anyone can submit it: `PATCH
  /checklists/current/opening/submit` / `/closing/submit` (`{ position, jobSite? }` — `400`s if
  any item is still unanswered or the section has no items at all). Submitting **archives that
  section's current state as a new, independent `ChecklistSubmission` row** (so history keeps
  every round, from whoever filled it) **and resets just that section on the shared sheet back
  to blank**, ready for the next person — the sheet itself is never "done", only ever submitted
  and reused. `GET /checklists/submissions` (owner/manager only — every submitted round ever,
  newest first, employee populated) is the review list.
- **operations/forms** — an org-wide catalog of ad hoc report types (e.g. "Damaged Product",
  "Equipment Malfunction", "Urgent Supply Request") — unlike checklists these aren't tied to a
  position or branch; any authenticated user can submit any of them, whenever something needs
  reporting. `PUT /forms/templates` (owner/manager only — creates a new template, or updates
  one in place when `{ id }` is included: `{ id?, title, fields: [{ label, type: 'text' |
  'number' }] }`), `GET /forms/templates` (any authenticated user — the catalog to pick a form
  from), `DELETE /forms/templates/:id` (owner/manager only). `POST /forms/submissions` (any
  authenticated user — `{ formTemplateId, values: [{ label, value }] }`; each value is stored
  as its own label+value snapshot, along with the template's title at that moment, so a
  submission stays readable even if the template is edited or deleted afterward), `GET
  /forms/submissions` (owner/manager only — every submission org-wide, newest first, employee
  populated — the review/history log).
- **operations/branches** — the org-wide, canonical list of physical work locations (name +
  GPS point + geofence radius). `Shift.jobSite` and `ChecklistTemplate.jobSite` stay plain-text
  snapshots of a branch's name rather than a reference to this collection — same
  snapshot-not-reference pattern used elsewhere — so renaming or deleting a branch never
  corrupts historical shifts or checklist assignments. `PUT /branches` (owner/manager only —
  creates a new branch, or updates one in place when `{ id }` is included: `{ id?, name, lat,
  lng, radiusMeters? }`, `radiusMeters` defaults to 100 and must be between 10 and 5000),
  `GET /branches` (any authenticated user — populates branch pickers and resolves the geofence
  for the clock-in map), `DELETE /branches/:id` (owner/manager only). Geofence enforcement
  itself (warning an employee they're far from their branch when clocking in) is entirely
  client-side — this module only stores and serves the branch data.
- **operations/stock** — manager-built, named product-count lists, one branch per list but any
  number of lists per branch (e.g. "Bar Stock" and "Kitchen Stock" both at the same branch). A
  manager only fills in `productName`/`unit` per row; an employee submitting only ever enters a
  quantity against each predefined row — they can't add, remove, or rename products. `PUT
  /stock/templates` (owner/manager only — creates a new list, or updates one in place when
  `{ id }` is included: `{ id?, jobSite, title, items: [{ productName, unit }] }`; no two lists
  at the same branch may share a title), `GET /stock/templates` (any authenticated user — the
  catalog to pick a list from, grouped by branch on the client), `DELETE /stock/templates/:id`
  (owner/manager only). `POST /stock/submissions` (any authenticated user — `{ stockTemplateId,
  quantities: [{ productName, quantity }] }`; the server rejects anything that doesn't cover
  exactly the template's current product set — no missing or extra rows — then snapshots the
  list's title/branch and each row's productName/unit/quantity, so a submission stays readable
  even if the template is later edited or deleted), `GET /stock/submissions` (owner/manager
  only — every stock count ever submitted, newest first, employee populated).
- **operations/wastage** — reporting damaged/expired/spilled product. `reasons` is an org-wide,
  manager-editable catalog (e.g. "Expired", "Damaged", "Spilled") that populates the reason
  picker on the submission form: `PUT /wastage/reasons` (owner/manager only — creates a new
  reason, or renames one in place when `{ id }` is included: `{ id?, label }`), `GET
  /wastage/reasons` (any authenticated user), `DELETE /wastage/reasons/:id` (owner/manager
  only). A wastage report itself picks `jobSite` from the branch catalog and `reason` from this
  catalog — both stored as plain-text snapshots, same convention as `Shift.jobSite` — but
  `productName`/`amount` are always free text the employee types by hand, since there's no
  fixed product catalog to pick from (unlike stock's manager-built lists): `POST
  /wastage/entries` (any authenticated user — `{ jobSite, reason, productName, amount }`), `GET
  /wastage/entries` (owner/manager only — every wastage report ever submitted, newest first,
  employee populated).

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
