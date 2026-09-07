# Ralto Data Model — Addendum v2

Capturing five additions raised by the operations team as MVP requirements, to
be folded into the master data model spec. Same format as Addendum v1 —
standalone decisions with rationale, reviewable independently before merging.

Three of the seven items in the ops notes needed no decision and are recorded
at the end rather than given sections of their own.

---

## 1. Resource calendar — people down, dates across

**Decision:** Add a resource calendar as a primary scheduler view: one row per
person, one column per date, cells composed from that person's Bookings,
Availability and (as background bands) ProspectiveEvents. This is the view the
ops team described as "the home screen ScheduleIt has."

**Why this is the headline gap:** Ralto currently has no view on this axis at
all. The existing Calendar screen is jobs-over-time — job blocks packed into a
month grid. Crew is a searchable card list with no time dimension. Neither can
answer "is Kate double-booked in November" or "who's actually free that week,"
which is the question schedulers spend most of their day on.

The underlying logic already exists and is unused. Person conflict is a defined
derived value in the master doc (overlapping Bookings, or a Booking overlapping
`Availability = Unavailable`) and `Conflict` is already an `OperationalAlert`
type. What's been missing is a surface where a scheduler sees the collision
forming rather than being told about it afterwards.

**No new entity.** This is a read model over `Person`, `Booking`,
`BookingShift`, `Availability` and `ProspectiveEvent` (§3). Nothing here needs
storing; it needs querying efficiently by date window and person set.

**Row inclusion rule — this is the part that has to be right.** The ops note
raised the concern themselves: putting every freelancer in the system on screen
makes the view useless. Rows are therefore included as:

- **Staff** — always shown, whether or not they have anything in the window.
  Staff are a bounded set and their empty days are meaningful (that's the
  utilisation question).
- **Freelancers** — shown only if, within the visible window, they have a
  Booking of any status (including `Pencilled` and `Offered`), or an
  `Availability` row. Otherwise absent.
- **Explicitly added** — searching for a person adds their row for the session,
  so a scheduler can pull in a specific freelancer to check them against the
  grid.

This keeps the grid at roughly the size of the staff list regardless of whether
the freelancer pool is 200 or 2,000. No pinning is persisted in v1 — added rows
are session state, not a stored preference.

**Cell precedence.** Where a person has both a Booking and an `Unavailable`
Availability row on the same date, render both and flag it rather than picking a
winner — that overlap is exactly the exception the view exists to catch.

**Default window — confirmed: one month.** The view opens on the current
calendar month. This is a wide grid (28–31 date columns), so it needs a frozen
person column on the left with the date columns scrolling horizontally beneath
a sticky date header. Day cells will be narrow — around 28–32px — which means
cell content is a block, not text: job identity comes from the client colour and
a hover/click detail, not from a label that won't fit.

---

## 2. Availability types — annual leave

**Decision:** Add a `type` to `Availability` so leave is distinguishable from
ordinary unavailability. Logged by the scheduler directly. No request flow, no
approval state, no crew-facing leave UI in v1.

**Why not a separate Leave entity:** leave *is* unavailability with a reason
attached. A separate table would have to be reconciled against `Availability`
every time the resource calendar renders, and every conflict check would need to
consult two sources instead of one. One row type, one query.

**Schema:**

```
Availability
  ...existing fields...
  type    (nullable enum: annual_leave | sick | toil | other — only meaningful when status = Unavailable)
```

`type` stays null on `Available`, `Tentative`, and on the system-generated
`Booked` rows. Freelancer unavailability uses the existing `Unavailable` status
with `type` either null or `other` — no schema change was needed on that side,
which is why the ops team's freelancer-availability ask is satisfied by this
same field rather than needing its own section.

**Deliberately out of scope:** leave balances and entitlement tracking (days
taken, days remaining). That's HR, and the master doc's non-goals already
exclude Ralto being a general HR store. If it's wanted later it belongs in a
different product, not in `Availability`.

---

## 3. ProspectiveEvent — dates that aren't jobs yet

**Decision:** New lightweight entity for prospective factors — the ops note's
example is "FA Cup final day." A date range you're planning around before any
job exists.

**Why not just a Job with `status = Draft`:** `Draft` means "this job exists but
isn't finished being set up," which is a different claim from "something might
happen here." Forcing prospective events into `Job` would put them in job lists,
give them requirements and crewing completeness figures they shouldn't have, and
require excluding them by status in most queries. Cheaper to keep them separate
and let them graduate into a Job when they firm up.

**Schema:**

```
ProspectiveEvent
  id
  org_id
  name                  e.g. "FA Cup Final"
  date_start / date_end
  client_id             (nullable FK -> Client — frequently unknown at this stage)
  status                (enum: open | converted | dropped)
  converted_job_id      (nullable FK -> Job — set when it becomes real)
  notes
  created_at / updated_at
```

**Rendering:** a background band across the resource calendar (§1) and a layer
on the existing Calendar screen — visible behind the schedule, never presenting
itself as a job. It has no requirements and no bookings, so nothing about
crewing completeness is affected.

**Conversion:** creating a Job from a ProspectiveEvent sets `converted_job_id`
and `status = converted`. The band then resolves to the real job rather than
being deleted, so the planning history survives. `dropped` covers the events
that never happen, which are worth keeping — a fixture that didn't land this
season will probably come round again.

---

## 4. Pencil — commitment as a second axis, not more statuses

**Decision:** Job commitment (`pencil` / `firm`) becomes a separate field from
the job lifecycle status. `Booking.status` gains `Pencilled` ahead of `Offered`.

