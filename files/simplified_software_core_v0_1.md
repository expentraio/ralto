# Simplified Suite — Data Model Proposal v0.1

Turns the locked visual identity doc's 7 core capabilities into an actual
schema, and — since this project only has visibility into Ralto — focuses
on how Ralto's *existing* entities would link to core rather than
redesigning Equiptra or Expentra, which this document can't see into.

**Naming note:** as of this session, the parent brand is **Simplified
Suite** (renamed from "Simplified Software" in the locked v1 identity
doc — Ric is updating that doc directly to match). This is the first
place the rename has touched, so there's nothing else to reconcile it
against.

Locked starting point (from the visual identity doc):
> Core ownership rule: Simplified Suite = who / what / where.
> Products = the operational work.

---

## 1. Core entities

### Organisation
The tenant. Every customer using any Simplified Suite product is one
Organisation. All other core entities, and every product's local data,
ultimately trace back to an `organisation_id`.

```
Organisation
  id
  name
  created_at
```

### Person (org-level identity)
**This is the "who."** One row per human who can log into *any* Simplified
Software product — not per-product. A freelance camera operator who works
Ralto jobs and also happens to be an Equiptra user at a different company
is still two Person rows (different orgs), but someone who's both a Ralto
scheduler and an Equiptra equipment manager *at the same company* is one.

```
Person
  id
  organisation_id
  name
  email
  auth_credential_ref     (however login/auth is actually implemented)
  created_at
```

Deliberately **thin**. Ralto's own Person entity — Staff/Freelancer status,
Skills, PersonRoles, rates — stays exactly where it is, in Ralto, as a
product-specific extension. Core doesn't know or care that someone is an
"EVS Operator" — that's crewing detail, which the ownership rule assigns to
Ralto, not core. See §3 for how the two link.

### Users & permissions
Which Person can access which product, at what role.

```
ProductAccess
  id
  person_id
  product              (enum: ralto | equiptra | expentra)
  role                 (product-defined — e.g. Ralto: scheduler | crew | admin)
  granted_at
```

### Client
The customer/client a Project is done *for*. Shared because the same
client (e.g. a broadcast company) plausibly appears across Ralto, Equiptra,
and Expentra for the same real shoot — crew booked via Ralto, cameras
rented via Equiptra, expenses claimed via Expentra, all for "BBC Sport."

```
Client
  id
  organisation_id
  name
  website              (nullable — see brand colour note below)
  brand_color_hex       (nullable)
```

**Confirmed:** `brand_color_hex` belongs here, not on Ralto's local Client
— a client's brand colour isn't Ralto-specific. Ralto's local copy becomes
a cache/override once this exists.

**Considered and deliberately deferred:** auto-extracting `brand_color_hex`
from a client's logo/favicon given a `website` field. Technically doable
(favicon colour extraction, or third-party brand-data APIs), but real
reliability problems — monochrome logos, brands with no single dominant
colour, inconsistent favicon quality — mean manual entry stays necessary
as the fallback regardless, which undercuts the value of automating it.
The `website` field costs nothing to add now; the extraction logic itself
is a "later, if manual entry turns out to be real friction" item, not v1.

### Project
**The entity the suite doc's own example is built around** — one Project
("UFC 327 — Las Vegas"), attached to independently by Ralto, Equiptra, and
Expentra, each showing only the metric it owns.

```
Project
  id
  organisation_id
  client_id
  name
  date_start
  date_end
```

This is exactly what Ralto's schema addendum already anticipated: Ralto's
local `Project` entity (which contains multiple `Job`s) gets a
`shared_project_id` pointing here once core exists. Ralto's local Project
stays the operational container for Jobs; core Project is the thin
cross-product anchor that ties Ralto's, Equiptra's, and Expentra's separate
attachments to the same real-world thing together.

### Location
Venues/sites. Shared because the same physical place matters to all three
products differently — crew need to travel there (Ralto), equipment needs
delivering there (Equiptra), and expense claims reference travel to there
(Expentra) — but it's the same address regardless of which product is
asking.

```
Location
  id
  organisation_id
  name
  address
  timezone
```

### Shared identifiers
Not a single table so much as a pattern: every product-local entity that
represents a "real world thing also known to core" carries a nullable FK
back to the relevant core entity (`shared_project_id`, `client_core_id`,
`location_core_id`, etc.) rather than core trying to hold a copy of every
product's data. This is what lets "the suite provide a joined-up overview
without creating one application" — the linking is by reference, not by
duplication.

