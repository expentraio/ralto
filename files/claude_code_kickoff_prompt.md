I'm starting the backend build for Ralto, a new product in the Simplified
Suite family alongside Equiptra (which you should have access to in this
environment — its repo is the reference stack for this build).

Do not scaffold any Ralto-specific code yet. Start with the inventory step
below and report back what you find before proceeding to anything else.

---

## Step 1 — Inventory Equiptra's actual backend

Equiptra's repo is at: [FILL IN THE PATH/URL HERE]

Confirm the following against the real code — don't assume, check:

- Migration tool in use (name, config location, file-naming convention)
- Actual directory/package layout
- JWT claims shape (field names, structure)
- Response envelope shape (success/error JSON)
- Render service config (render.yaml or however it's actually configured)
- Full middleware stack and order (logging, recovery, CORS, and anything
  beyond the basics — rate limiting, request-ID injection, etc.)
- CORS configuration approach (hardcoded origin vs env-configurable list)
- Whether auth/DB/response-helper code already lives in a shared,
  importable internal Go package rather than being Equiptra-specific —
  if so, Ralto should import it, not copy it

Report back what you find. I want to confirm before anything gets built.

---

## Step 2 — once confirmed, scaffold Ralto's backend

Follow `ralto_backend_scaffold_plan.md` (in this repo), which lays out
what to copy/import vs adapt vs build fresh, based on Equiptra's stack
(Go, chi, pgx, JWT+bcrypt, Render, Supabase Postgres via Session pooler).
Frontend follows the same pattern as Equiptra too — React (Vite) on
Vercel — reusing the existing Ralto prototype components
(`ralto-desktop-app.jsx`, `ralto-mobile-app.jsx`, `ralto-crew-mobile.jsx`)
as the real UI to wire up to actual data, not rebuild from scratch.

**Three decisions are already made — don't relitigate these:**

1. iCal generation stays a small Python sidecar service (`ical_feed.py`,
   already written and tested — including a fixed double-escaping bug in
   the DESCRIPTION field) rather than being ported to Go.
2. Add the core-linking columns now, as inert nullable columns:
   `shared_project_id`, `calendar_feed_token`, `phone_number`,
   `notification_channels`, `brand_color_hex`, `website`. No suite-core
   service exists yet to link to — these just sit unused until it does.
3. Auth needs real design work for two genuinely different personas
   (scheduler/admin vs crew member) — don't copy Equiptra's role shape
   as-is without checking it actually fits.

**Phase 1 scope — don't over-build beyond this:**

- Manual data entry for jobs/people/bookings (create/edit forms) — no
  ScheduleIt migration in this phase
- Email notifications only, via SendGrid — no WhatsApp yet
- PWA, not native — one React codebase serves desktop and mobile
- No suite-core integration beyond the inert nullable columns above

**Reference docs in this repo:**
- `ralto-data-model-v0_1.md` — core entity definitions
- `ralto_schema_addendum_v1.md` — Project/Job hierarchy, iCal token,
  colour system, notification restructuring
- `ralto_notification_templates_v1.md` — the six notification triggers,
  each as a fixed skeleton with named variables
- `simplified_software_core_v0_1.md` — the shared suite-core data model
  (background only for Phase 1 — the inert columns are all Phase 1 needs)
- `ical_feed.py` — working iCal generator to wrap in the sidecar service

Start with Step 1. Report back before touching Step 2.
