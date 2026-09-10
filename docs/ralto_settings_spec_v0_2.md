# Ralto — Settings, two destinations v0.2

Two separate pieces of work that share a name and nothing else. Written
spec first, per how we've done everything else — no code yet.

**v0.2 change:** all three open questions from v0.1 are decided — the
crew self-edit field list, the email-change safeguard, and the admin
Settings scope. All three are explicitly current-scope, not a ceiling —
expected to grow as the system sees real use.

---

## 1. Why these are two destinations, not one

Two different apps, two different people, two different meanings of
"Settings" — confirmed against the actual code, not assumed:

- **Crew app** (`RaltoCrewApp.tsx`) — a freelancer or staff member managing
  their own contact details. Nothing to curate, nothing organisational.
- **Scheduler app** (`RaltoDesktopApp.tsx`) — an inert Settings icon in the
  sidebar today, no page behind it. This is where Roles, Overtime rules,
  and Skills belong — reference data schedulers curate, not anyone's
  personal account.

No shared component, no shared screen. They just happen to both be
called "Settings" by the people who'll use them.

---

## 2. Crew: Profile becomes editable

The crew app already has a **Profile** tab — this is the right home,
not a new one. Today it shows name, base location, and a documents list,
all read-only, plus Sign out. Confirmed there is no self-service update
capability anywhere in the crew app currently — not restricted, just
absent.

### The real finding: this needs a new, narrow backend endpoint

`UpdatePerson` already exists, but it's the scheduler's endpoint — full
field set, including employment type, standard rate, preferred status,
and notes. If crew self-edit calls that endpoint with a form that simply
*shows* fewer fields, the API itself would still accept the rest — a
freelancer could submit a request that changes their own day rate, and
nothing server-side would stop it. Hiding a field in the UI is not the
same as the API refusing it.

**This needs its own endpoint** — call it `UpdateOwnProfile` or similar —
that only ever writes the fields on this list, full stop, regardless of
what the request body contains:

- Email
- Phone
- Base location
- Notification channels

Everything else — employment type, standard rate, preferred status,
active/status, notes, roles — stays scheduler-only. Not hidden from
crew's form; genuinely unreachable through this endpoint at all.

**Confirmed as the field list.** Current scope, expected to grow as the
system's used in practice — not a permanent ceiling, but this is what
gets built now.

### Decided: changing your own email requires current-password confirmation

Email is also the login identifier — it's what the person types in at
the crew login screen, and it's covered by the unique-per-organisation
index from the email-case-sensitivity fix. Get it wrong and you've
locked yourself out, so it doesn't get the same casual treatment as a
phone number.

**When the submitted email differs from what's on file, the endpoint
requires and verifies the current password before applying that one
field.** Phone, location, and notification channels save regardless —
this check is specific to email changing, not a gate on the whole form.

`CrewChangePassword` already verifies a current password server-side as
part of its own flow — reuse that exact verification logic rather than
writing a second version of the same check.

**UI:** use your judgement on whether the current-password field is
always visible or only appears once the email field has been edited
(progressive disclosure is probably cleaner on a small screen, but
either is fine) — the requirement is behavioural, not about the exact
interaction.

### Explicitly out of scope here

**Documents.** Still read-only on Profile. Uploading or managing
certifications/visas is a separate piece of work — this spec is about
contact details only, per what was actually asked for.

---

## 3. Admin: Roles, Overtime rules, Skills

The Settings icon in `RaltoDesktopApp.tsx`'s sidebar is currently a
static, unclickable element — literally nothing behind it, not a broken
link. This is where it goes.

**Scope, and only this scope:** the three Ralto-owned reference tables
that currently have no creation or editing UI anywhere — confirmed the
same way Crew's gap was confirmed last time, not assumed. This isn't
"a general settings area for anything we think of" — it's these three,
because these three are the ones with a real, checkable gap:

- **Roles** — `id, name, category`
- **Overtime rules** — `id, name, threshold_hours, multiplier`
- **Skills** — `id, name, type, expiry_tracked`

### Unlike Crew, don't assume the backend already has this

Crew CRUD turned out to be a pleasant surprise — the backend was already
fully built and just unwired. Nothing found so far suggests the same is
true here. Roles is read via `useRoles()` in a couple of places (the
Jobs creation form's dropdown) — that's a list endpoint, not evidence of
create/update/delete. Overtime rules and Skills haven't turned up
anywhere at all yet outside their table definitions. **Check the actual
current handlers before assuming any of this exists**, the same way
Crew CRUD's brief opened by checking `people.go` first rather than
guessing. This task is likely backend and frontend both, not frontend
only.

### Delete guards, consistent with the pattern already set

`DeletePerson` refuses when the person has booking history, and says so
plainly rather than erroring. The same principle applies here:

- **Roles** — referenced by `person_roles` and `job_requirements`. Block
  delete if either references it; suggest nothing's forcing removal,
  since a role that's in historical use shouldn't vanish from records
  that already point at it.
- **Overtime rules** — referenced by `people.overtime_rule_id`. Block
  delete if any person currently has it set.
- **Skills** — referenced by `person_skills`. Same principle.

Editing (renaming, adjusting a threshold) is unrestricted — it's deletion
specifically that needs the guard, same as Person.

### Screens

Three tabs or sections under Settings, one per table. Each: a list,
inline or modal create, inline or modal edit, delete with the guard
above. Nothing here needs to be more elaborate than that — this is
reference data, not an operational workflow.

---

## 4. Decided

1. Crew self-edit: email, phone, base location, notification channels.
2. Email changes require current-password confirmation; other fields
   don't.
3. Admin Settings scope is Roles, Overtime rules, Skills — nothing else
   for now.

Nothing outstanding blocks moving to a Claude Code prompt.