### Integrations
Third-party connections configured once at the org level rather than
per-product — e.g. a future Xero connection for Expentra, or the ScheduleIt
migration credentials, live here rather than being re-entered separately
inside each product.

```
Integration
  id
  organisation_id
  provider           (e.g. "scheduleit", "xero")
  credentials_ref
  connected_by_person_id
  connected_at
```

---

## 2. How this actually attaches to a Project — the UFC 327 example, modelled

```
Project (core)
  id: proj_ufc327
  name: "UFC 327 — Las Vegas"
  client_id: client_ufc

Ralto Job
  id: job_ufc327
  shared_project_id: proj_ufc327     <- the link
  ...Ralto's own roles, bookings, crew data...

Equiptra <equipment-allocation entity>
  shared_project_id: proj_ufc327     <- same link, different product
  ...Equiptra's own asset/allocation data...

Expentra <expense-claim entity>
  shared_project_id: proj_ufc327     <- same link again
  ...Expentra's own claims data...
```

Each product only ever reads/writes its own table. Core Project is never
mutated by a product's operational work — it's an anchor, not a shared
mutable record. The "34/34 crew confirmed · 96/96 items allocated · 14/17
claims approved" rollup shown in the doc's example is a *read-time join*
across three separate product tables via that shared id, not a
denormalised field stored anywhere.

---

## 3. The identity question — Person linking

This is the one place I'd flag a real decision rather than just a schema,
because it affects how much of Ralto's existing, already-built Person
entity would need to change.

**Option A — retrofit now:** Ralto's Person becomes a strict extension of
core Person; every Ralto Person row requires a `core_person_id`, no
exceptions.

**Option B — link gradually (recommended):** Ralto's Person stays exactly
as it is today, gains a nullable `core_person_id` — same pattern as
`shared_project_id` — populated as/when a given crew member's identity is
reconciled with core. Ralto keeps working exactly as it does now for
anyone not yet linked.

Option B is the lower-risk path and matches how `shared_project_id` was
already introduced: nullable, additive, no forced migration. Option A
would mean redesigning Ralto's onboarding flow around a core identity
system that doesn't exist yet — real risk for no immediate benefit, since
nothing in Ralto today needs cross-product identity to function.

**Worth naming honestly:** a freelance crew member who *also* shows up as
an Equiptra contact for the same organisation is the actual scenario this
solves — right now that'd be two disconnected identities. That's a real
future win, just not an urgent one, which is why Option B (link when it
matters, not before) fits.

---

## 4. Open questions this raises — genuinely cross-product, not just Ralto's to answer

- **Who creates a Project?** The suite doc's phrase "create the project
  once" implies a single creation point — presumably a lightweight
  parent-level surface — the Simplified Suite landing view itself, shown
  in the identity doc's own dark-shell mockup. That surface doesn't exist
  yet, even as a mockup beyond that one dark-shell sketch — it's a fifth
  UI beyond Ralto's own mobile + desktop work, and Equiptra/Expentra's own
  apps.

  **How you'd actually reach it from inside a product:** the shared mark
  (the three-bar symbol every product already renders at the top of its
  own sidebar, next to its wordmark) becomes the click target — reusing
  existing visual real estate rather than adding a new icon, and using the
  one element every product already has in common as the "go up a level"
  affordance. (Equiptra's "Products" nav item is its own equipment
  catalogue, unrelated to this — confirmed, not the suite-launcher.)
  **Confirmed desktop-only for now** — mobile's compact layout has no
  obvious place for a persistent mark, and each product already has its
  own separate app/URL on mobile, so there's less need for an in-app
  cross-product jump there in the first place.
- **Migration path for existing data:** Ralto already has real Job/Client
  data with no core links. Recommend the same additive pattern used
  throughout — nullable core references, populated gradually, never a
  forced cutover.
- **Cross-product permissions:** `ProductAccess` above is a first pass:
  does granting someone Ralto scheduler access say anything about their
  Equiptra access, or are these fully independent grants per product? The
  ownership rule ("core owns who") suggests core should be the source of
  truth for *identity*, but each product likely still owns its own
  authorization logic.

This document is scoped to what core needs to hold and how Ralto's
existing schema would eventually reference it — not a redesign of
Equiptra or Expentra, which this project has no visibility into.
