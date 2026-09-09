# organisation_id placeholder

**Value:** `fa065f2f-25d2-4d9a-9383-3fb1ca506a0a`

## What this is

Every domain table in Ralto's database carries an `organisation_id UUID NOT
NULL` column (added in `migrations/0006_organisation_id.sql`), scoping every
row to a tenant. Core — the shared Simplified Suite identity/tenancy layer
described in `simplified_suite_core_v0_5.md` — will eventually own the real
`Organisation` entity and issue real IDs for it. Core doesn't exist as a
service yet, so `organisation_id` isn't a real foreign key today: it's a
bare UUID, backfilled everywhere with the single placeholder value above,
representing "the one organisation that currently exists" (Simplified
Suite / Expentra itself).

The Go-side source of truth for this value is
`backend/internal/tenancy.PlaceholderOrganisationID` — every handler that
sets or filters on `organisation_id` references that constant, not a
hardcoded literal. This file and the migration's own header comment are
the two other places the value is recorded, so it's never a fact only
findable by reading SQL.

## What to do once Core exists

1. Core creates a real `Organisation` row for Simplified Suite / Expentra.
2. Reconcile: either that new row is given this exact UUID as its `id` (no
   data migration needed on Ralto's side), or every `organisation_id`
   column across Ralto's tables gets updated from this placeholder to
   Core's real ID in one migration.
3. Swap `tenancy.PlaceholderOrganisationID` for whatever mechanism reads
   the real, request-scoped organisation at that point (a value derived
   from the caller's session once Core-issued auth carries it, most
   likely) — this is the one-line change the placeholder was designed to
   make possible.
4. Add the `organisation_id` foreign key constraint(s) this repo
   deliberately doesn't have yet.

## Scope

**21 tables carry `organisation_id`:** `users`, `clients`, `venues`,
`projects`, `jobs`, `roles`, `job_requirements`, `people`,
`overtime_rules`, `skills`, `bookings`, `timesheets`, `availability`,
`availability_requests`, `notifications`, `operational_alerts`,
`prospective_events`, `person_roles`, `person_skills`, `person_documents`,
`booking_shifts`.

**2 tables deliberately don't:** `job_contacts` and
`notification_deliveries`. Both were checked against every read/write path
that reaches them (not just their shape) — neither has an endpoint that
accepts a bare row ID with no already-organisation-scoped parent alongside
it. `job_requirements`, `person_roles`, `person_skills`,
`person_documents`, and `booking_shifts` look similar at the routing level
(nested under a parent's ID in the URL) but their `Remove*`/candidate
lookups turned out to query by the child row's own bare ID with the parent
segment unused — so they're scoped, not skipped.

`schema_migrations` is tooling, not tenant data, and isn't touched.

## What this does NOT change

- No RLS policy changes — RLS enforcement isn't tied to `organisation_id`
  anywhere; the Go backend connects as table owner and bypasses RLS
  regardless.
- No multi-org UI. No organisation switcher. There is exactly one
  organisation right now.
- Nothing auth-related — session/login mechanics are untouched; this is
  schema and query-layer scoping only.
