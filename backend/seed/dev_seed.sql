-- Ralto dev seed data.
--
-- Run once against a freshly-migrated database (apply migrations/*.sql
-- first). Not idempotent — re-running creates duplicates, since this is
-- throwaway local dev state, not a repeatable migration.
--
--   createdb ralto
--   for f in migrations/*.sql; do psql ralto -f "$f"; done
--   psql ralto -f seed/dev_seed.sql
--
-- Every row here exists to reproduce a specific edge case exercised while
-- building addendum v2 (resource calendar, pencil, prospective events,
-- already-asked) — not arbitrary sample data. Keep the comments next to
-- each insert when adding to this file; they're the reason the row
-- exists.

-- One scheduler login. Password: password123
INSERT INTO users (name, email, role, password_hash, active, must_change_password)
VALUES ('Alex Scheduler', 'alex@ralto.test', 'admin',
        '$2a$10$uvlWHwSOefWCfCs/hVQDQeCLu1WhqKESjSYqMGogcpZxJBmVlOXoi',
        true, false);

-- BBC Sport: an ordinary, non-colliding brand colour.
-- Man Utd: brand colour set to exactly match --danger (#B42318) — the
-- worst-case collision addendum v1 §3 calls out by name, and the one that
-- exposed the resource calendar's conflict-status booking rendering as a
-- flat solid fill with no badge (fixed — see bookingCellStyle's comment
-- in RaltoDesktopApp.tsx).
INSERT INTO clients (name, brand_color_hex) VALUES
  ('BBC Sport', '#FFB800'),
  ('Man Utd', '#B42318');

INSERT INTO roles (name, category) VALUES
  ('EVS', 'Technical'),
  ('Camera', 'Technical');

-- Jamie: staff, deliberately nothing attached beyond what's inserted below
-- — proves the "staff always shown, even empty" resource-calendar rule.
-- Sam: freelancer with real load — proves the "freelancer shown only if
-- booked/pencilled/available-entry" rule from the same side.
-- Riley: freelancer with nothing at all — proves a freelancer is excluded
-- by default and only appears once explicitly searched for.
INSERT INTO people (first_name, last_name, email, employment_type, status, preferred_status) VALUES
  ('Jamie', 'Rivers', 'jamie@ralto.test', 'staff', 'active', 'standard'),
  ('Sam', 'Okafor', 'sam@ralto.test', 'freelancer', 'active', 'preferred'),
  ('Riley', 'Chen', 'riley@ralto.test', 'freelancer', 'active', 'standard');

INSERT INTO person_roles (person_id, role_id, is_primary)
SELECT p.id, r.id, true
FROM people p, roles r
WHERE p.first_name IN ('Jamie', 'Sam') AND r.name = 'EVS';

-- UFC 327 — pencilled commitment, two requirements (EVS fully open, Camera
-- with one decline and one outstanding offer, for the already-asked group).
INSERT INTO jobs (name, client_id, start_date, end_date, status, commitment)
SELECT 'UFC 327', c.id, '2026-09-14', '2026-09-19', 'crewing', 'pencil'
FROM clients c WHERE c.name = 'BBC Sport';

INSERT INTO job_requirements (job_id, role_id, quantity_required, start_date, end_date)
SELECT j.id, r.id, 3, '2026-09-14', '2026-09-19'
FROM jobs j, roles r WHERE j.name = 'UFC 327' AND r.name = 'EVS';

INSERT INTO job_requirements (job_id, role_id, quantity_required, start_date, end_date)
SELECT j.id, r.id, 2, '2026-09-14', '2026-09-19'
FROM jobs j, roles r WHERE j.name = 'UFC 327' AND r.name = 'Camera';

-- Man Utd Match Day — firm/confirmed, same EVS role, same date range as
-- UFC 327's EVS requirement. Exists purely to sit a solid confirmed block
-- in Man Utd red next to a genuine conflict block on Jamie's row.
INSERT INTO jobs (name, client_id, start_date, end_date, status, commitment)
SELECT 'Man Utd Match Day', c.id, '2026-09-14', '2026-09-19', 'confirmed', 'firm'
FROM clients c WHERE c.name = 'Man Utd';

INSERT INTO job_requirements (job_id, role_id, quantity_required, start_date, end_date)
SELECT j.id, r.id, 1, '2026-09-14', '2026-09-19'
FROM jobs j, roles r WHERE j.name = 'Man Utd Match Day' AND r.name = 'EVS';

-- Sam — pencilled on UFC 327 EVS (hatched texture case).
INSERT INTO bookings (job_requirement_id, person_id, status, start_date, end_date, offered_at)
SELECT jr.id, p.id, 'pencilled', '2026-09-14', '2026-09-19', now()
FROM job_requirements jr JOIN jobs j ON j.id = jr.job_id, roles r, people p
WHERE j.name = 'UFC 327' AND jr.role_id = r.id AND r.name = 'EVS' AND p.first_name = 'Sam';

-- Sam — marked unavailable for two of those days: the booking/availability
-- overlap the resource calendar's cell-precedence rule exists to catch.
INSERT INTO availability (person_id, start_date, end_date, status)
SELECT id, '2026-09-16', '2026-09-17', 'unavailable' FROM people WHERE first_name = 'Sam';

-- Sam — offered on Camera (outstanding ask); Jamie — declined on Camera
-- (declined ask). Both surface under "already asked" while crewing EVS on
-- the same job, since that group is job-scoped, not requirement-scoped.
INSERT INTO bookings (job_requirement_id, person_id, status, start_date, end_date, offered_at)
SELECT jr.id, p.id, 'offered', '2026-09-14', '2026-09-19', now() - interval '3 hours'
FROM job_requirements jr JOIN jobs j ON j.id = jr.job_id, roles r, people p
WHERE j.name = 'UFC 327' AND jr.role_id = r.id AND r.name = 'Camera' AND p.first_name = 'Sam';

INSERT INTO bookings (job_requirement_id, person_id, status, start_date, end_date, offered_at, responded_at)
SELECT jr.id, p.id, 'declined', '2026-09-14', '2026-09-19', now() - interval '2 days', now() - interval '1 day'
FROM job_requirements jr JOIN jobs j ON j.id = jr.job_id, roles r, people p
WHERE j.name = 'UFC 327' AND jr.role_id = r.id AND r.name = 'Camera' AND p.first_name = 'Jamie';

-- Jamie — confirmed on Man Utd Match Day EVS (2026-09-14 to -16): solid
-- fill in the client's own red.
INSERT INTO bookings (job_requirement_id, person_id, status, start_date, end_date, offered_at, confirmed_at)
SELECT jr.id, p.id, 'confirmed', '2026-09-14', '2026-09-16', now(), now()
FROM job_requirements jr JOIN jobs j ON j.id = jr.job_id, people p
WHERE j.name = 'Man Utd Match Day' AND p.first_name = 'Jamie';

-- Jamie — a genuine Conflict-status booking on UFC 327 EVS immediately
-- after (2026-09-17 to -19): sits right next to the block above on the
-- same row, so a solid-red rendering would be pixel-identical to it.
INSERT INTO bookings (job_requirement_id, person_id, status, start_date, end_date, offered_at)
SELECT jr.id, p.id, 'conflict', '2026-09-17', '2026-09-19', now()
FROM job_requirements jr JOIN jobs j ON j.id = jr.job_id, roles r, people p
WHERE j.name = 'UFC 327' AND jr.role_id = r.id AND r.name = 'EVS' AND p.first_name = 'Jamie';

-- An open ProspectiveEvent for the resource-calendar band-rendering check.
INSERT INTO prospective_events (name, date_start, date_end, status)
VALUES ('Season Launch', '2026-09-22', '2026-09-24', 'open');
