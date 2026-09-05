# Ralto — Data Model & Schema v0.1

Companion to *Ralto — Product Scope v0.1*. Covers the entities needed for
Jobs, Crew, Bookings and Availability — the core of the v1 scope. Naming
mirrors the scope doc's language rather than generic scheduling-tool jargon
(e.g. `Booking`, not `Assignment`; `JobRequirement`, not `Slot`).

Multi-tenancy (`org_id`) is included on top-level entities so this can serve
multiple production companies from day one, but is not elaborated on further
here — that's an auth/infra concern, not a crewing-domain one.

---

## 1. Entity overview

```
Client 1───* Job *───1 Venue
                │
                ├──* JobContact
                │
                └──* JobRequirement ───* Role
                          │
                          └──* Booking ───1 Person
                                    │            │
                                    ├──* BookingShift
                                    │
                                    └──1 Timesheet│
                                                 ├──* Availability
                                                 ├──* PersonRole ──* Role
                                                 ├──* PersonDocument
                                                 └──* AvailabilityRequest
```

Plain-language reading: a **Job** belongs to a **Client** and happens at a
**Venue**. It has a set of **JobRequirements** (e.g. "6 EVS, 16–19 Nov"). Each
requirement fills up with **Bookings**, and each Booking links one **Person**
to one requirement with its own status. A Person separately carries their own
**Availability** calendar, **Roles/skills**, and **Documents**, independent of
any one job.

---

## 2. Core entities

### 2.1 Client
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| org_id | uuid | |
| name | text | |
| contact_name | text | nullable |
| contact_email | text | nullable |
| contact_phone | text | nullable |
| notes | text | nullable |

### 2.2 Venue
Kept separate from `Job` because the same venue recurs across jobs (T-Mobile
Arena will host many events), and conflict/travel logic benefits from a
stable location record.

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| org_id | uuid | |
| name | text | e.g. "T-Mobile Arena" |
| address | text | |
| city | text | |
| country | text | |
| timezone | text | IANA tz — needed for call times across regions |
| notes | text | nullable |

### 2.3 Job
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| org_id | uuid | |
| name | text | e.g. "UFC 327 — Las Vegas" |
| client_id | uuid → Client | |
| project_reference | text | nullable, external ref number |
| venue_id | uuid → Venue | nullable |
| start_date | date | |
| end_date | date | |
| status | enum | `Draft, Defining, Crewing, Confirmed, Briefed, Live, Complete, Cancelled` — mirrors the Create→Define→Crew→Confirm→Brief→Operate→Complete lifecycle |
| shared_project_id | uuid → Project | nullable — see §2.4a |
| notes | text | nullable |
| created_by | uuid → Person | |
| created_at / updated_at | timestamp | |

**Derived, not stored:** `crewing_completeness` (e.g. "31/34 confirmed") is
always computed from `JobRequirement` + `Booking` at read time. Storing it
risks it drifting from the truth — the one-source-of-truth principle applies
to status as much as to content.

### 2.4 JobContact
Production contacts differ from the Client's own contact — a job may have an
on-site production manager distinct from the client relationship owner.

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| job_id | uuid → Job | |
| name | text | |
| role_title | text | e.g. "Production Manager" |
| email | text | nullable |
| phone | text | nullable |

### 2.4a Project (shared identity, cross-product)
Since IDs will be shared across Ralto, Equiptra and Expentra, a `Project`
isn't owned by any one product — it lives in a fourth component, sitting
below the three products as the eventual core of the suite. Each product
keeps its own richer entity (`Job` here) and links back to it.

| Field | Type | Notes |
|---|---|---|
| id | uuid | the ID all three products reference |
| org_id | uuid | |
| name | text | display name, may differ slightly per product's own labelling |
| reference | text | nullable, shared external reference number |
| start_date / end_date | date | nullable — a loose outer bound, not authoritative for any one product's own dates |
| created_at | timestamp | |

Ralto's `Job` is the source of truth for crewing dates/status; Equiptra and
Expentra would each hold their own equivalent. `Project` just lets "UFC 327"
resolve to the same thing everywhere without three separate ID mappings.

