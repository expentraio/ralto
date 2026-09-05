# Ralto Backend Scaffold Plan — vs Equiptra's Go/Postgres stack

A brief for handing this build to Claude Code. I have no visibility into
Equiptra's actual repository — everything below is reasoned from the stack
description you gave (Go/chi/pgx/JWT+bcrypt, Render, Supabase Postgres via
Session pooler, GitHub under `expentraio`), not from reading real code.
Claude Code, working in a context where it *can* see Equiptra's actual
repo, should treat §0 below as the real first step — not scaffold anything
until the inferred assumptions in §1–§5 have been checked against what's
actually there.

---

## 0. Before writing any Ralto code — inventory the real Equiptra repo

This is the step this document couldn't do. Specifically confirm:

- **Exact migration tool** — name, config location, existing migration
  file naming convention.
- **Actual directory/package layout** — does it match the guessed tree in
  §5, or differ? Use whichever is real.
- **Actual JWT claims shape** — field names and structure, needed before
  designing Ralto's multi-persona extension in §4.
- **Actual response envelope** — the real success/error JSON shape. Copy
  it exactly rather than inventing a compatible-looking one.
- **Actual Render service config** — the real `render.yaml` or dashboard
  configuration, not a guessed shape.
- **Full middleware stack** — order, and anything beyond logging/recovery/
  CORS (rate limiting, request-ID injection, etc.) that a guess would miss.
- **CORS configuration approach** — hardcoded single origin vs an
  env-configurable list, since Ralto adds a second origin to whatever this
  is.
- **Whether any shared/reusable Go package already exists** — if
  Equiptra's auth, DB, or response-helper code already lives in an
  importable internal package rather than being Equiptra-specific, Ralto
  should *import* it, not copy it. That's a meaningfully better outcome
  than copy-paste: one place to fix an auth bug for both products, instead
  of two copies quietly drifting apart over time. Worth checking for
  before assuming §1 below means "copy files."

Once inventoried, treat §1–§3 below as a checklist to correct against
reality, not as settled fact.

---

## 1. Copy or import from Equiptra

These are almost certainly product-agnostic infrastructure — the same
regardless of whether the backend serves equipment records or crew
bookings. **If §0 turned up a shared internal package, import it here
instead of copying files** — one place to fix a bug for both products,
rather than two copies quietly drifting apart:

- **Server bootstrap** — chi router setup, middleware stack (logging,
  panic recovery, CORS config)
- **DB connection** — pgx pool initialisation, reading the Supabase Session
  pooler connection string from env
- **Auth mechanism itself** — JWT signing/verification helpers, bcrypt
  hash/verify helpers, login endpoint shape, refresh-token handling if
  Equiptra has it
- **Standard response envelope** — whatever shape Equiptra's JSON
  success/error responses follow
- **Config/env loading pattern**
- **Health check endpoint**
- **Migration tooling** — whatever Equiptra actually uses (goose,
  golang-migrate, sql-migrate, or hand-rolled) — matching this exactly
  avoids introducing a second migration tool to maintain across two
  products in the same org
- **Render deployment config** — service definition shape, build/start
  commands
- **Repo conventions** — under the same `expentraio` GitHub org, matching
  whatever branch/CI conventions already exist

**None of this needs redesigning.** The time saved here is real — this is
exactly the "reuse what's proven rather than pick clean from scratch"
reasoning that already justified Equiptra's own hybrid stack.

---

## 2. Adapt — same pattern, Ralto-specific content

- **JWT claims** — extend to carry Ralto's roles (scheduler / crew / admin)
  rather than whatever role shape Equiptra's JWT carries. See §4 — this is
  more than a rename, flagged below.
- **Database schema** — entirely new tables per Ralto's data model: `Job`,
  `Client`, `Venue`, `JobRequirement`, `Person`, `Booking`, `BookingShift`,
  `Availability`, `Timesheet`, `PersonRoles`, `Skills`, `Project` — plus the
  core-linking columns already designed (`shared_project_id`,
  `calendar_feed_token`, `phone_number`, `notification_channels`,
  `brand_color_hex`, `website`).
- **API routes** — new resource endpoints: jobs, bookings, people, roles,
  availability, offers.
- **CORS origin** — Ralto's own frontend domain (`ralto.io`), not
  `equiptra.io`.

---

## 3. Genuinely new — no Equiptra equivalent

- **Crewing business logic** — urgency tiers, crewing-completeness
  computed at read time (never cached, per the locked data-model
  principle), the offer → accept/decline state machine.
- **Notification triggering** — hooks into SendGrid at the six defined
  trigger points (booking_offered, booking_confirmed, booking_updated,
  booking_cancelled, shift_reminder, availability_request).
- **iCal feed endpoint** — a real decision here, not just new code (see §4).
- **Core-linking columns** — inert for now (see §4).
- **Multi-persona auth** — Equiptra's JWT/roles were presumably built
  around one user type (equipment managers). Ralto needs at least two
  genuinely different personas — scheduler/admin and crew member — with
  different permitted actions and, per the earlier product decision,
  potentially different apps entirely (scheduler desktop+mobile vs the
  separate Crew mobile app). This needs actual design work, not just a
  copied pattern with new labels.

---

## 4. Real decisions to make before/while building

**iCal: port the generator to Go, or keep it as a Python sidecar?**
The existing generator (`ical_feed.py`) is already written, tested, and
had a real bug found and fixed (the double-escaped newline issue) — that
correctness was hard-won against the RFC 5545 spec's fiddly escaping and
line-folding rules. Re-implementing it in Go risks reintroducing exactly
that class of bug. My instinct: keep it as a small internal Python service
the Go backend calls for Phase 1, and only port it to Go later if running
two languages in one small deployment becomes a real operational annoyance
— not a hypothetical one.

**Add the core-linking columns now, or wait until suite-core exists?**
Recommend: add them now, as inert nullable columns. Zero cost today, and
it's the same additive-not-cutover principle already used throughout this
project (`shared_project_id` was designed this way from the start).

**Auth roles/claims shape.**
Genuinely needs designing, not copying — flagged above, worth resolving
before the database schema is finalised since role structure tends to
touch a lot of downstream authorization logic.

---

## 5. Suggested repo layout

A common, idiomatic Go project layout compatible with chi + pgx — **not**
a claim that this matches Equiptra's actual structure. Verify against the
real repo and adjust:

```
ralto-backend/
  cmd/
    api/
      main.go                 # server bootstrap, matches Equiptra's pattern
  internal/
    auth/                     # JWT + bcrypt, adapted claims shape
    db/                       # pgx pool, query helpers
    handlers/
      jobs.go
      bookings.go
      people.go
      availability.go
      offers.go
    notifications/
      sendgrid.go
      templates.go            # the 6 templates as Go structs/constants
    icalfeed/                 # or a note pointing at the Python sidecar
  migrations/
    0001_init.sql
    ...
  render.yaml
  go.mod
```

---

This is the brief for the handoff, not the build itself — the actual
implementation is Claude Code's job, working against the real Equiptra
repo for ground truth wherever this document had to infer rather than
know.
