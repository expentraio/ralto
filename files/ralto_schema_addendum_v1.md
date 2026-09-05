# Ralto Data Model — Addendum v1

Capturing four additions raised by the team, to be folded into the master data
model spec. Written as standalone decisions with rationale, so they can be
reviewed independently before merging.

---

## 1. Project / Job hierarchy

**Decision:** Introduce `Project` as a new entity that contains multiple
`Job`s. `Job` itself is unchanged in meaning — it remains the unit a crew
member is actually booked onto — but it now optionally belongs to a Project.

**Why this shape:** "Job" already matches the existing schema, prototypes,
and everyone's mental model (Job switcher, Job Detail, crew-matching per
Job). Renaming it would have been pure churn. "Project" was doing a
different job anyway at the suite level (`shared_project_id`) — grouping
related Jobs under one umbrella (e.g. a multi-day tournament, a season of
fixtures for one client) is exactly what that suite-level Project concept is
for. This also sets Ralto up cleanly for the future suite-core component:
Ralto's local `Project` row is the natural place to eventually hang
`shared_project_id`, without disturbing Job at all.

**Schema:**

```
Project
  id
  name
  client_id            (FK -> Clients)
  date_start
  date_end
  shared_project_id     (nullable FK -> future suite-core Project; unpopulated until that component exists)
  color_hex             (nullable — see §3)
  created_at / updated_at

Job
  id
  project_id            (nullable FK -> Project — a Job can exist standalone with no Project)
  ...existing Job fields unchanged...
  color_hex              (nullable — see §3; overrides Project's color_hex when set)
```

**Open question:** should a Job ever move between Projects after creation
(e.g. a standalone Job later gets folded into a Project)? Assume yes,
schema supports it trivially (just reassign `project_id`) — flag if that's
wrong.

---

## 2. iCal feed (crew member's own bookings only)

**Decision:** Each crew member gets a personal, tokenised `.ics` feed URL
covering only their own Bookings/BookingShifts. No scheduler-wide feed for
v1 (per team decision).

**Why token-based, not login-based:** calendar apps (Google/Apple/Outlook
calendar) poll a static URL on their own schedule and can't handle an
interactive login. A long, unguessable token in the URL is the standard
pattern for this — auth-by-obscurity, acceptable here since the feed is
read-only and scoped to one person's own data.

**Schema:**

```
Person
  ...existing fields...
  calendar_feed_token    (nullable, unique, generated on first request)
```

Regenerating the token (e.g. if a link is accidentally shared) simply
overwrites this field — the old URL stops resolving immediately, no
separate revocation table needed for v1.

**Open question — feed content scope:** does the feed show confirmed
Bookings only, or also Offered/pending ones (clearly labelled, e.g.
prefixed "[Tentative]")? Recommend confirmed-only for v1 to avoid a crew
member's personal calendar filling with holds that might not happen — but
worth confirming against how schedulers actually expect crew to use this.

**Refresh behaviour:** most calendar apps poll subscribed `.ics` feeds
hourly at best, some daily — this is "near real-time," not push. Worth
setting that expectation with users up front (e.g. in the app's copy when
showing the feed link) so a same-day schedule change isn't assumed to
appear instantly on someone's phone calendar.

---

## 3. Colour coding — derived from Client brand, not scheduler-assigned

**Revised understanding:** colour isn't an arbitrary per-job tag — it's
derived from the client's own brand colour (BBC Sport = yellow, Man Utd =
red, Man City = sky blue). Schedulers already recognise jobs this way
mentally; the ask is for Ralto to reflect that, not invent a new scheme.

**This makes the tension with the locked visual identity system real, not
hypothetical.** A palette choice can't avoid the collision, because the
colour isn't ours to choose — the client's brand dictates it, and some
client brand colours (Man Utd red, in particular) sit right on top of the
locked "problem/conflict" red. Same risk with BBC Sport's yellow against
"attention/pending" amber. Since hue can't be kept separate, the two
systems have to be kept separate by **shape and position** instead —
something that also happens to be the more robust distinction (works for
colour-blind users too, where hue-avoidance never fully does).

**Where colour lives in the schema:** on **Client**, as the source of
truth, inherited down through Project to Job — not assigned by a scheduler
per Job.

