# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Local dev database

A local Postgres `ralto` database is the normal way to build and verify backend/frontend changes together — it's meaningfully faster to inspect (direct SQL, DOM-level checks) than working only against the hosted Supabase instance, and the seed data below encodes specific edge cases worth re-testing whenever calendar/booking/availability rendering changes.

```bash
createdb ralto
cd backend
DATABASE_URL="postgres://<user>@localhost:5432/ralto?sslmode=disable" go run ./cmd/migrate
psql ralto -f seed/dev_seed.sql
```

`seed/dev_seed.sql` is not idempotent — it's meant to run once against a freshly-migrated database. Each row in it exists to reproduce a specific case (a staff member with nothing booked, a freelancer excluded from the resource calendar until searched for, a booking/unavailable overlap, a client brand colour that exactly matches the conflict-red design token, etc.) — see the comments in the file itself before changing it.

Run the frontend against it via `.claude/launch.json`'s `ralto-frontend` config (`npm run dev --prefix frontend`), with the backend started separately:

```bash
DATABASE_URL="postgres://<user>@localhost:5432/ralto?sslmode=disable" FRONTEND_ORIGIN="http://localhost:5173" go run ./cmd/api
```

## Creating the first admin user — `cmd/seed`

There is no signup endpoint, and `CreateUser` requires an already-authenticated admin — so a freshly-migrated database (local or Supabase) can't be logged into at all until `cmd/seed` has run once.

```bash
cd backend
DATABASE_URL="postgres://..." go run ./cmd/seed --admin-email=you@example.com --admin-name="Your Name"
```

It prompts for the password interactively (no echo) — never a flag or environment variable, so it can't end up in shell history or a process listing. Safe to re-run: an email that already exists is left alone (reported, not touched) and roles are inserted with `ON CONFLICT (name) DO NOTHING`. `--roles-file` (default `seed/roles.txt`) seeds the `roles` table from a plain-text file, one name per line — replace that file's placeholder with the real list from ops before running against a real environment. `--roles-only`/`--admin-only` skip the other half.

## Migration tracking — `cmd/migrate`

`backend/migrations/*.sql` are applied in filename order by `cmd/migrate`, which records what's run in a `schema_migrations` table so re-running is always a no-op for versions already applied:

```bash
cd backend
DATABASE_URL="postgres://..." go run ./cmd/migrate
```

Chosen over a library (golang-migrate, goose) deliberately: down-migrations aren't cleanly expressible for this schema anyway — 0004's `ALTER TYPE ... ADD VALUE` has no reverse in Postgres — and the rest of the backend is already dependency-light hand-rolled SQL with no ORM or migration framework, so a second small Go binary alongside `cmd/api` and `cmd/seed` fits the existing pattern better than a new tool + CLI dependency would.

`0001`–`0004` were applied by hand (via `psql -f` locally, and directly against Supabase) before this tool existed. Both are bootstrapped so `cmd/migrate` knows about them without re-running: `go run ./cmd/migrate --mark-applied="0001_init,0002_availability_type,0003_prospective_events,0004_pencil"` — this only inserts rows into `schema_migrations`, all in one transaction (a typo in the list fails the whole call rather than partially marking versions), and every version listed is checked against the real files in `migrations/` first so a typo can't silently create a bogus record either. From here on, every new migration should go through `cmd/migrate` on both local and Supabase — not another manual `psql -f` or direct `apply_migration` call — so the tracking table stays true to what's actually been run.

## Migration parity — local vs Supabase

Every migration must be run against **both** the local `ralto` database and the hosted Supabase instance before the stage that introduced it is considered done. They're independent Postgres instances with no automatic sync — schema drift between them (a migration applied to one and not the other) would silently invalidate everything tested locally. Local dev is a tool for fast iteration, not a substitute for confirming the schema actually matches what's deployed.

## Row-level security — every table, deny-all, no exceptions

Every table in Supabase has RLS enabled with zero policies. That's deliberate, not a placeholder waiting for policies: nothing in Ralto talks to Postgres through the Supabase client libraries or the anon key, so the `anon`/`authenticated` roles never need access, and RLS-with-no-policies denies them outright. The Go backend connects directly to Postgres as the table owner, and owners bypass RLS regardless of policies, so this costs the app nothing.

**Standing convention: every migration that `CREATE TABLE`s also `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`s it, in the same migration file.** A new table that ships without this line is exposed to the anon key by default — that's the gap to avoid, not a follow-up to schedule. This applies locally too (harmless there: RLS-with-no-policies only blocks non-owner roles, and the local dev connection is the table owner) — one more reason migration files, not manual `ALTER`s run only against Supabase, are the source of truth.