**Why a second axis:** the existing `Job.status` enum (`Draft, Defining,
Crewing, Confirmed, Briefed, Live, Complete, Cancelled`) tracks internal
progress — are we crewed, are we briefed, are we live. Pencil/booked/cancelled
tracks commercial certainty — is this happening at all. They're orthogonal: a
job can be fully crewed and still pencilled, or firm and barely started.
Collapsing them into one enum is what makes scheduling tools confusing, and
would mean losing lifecycle detail to gain a commercial tag.

**Schema:**

```
Job
  ...existing fields...
  commitment    (enum: pencil | firm — default firm; defaults to pencil when created from a ProspectiveEvent)

Booking
  status        (enum gains `Pencilled`, ordered before Offered:
                 Pencilled, Offered, Confirmed, Declined, Cancelled, Unavailable, Conflict, Complete)
```

**The three tags ops asked for are derived, not stored:**

| Displayed tag | Derived from |
|---|---|
| Cancelled | `Job.status = Cancelled` |
| Pencil | otherwise, `Job.commitment = pencil` |
| Booked | otherwise |

So the ops team gets exactly the three-state vocabulary they use, with the
lifecycle enum intact underneath for everything else.

`Pencilled` on a Booking means you're holding someone. `Offered` means you've
formally asked and are awaiting an answer. Schedulers use both and they aren't
the same act — a pencil doesn't put the ball in the crew member's court, and
shouldn't fire an offer notification.

**Pencils never count as filled.** Crewing completeness reads "31 confirmed · 2
pencilled · 1 open" rather than folding pencils into the confirmed count. A job
that looks crewed when a third of it is provisional is worse than no figure at
all.

**A pencil clash is not a conflict.** Being pencilled on two jobs at once is
normal practice, not an error state:

| Overlap | Treatment |
|---|---|
| Confirmed vs Confirmed | `Conflict` OperationalAlert (hard) |
| Pencilled vs Confirmed | `Conflict` OperationalAlert (hard) — needs resolving |
| Pencilled vs Pencilled | Soft indicator on the grid only, no alert |
| Any vs `Availability = Unavailable` | `Conflict`, unchanged from today |

**Rendering:** pencilled blocks are hatched or outlined, confirmed blocks are
solid. Texture rather than hue, consistent with Addendum v1 §3 — status is never
colour-only, and the client brand stripe keeps its own slot untouched.

**Confirmed with ops: no ranked pencils.** They don't work first pencil /
second pencil with challenge rights, so `Pencilled` is a flat status with no
`pencil_rank`. Two people pencilled on the same slot are peers, and the
scheduler resolves it by hand.

---

## 5. "Already asked" — surfacing declines during crew-matching

**Decision:** Add a fourth crew-matching group, "Already asked," scoped to the
job being crewed. No schema change — the data already exists and is simply not
surfaced.

**The problem it solves:** crew-matching currently groups candidates as
*Available & suitable* / *Possible* / *Unavailable*. A freelancer who declined
this exact job last week still appears as available and suitable, because they
are — just not to you, for this. So they get asked again.

**Composition — must union two sources.** A decline lands in one of two places
depending on how the ask was made, and reading only one loses half the history:

- `Booking.status = Declined` — where a formal offer went out.
- `AvailabilityRequest.response = No` with `job_id` set — where only a date
  range was asked about. These never produced a Booking row at all.

The group should also include **outstanding** asks (`Booking.status = Offered`
awaiting response, `AvailabilityRequest.status = Pending`), since the purpose is
"don't ask twice." Two subgroups within it: *awaiting response* and *declined*,
each showing who, when, and against which role.

**Role scoping:** a decline is recorded against a `JobRequirement`, so it's
role-specific. Someone who declined Camera on a job still surfaces as a
candidate when crewing Utilities on that same job, but carries the flag —
"declined Camera on this job." A no to one role isn't a no to the job.

**Implementation note for the build:** because Bookings are never deleted, a
person can accumulate multiple Booking rows against the same requirement over
time (declined, then re-asked and confirmed). Any query for "who is currently on
this job" must filter out terminal statuses — `Declined`, `Cancelled`,
`Unavailable` — rather than assuming one Booking per person per requirement.
Getting this wrong shows ghosts on the crew list.

---

## Items needing no schema change

Three of the seven ops requirements are already served:

| Ops ask | Where it already lives |
|---|---|
| Click into a job, see who's crewed | Planner — per-role confirmed/required breakdown plus a People tab listing everyone on the job |
| Freelancer unavailability logging | `Availability` with `status = Unavailable`; §2 adds the reason field but the mechanism existed |
| Crew list PDF export | New output, no new data. The master doc already treats a call sheet as assembled live from Job + JobRequirement + Booking + Person + Venue + JobContact — a crew-list PDF is a render of that, not a stored document |

---

## Summary of schema changes

| Entity | Change |
|---|---|
| **Availability** | Add `type` (nullable enum: `annual_leave \| sick \| toil \| other`, meaningful only when `status = Unavailable`) |
| **ProspectiveEvent** | New entity: `id`, `org_id`, `name`, `date_start`, `date_end`, `client_id` (nullable), `status` (`open \| converted \| dropped`), `converted_job_id` (nullable), `notes`, timestamps |
| **Job** | Add `commitment` (enum: `pencil \| firm`, default `firm`) |
| **Booking** | Add `Pencilled` to the status enum, ordered before `Offered` |
| **Derived values** | Add: resource-calendar row set (§1); pencilled count as a separate term in crewing completeness (§4); "already asked" candidate group per job (§5) |

No changes to `Person`, `Client`, `Project`, `JobRequirement`, `Notification` or
`OperationalAlert`. The conflict-severity rules in §4 change how existing
`Conflict` alerts are *raised*, not the alert entity itself.

No open questions outstanding — ranked pencils confirmed out of scope, resource
calendar window confirmed as one month.