This has an implication beyond `Project` itself: if a fourth, core
component is going to exist, it's the natural home for anything else that's
genuinely shared rather than crewing-specific — most obviously `org_id`
itself (today modelled loosely on every entity in this doc as if Ralto owns
tenancy outright) and possibly a shared `Person`/user identity, since the
same human is a crew member in Ralto and potentially a requester or
approver in Expentra. Neither of those is being pulled into this schema
now — org/tenancy and any shared identity model belong in the core
component's own spec, not bolted on here — but Ralto's build should assume
`org_id` and `Person.id` may eventually be foreign, not native, values.

### 2.5 Role
Master list, org-scoped. Both a Person's capabilities and a Job's
requirements reference this same table, which is what makes matching work.

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| org_id | uuid | |
| name | text | e.g. "EIC", "EVS", "Audio", "Utilities" |
| category | text | nullable, e.g. "Technical", "Production" |

### 2.6 JobRequirement
The "Define" step's line items.

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| job_id | uuid → Job | |
| role_id | uuid → Role | |
| quantity_required | int | e.g. 6 |
| start_date | date | may differ from job dates (e.g. Utilities 16–19 Nov within a 14–19 Nov job) |
| end_date | date | |
| call_time | time | nullable — a suggested default only. The authoritative call time for any individual is on their `Booking`, since call times commonly differ person-to-person even within the same requirement (e.g. two EVS operators on different call times the same day) |
| notes | text | nullable |

**Derived:** `quantity_confirmed`, `quantity_offered`, `quantity_unfilled` —
all counted from associated `Booking` rows by status.

---

## 3. Crew (Person) entities

### 3.1 Person
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| org_id | uuid | |
| first_name / last_name | text | |
| email | text | |
| phone | text | |
| base_location | text | used in crew-matching (proximity to venue) |
| employment_type | enum | `Staff, Freelancer` |
| status | enum | `Active, Inactive` |
| preferred_status | enum | `Preferred, Approved, Standard, Restricted` — used in crew-matching grouping |
| standard_rate | decimal | nullable. Visible to the scheduler and to this Person themself — not gated behind a separate commercial-view permission |
| rate_currency | text | nullable |
| overtime_rule_id | uuid → OvertimeRule | nullable |
| notes | text | nullable |
| created_at / updated_at | timestamp | |

Primary role is *not* a flat field here — it's expressed via `PersonRole`
with `is_primary = true`, so a person can have exactly one primary and any
number of secondary roles without a schema change.

### 3.2 PersonRole
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| person_id | uuid → Person | |
| role_id | uuid → Role | |
| is_primary | bool | |

### 3.3 Skill / Certification (master list)
Distinct from `Role`: a Role is "what job you do on a booking", a Skill is
"a qualification or credential you hold" (may or may not expire).

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| org_id | uuid | |
| name | text | e.g. "Rigging Level 2", "US Work Visa" |
| type | enum | `Skill, Certification, Visa, Credential` |
| expiry_tracked | bool | whether instances of this need an expiry date |

