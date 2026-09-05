# Ralto Notification Templates — v1

Six crew-facing triggers, each written once as a fixed skeleton with named
variables — the structure a WhatsApp Business template requires — so email
today and WhatsApp later are two renderings of the same definition, not two
separate things to maintain.

**Scope note:** these are the *outbound, external* notifications sent to a
crew member's phone/inbox (Email now, WhatsApp later, per the channel
decision). They're a different thing from the scheduler-facing in-app alerts
already built into the Today screen ("Offer unanswered", "1 position
unfilled") — same underlying event, different audience, different render.
A scheduler's Today screen doesn't need a "template" in the WhatsApp sense
since it's just UI, not a vendor-sent message.

**A refinement to "one notification, one action":** Accept/Decline and
Yes/No below are *one decision* with two possible responses, not two
separate asks bundled together. The rule that actually matters is: one
notification per trigger, one decision per notification — not literally one
button. Bundling "2 unrelated things need your attention" into one message
is what breaks cleanly translating to WhatsApp later; a single yes/no
decision doesn't.

All six are **utility category** (order/booking-status updates) under
WhatsApp Business rules, not marketing — cheaper to send and meaningfully
easier to get template-approved than promotional content.

---

## 1. booking_offered

**Fires when:** a role on a job is offered to a crew member, awaiting response.

**WhatsApp template skeleton** (Twilio Content API syntax):
```
You've been offered {{1}} on {{2}}, {{3}}.
```
| Variable | Meaning | Example |
|---|---|---|
| `{{1}}` | Role | EVS Operator |
| `{{2}}` | Job name | UFC 327 |
| `{{3}}` | Dates | 14–19 Nov |

**Buttons:** Quick Reply — `Accept` / `Decline` (captured directly via
WhatsApp's webhook — a real capability email can't match, since email can
only link out to the app, not capture the response inline).

**Email**
- Subject: `New offer: {role} on {job_name}`
- Body: "You've been offered {role} on {job_name}, {dates}. Open Ralto to accept or decline."
- CTA: **View & respond** (deep link to the offer in Ralto)

**In-app copy** (for reference — same event, scheduler-side): "Offer unanswered — {crew_name} · {role} · {job_name} · sent {time_ago}"

---

## 2. booking_confirmed

**Fires when:** an offer is accepted, or a scheduler directly confirms a Staff booking.

**WhatsApp template skeleton:**
```
You're confirmed for {{1}} on {{2}}, {{3}}.
```
| Variable | Meaning | Example |
|---|---|---|
| `{{1}}` | Role | EVS Operator |
| `{{2}}` | Job name | UFC 327 |
| `{{3}}` | Dates | 14–19 Nov |

Deliberately **no call time in this message** — that's what `shift_reminder`
is for. Cramming a call time in here too adds a variable for no real
benefit, and multi-day bookings have a different call time per shift
anyway (per the BookingShift model) — one confirmed-message can't hold all
of them cleanly.

**Buttons:** Call-to-Action URL — `View details`

**Email**
- Subject: `Confirmed: {role} on {job_name}`
- Body: "You're confirmed for {role} on {job_name}, {dates}. Open Ralto for full shift details and call times."
- CTA: **View details**

---

## 3. booking_updated

**Fires when:** something material changes on an existing booking — call
time, venue, or dates. One trigger covers all three rather than three
near-duplicate templates, since Meta approval overhead scales with template
count and the shape of the message is identical either way.

**WhatsApp template skeleton:**
```
Update to {{1}} on {{2}}: {{3}}.
```
| Variable | Meaning | Example |
|---|---|---|
| `{{1}}` | Role | EVS Operator |
| `{{2}}` | Job name | Champions League Final |
| `{{3}}` | What changed (short, specific) | Call time moved to 06:00 |

`{{3}}` should read like the locked voice guide's own example — "Call time
moved from 05:30 to 06:00," not "Your booking details have been updated."

**Buttons:** Quick Reply — `Acknowledge` (this is the confirmation the
Today screen's "Call-time change unacknowledged" tracker is waiting on —
this template and that in-app tracker are the same event, two sides of it)

**Email**
- Subject: `Update: {job_name}`
- Body: "{change_description}. Open Ralto to review and acknowledge."
- CTA: **Acknowledge**

---

## 4. booking_cancelled

**Fires when:** a confirmed or offered booking is withdrawn.

**WhatsApp template skeleton:**
```
{{1}} on {{2}} ({{3}}) has been cancelled.
```
| Variable | Meaning | Example |
|---|---|---|
| `{{1}}` | Role | EVS Operator |
| `{{2}}` | Job name | Riyadh Boxing |
| `{{3}}` | Dates | 3–10 Dec |

**Buttons:** none. Per the voice guide's "no unnecessary celebration or
apology" principle, there's nothing actionable here — adding a button just
to have one would be decoration, not function.

**Email**
- Subject: `Cancelled: {role} on {job_name}`
- Body: "{role} on {job_name} ({dates}) has been cancelled."

---

## 5. shift_reminder

**Fires when:** 2 days before call time. A fixed lead time rather than a
configurable one for v1 — simpler to build, and revisited if it turns out
2 days is wrong for some job types (e.g. very short-notice bookings where
2 days before is already mid-booking).

**WhatsApp template skeleton:**
```
Reminder: {{1}} today at {{2}}, {{3}}.
```
| Variable | Meaning | Example |
|---|---|---|
| `{{1}}` | Job name | UFC 327 |
| `{{2}}` | Call time | 07:00 |
| `{{3}}` | Venue | T-Mobile Arena, Las Vegas |

Kept to three variables deliberately — any special instructions (loading
dock, contact name) live behind the "View details" link rather than
crammed into the message body, both for template-approval simplicity and
because a reminder should be scannable in one glance.

**Buttons:** Call-to-Action URL — `View details`

**Email**
- Subject: `Reminder: {job_name} today`
- Body: "Call time {call_time} at {venue}. Open Ralto for full details."
- CTA: **View details**

---

## 6. availability_request

**Fires when:** a scheduler asks whether a crew member is free across a
date range, ahead of there being a specific job to offer.

**WhatsApp template skeleton:**
```
Are you available {{1}}–{{2}} for {{3}}?
```
| Variable | Meaning | Example |
|---|---|---|
| `{{1}}` | Start date | 20 Oct |
| `{{2}}` | End date | 27 Oct |
| `{{3}}` | Location/context | Abu Dhabi |

**Buttons:** Quick Reply — `Yes` / `No`

**Email**
- Subject: `Availability check: {dates}`
- Body: "Are you available {dates} for {location}? Reply via Ralto."
- CTA: **Respond**

---

## Summary table

| Trigger | Variables | WhatsApp buttons | Captures response inline? |
|---|---|---|---|
| booking_offered | role, job, dates | Accept / Decline | Yes |
| booking_confirmed | role, job, dates | View details | No |
| booking_updated | role, job, change | Acknowledge | Yes |
| booking_cancelled | role, job, dates | — | — |
| shift_reminder | job, call time, venue | View details | No |
| availability_request | start, end, location | Yes / No | Yes |

## What's still open

- **Actual Meta template submission** — these skeletons are what would get
  submitted to Meta for approval once the WhatsApp integration is built.
  See the separate setup walkthrough for what that actually involves.

## Decisions made

- **shift_reminder lead time: 2 days before call time.**
- **Language: English only for v1.** WhatsApp templates are approved
  per-language, so adding a second language later means resubmitting each
  template for that language, not just translating the text.