```
Client
  ...existing fields...
  brand_color_hex        (nullable — the client's own brand colour, e.g. BBC Sport yellow)

Project
  ...
  color_hex               (nullable — defaults to Client.brand_color_hex, override available for a Project spanning an unbranded/internal context)

Job
  ...
  color_hex               (nullable — defaults to Project's, then Client's; override available if a specific Job needs to stand out)
```

For clients with no strong/recognisable brand colour, fall back to an
auto-cycled palette from a small curated set, same as before.

**Confirmed pattern — tested against a mockup with the actual worst-case
colours (BBC Sport yellow near "pending" amber, Man Utd red near "conflict"
red):** client colour renders as a **left-edge stripe**, status as a
**top-right dot containing an icon** (not a plain colour dot). Left stripe
was chosen over a bottom stripe because it reads as a continuous rail
scanning down a list — a bottom stripe sits flush against the next card's
top edge and the colours blur together between adjacent cards, losing the
at-a-glance identification that's the actual point of doing this.

**Structural separation rules (load-bearing, not just tidy):**

- **Status is never colour-only.** Every status indicator carries a shape
  distinction — a text label in list/detail views, an icon inside the dot
  in compact card views ("conflict" = alert triangle, "pending" = clock,
  "confirmed" = checkmark) — never colour alone. This is what keeps a red
  client (Man Utd) from being misread as a red "conflict" status even when
  the hues are close.
- **Client/brand colour is never rendered as a filled pill or badge** —
  the exact shape family status uses. It shows up as a thin left-edge
  stripe, a small dot, or a coloured logo/initial tag instead — visually
  a different *kind* of object, not just a different colour, so the eye
  doesn't have to disambiguate by hue at all.
- **The two never sit in the same visual slot.** Confirmed: client stripe
  is always the left edge of a card/row; status dot is always the top-right
  corner. Fixed, different positions doing the disambiguation before
  colour even comes into it.
- **Accessibility fallback:** a short text/code (e.g. client initials)
  accompanies the colour marker in dense views, so identification isn't
  purely hue-dependent — genuinely useful now given some clients (Man
  City sky blue vs a generic "neutral/unknown" grey-blue status) are
  close enough to need a non-colour cue anyway.

**Tested and confirmed** against a mockup of the two worst-case collisions
— see `job_card_colour_comparison.html`. Left-stripe + icon-dot reads
cleanly; bottom-stripe was rejected for blurring between adjacent cards in
a scrolling list.

---

## 4. Notifications — channel-agnostic by design

**Decision:** Email ships in v1. WhatsApp (full Business API, template-
based) is planned for a later version. The schema is built now so adding
WhatsApp later is "add a channel," not "redesign Notifications."

**Schema:**

```
Notification
  id
  person_id
  type                   (e.g. booking_offered, shift_reminder, schedule_changed)
  payload                (structured data: job name, times, venue — channel-agnostic)
  created_at

NotificationDelivery
  id
  notification_id        (FK -> Notification)
  channel                 (enum: in_app | email | whatsapp)
  status                  (pending | sent | delivered | failed)
  sent_at

Person
  ...existing fields...
  phone_number            (nullable — added now, unused until WhatsApp ships)
  notification_channels   (which channels this person has enabled, e.g. {email: true, whatsapp: false})
```

**Why split Notification from NotificationDelivery:** one notification
(e.g. "you've been offered a shift") might go out on multiple channels at
once (in-app + email today, + WhatsApp later) — separating the *content/
trigger* from *each delivery attempt* means adding a channel is additive,
not a schema change to the notification itself.

**Deliberately not doing yet:** collecting WhatsApp opt-in consent in the
UI. The `phone_number` field is added now for schema readiness, but no UI
should ask for or store consent until WhatsApp is actually being built —
no reason to collect data ahead of using it.

---

## Summary of schema changes

| Entity | Change |
|---|---|
| **Client** | Add `brand_color_hex` (nullable) — source of truth for job colour |
| **Project** | New entity: `id`, `name`, `client_id`, `date_start`, `date_end`, `shared_project_id` (nullable), `color_hex` (nullable, defaults from Client) |
| **Job** | Add `project_id` (nullable FK), `color_hex` (nullable, defaults from Project, then Client) |
| **Person** | Add `calendar_feed_token` (nullable, unique), `phone_number` (nullable), `notification_channels` |
| **Notification** | Restructure: split into `Notification` (content/trigger) + new `NotificationDelivery` (per-channel send record) |