### 3.4 PersonSkill
Join table with the instance data (a specific person's specific cert).

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| person_id | uuid → Person | |
| skill_id | uuid → Skill | |
| issued_date | date | nullable |
| expiry_date | date | nullable |
| document_id | uuid → PersonDocument | nullable |
| status | enum | `Valid, Expiring, Expired` — derived from expiry_date but can be cached |

### 3.5 PersonDocument
Scoped deliberately narrow per the non-goals section — crewing-relevant
documents only, not a general HR file store.

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| person_id | uuid → Person | |
| type | enum | `Certification, Visa, ProductionCredential` |
| file_ref | text | storage pointer |
| expiry_date | date | nullable |
| uploaded_at | timestamp | |

### 3.6 OvertimeRule
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| org_id | uuid | |
| name | text | |
| threshold_hours | decimal | hours before OT applies |
| multiplier | decimal | e.g. 1.5 |

---

## 4. Booking (the Confirm workflow)

### 4.1 Booking
The join between a `JobRequirement` and a `Person`, carrying its own
lifecycle independent of both.

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| job_requirement_id | uuid → JobRequirement | |
| person_id | uuid → Person | |
| status | enum | `Offered, Confirmed, Declined, Cancelled, Unavailable, Conflict, Complete` |
| start_date / end_date | date | may be a subset of the requirement's dates (partial-job booking) |
| call_time | time | nullable. Used only when the booking has a single, unchanging call time across its dates. If call time varies day-to-day, leave this null and use `BookingShift` (§4.2) instead — a Booking should not carry both. |
| rate_override | decimal | nullable, overrides Person.standard_rate for this booking. Same visibility as above: scheduler + the booked Person, no separate gating |
| offered_at | timestamp | |
| responded_at | timestamp | nullable |
| confirmed_at | timestamp | nullable |
| notes | text | nullable |

Note on `Needed`: this status isn't a Booking row at all — an unfilled
position is simply the gap between `JobRequirement.quantity_required` and
the count of active Bookings against it. Modelling "Needed" as a real row
would mean deleting/creating rows just to represent an empty slot, which is
more state to keep in sync for no benefit.

### 4.2 BookingShift
Handles a single Booking having a different call time on different days
(e.g. Thu 07:00, Fri 09:00, Sat 07:00) — common enough on multi-day jobs
that it's part of the core model rather than deferred.

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| booking_id | uuid → Booking | |
| date | date | one row per working day within the Booking's date range |
| call_time | time | |
| notes | text | nullable — e.g. "later call, rig day" |

Every date in a Booking's range should have exactly one `BookingShift` row
if shifts are used at all — partial coverage (some days with a shift row,
others relying on `Booking.call_time`) would reintroduce the ambiguity this
table exists to avoid. The Planner and call-sheet generation should treat
"has any BookingShift rows" as the signal to read per-day times instead of
the single `Booking.call_time` field.

### 4.3 Timesheet
The "Complete" step's actuals, one per Booking that reached that stage.

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| booking_id | uuid → Booking | |
| scheduled_start / scheduled_end | timestamp | copied from Booking at creation |
| actual_start / actual_end | timestamp | submitted by crew |
| break_minutes | int | |
| status | enum | `Submitted, Approved, Rejected` |
| submitted_at | timestamp | |
| approved_by | uuid → Person | nullable |
| approved_at | timestamp | nullable |
| calculated_cost | decimal | derived from rate + OvertimeRule, not manually entered |

---

## 5. Availability

### 5.1 Availability
A Person's own calendar, independent of any job.

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| person_id | uuid → Person | |
| start_date / end_date | date | |
| status | enum | `Available, Unavailable, Tentative, Booked` |
| notes | text | nullable |

`Booked` entries are typically system-generated from confirmed Bookings
rather than hand-entered, so the calendar never contradicts the schedule.

### 5.2 AvailabilityRequest
The targeted "Are you available?" workflow.

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| person_id | uuid → Person | |
| job_id | uuid → Job | nullable — can be a generic date-range ask before a job exists |
| start_date / end_date | date | |
| message | text | |
| status | enum | `Pending, Responded` |
| response | enum | `Yes, Partially, No` | nullable until responded |
| responded_at | timestamp | nullable |
| suggested_booking_id | uuid → Booking | nullable — see logic below |

**Response handling:**
- Every response (`Yes`, `Partially`, or `No`) triggers a courtesy
  `Notification` to the scheduler who sent the request, regardless of what
  happens next. Nobody should have to poll for an answer.
- If the response is `Yes` (or `Partially`, scoped to the available dates)
  **and** `Person.employment_type = Staff`, Ralto auto-creates a draft
  `Booking` against the matching `JobRequirement` (if `job_id` was set on
  the request) and links it via `suggested_booking_id`. This booking is
  created in `Offered` status, not `Confirmed` — it still needs the
  scheduler to actually assign it to a requirement and send it, since a
  generic availability answer isn't the same as a firm request for a
  specific role. An `OperationalAlert` of type `AutoSuggestedBooking` is
  raised against the Job at the same time, so it surfaces in "Needs
  attention" rather than sitting quietly alongside bookings the scheduler
  created themselves.
- If the person is a Freelancer, no Booking is auto-created — the scheduler
  still has to act on the availability manually. The distinction: staff are
  already committed to the business, so surfacing them as pre-filled is safe;
  freelancers are a market of choices, and auto-booking one prematurely could
  cut off the scheduler's normal comparison across candidates.

---

## 6. Supporting / cross-cutting

### 6.1 Notification
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| person_id | uuid → Person | |
| type | enum | `Offer, CallTimeChange, JobUpdate, AvailabilityRequest, Reminder` |
| related_entity_type | text | e.g. "Booking" |
| related_entity_id | uuid | |
| status | enum | `Sent, Read, Actioned` |
| created_at | timestamp | |

### 6.2 OperationalAlert
Backs the "Needs attention" section of Today and the exception surfacing in
Operate. Computed mostly on read, but logging open/resolved state lets the
UI show "1 call-time change awaiting acknowledgement" without recomputing
history each time.

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| job_id | uuid → Job | |
| type | enum | `MissingCrew, LateConfirmation, CallTimeChange, Conflict, UnacknowledgedUpdate, NoShow, AutoSuggestedBooking` |
| related_entity_id | uuid | nullable, e.g. a Booking id |
| status | enum | `Open, Resolved` |
| created_at | timestamp | |
| resolved_at | timestamp | nullable |

---

## 7. Key derived values (never stored as source of truth)

| Value | Computed from |
|---|---|
| Job crewing completeness ("31/34 confirmed") | `JobRequirement.quantity_required` vs. `Booking` counts by status |
| Person conflict | Overlapping `Booking` date ranges, or `Booking` overlapping `Availability = Unavailable` |
| Crew-matching groups (Available & suitable / Possible / Unavailable) | `PersonRole` + `Availability` + existing `Booking` load + `preferred_status` + `base_location` proximity to `Venue` |
| Call sheet | `Job` + `JobRequirement` + `Booking` + `Person` + `Venue` + `JobContact`, assembled live — never a separately stored document |
| Certification/visa expiry state | `PersonSkill.expiry_date` vs. current date, checked against the job's dates during crew-matching |

---

## 8. Decisions made

| Question | Decision |
|---|---|
| Rate visibility | Visible to the scheduler and to the Person being booked. No separate commercial-view permission gate. |
| Call time granularity | Call time lives on `Booking` (or `BookingShift` for day-varying cases), not just `JobRequirement` — different people on the same requirement can have different call times, and one person's call time can vary day-to-day within their own booking. |
| Availability `Yes`/`Partially` → Booking | Auto-suggests a draft `Offered` Booking only if `Person.employment_type = Staff`, and raises an `AutoSuggestedBooking` alert so it lands in "Needs attention" rather than blending in. Freelancers require manual scheduler action either way. A courtesy notification/email goes out on every response, staff or freelance. |
| Cross-product IDs | A fourth, suite-core component owns `Project` — sitting below Ralto, Equiptra and Expentra rather than inside any of them. This is expected to become the eventual foundation of the suite, likely extending to shared `org_id`/tenancy and possibly shared `Person` identity over time, though those stay out of Ralto's own schema for now (see §2.4a). |

## 9. Note for build sequencing

The suite-core component (`Project`, and eventually more) doesn't exist yet.
Ralto's build should treat `shared_project_id`, and later `org_id`, as
values that will come from an external source rather than be generated
locally — building against a stub now is more sustainable than treating
Ralto's own IDs as authoritative and migrating later. Worth flagging to
whoever ends up building the core component that Ralto's schema already
assumes its existence.

---

*Non-goals reminder: no payroll, HR, accounting, equipment, or general
project-management tables appear here by design — those stay in Expentra,
Equiptra, or external systems, matching the scope doc's boundaries.*
