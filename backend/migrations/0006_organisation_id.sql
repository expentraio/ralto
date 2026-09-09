-- Add organisation_id to every domain table, ahead of Core (the shared
-- Simplified Suite identity/tenancy layer — see simplified_suite_core_v0_5.md)
-- existing as a real service. Core owns the Organisation entity, so this
-- can't be a real foreign key yet — there's no local table for it to
-- reference. It's a bare UUID column instead, backfilled with one
-- placeholder value standing in for "the one organisation that currently
-- exists" (Simplified Suite / Expentra itself).
--
-- PLACEHOLDER ORGANISATION ID: fa065f2f-25d2-4d9a-9383-3fb1ca506a0a
--
-- This value is also the sole source of truth at the application layer —
-- see backend/internal/tenancy/tenancy.go's PlaceholderOrganisationID
-- const, which every Create/List/Get/Update/Delete handler references
-- directly rather than each hand-deriving or hardcoding it. See
-- docs/organisation_id_placeholder.md for the fuller reconciliation note.
--
-- Standard live-migration-safe pattern per table: add nullable, backfill,
-- then set NOT NULL — never a bare "ADD COLUMN ... NOT NULL" against a
-- table that already has rows.
--
-- Scope (21 of the 23 domain tables — see docs/organisation_id_placeholder.md
-- for the full table-by-table reasoning, including the two exclusions):
--   users, clients, venues, projects, jobs, roles, job_requirements, people,
--   overtime_rules, skills, bookings, timesheets, availability,
--   availability_requests, notifications, operational_alerts,
--   prospective_events, person_roles, person_skills, person_documents,
--   booking_shifts
--
-- Deliberately excluded — reachable only via an already-scoped parent ID,
-- confirmed by checking every read/write path, not just the table shape:
--   job_contacts, notification_deliveries
--
-- Excluded as tooling, not tenant data: schema_migrations (not touched here).

ALTER TABLE users ADD COLUMN organisation_id UUID;
ALTER TABLE clients ADD COLUMN organisation_id UUID;
ALTER TABLE venues ADD COLUMN organisation_id UUID;
ALTER TABLE projects ADD COLUMN organisation_id UUID;
ALTER TABLE jobs ADD COLUMN organisation_id UUID;
ALTER TABLE roles ADD COLUMN organisation_id UUID;
ALTER TABLE job_requirements ADD COLUMN organisation_id UUID;
ALTER TABLE people ADD COLUMN organisation_id UUID;
ALTER TABLE overtime_rules ADD COLUMN organisation_id UUID;
ALTER TABLE skills ADD COLUMN organisation_id UUID;
ALTER TABLE bookings ADD COLUMN organisation_id UUID;
ALTER TABLE timesheets ADD COLUMN organisation_id UUID;
ALTER TABLE availability ADD COLUMN organisation_id UUID;
ALTER TABLE availability_requests ADD COLUMN organisation_id UUID;
ALTER TABLE notifications ADD COLUMN organisation_id UUID;
ALTER TABLE operational_alerts ADD COLUMN organisation_id UUID;
ALTER TABLE prospective_events ADD COLUMN organisation_id UUID;
ALTER TABLE person_roles ADD COLUMN organisation_id UUID;
ALTER TABLE person_skills ADD COLUMN organisation_id UUID;
ALTER TABLE person_documents ADD COLUMN organisation_id UUID;
ALTER TABLE booking_shifts ADD COLUMN organisation_id UUID;

UPDATE users SET organisation_id = 'fa065f2f-25d2-4d9a-9383-3fb1ca506a0a';
UPDATE clients SET organisation_id = 'fa065f2f-25d2-4d9a-9383-3fb1ca506a0a';
UPDATE venues SET organisation_id = 'fa065f2f-25d2-4d9a-9383-3fb1ca506a0a';
UPDATE projects SET organisation_id = 'fa065f2f-25d2-4d9a-9383-3fb1ca506a0a';
UPDATE jobs SET organisation_id = 'fa065f2f-25d2-4d9a-9383-3fb1ca506a0a';
UPDATE roles SET organisation_id = 'fa065f2f-25d2-4d9a-9383-3fb1ca506a0a';
UPDATE job_requirements SET organisation_id = 'fa065f2f-25d2-4d9a-9383-3fb1ca506a0a';
UPDATE people SET organisation_id = 'fa065f2f-25d2-4d9a-9383-3fb1ca506a0a';
UPDATE overtime_rules SET organisation_id = 'fa065f2f-25d2-4d9a-9383-3fb1ca506a0a';
UPDATE skills SET organisation_id = 'fa065f2f-25d2-4d9a-9383-3fb1ca506a0a';
UPDATE bookings SET organisation_id = 'fa065f2f-25d2-4d9a-9383-3fb1ca506a0a';
UPDATE timesheets SET organisation_id = 'fa065f2f-25d2-4d9a-9383-3fb1ca506a0a';
UPDATE availability SET organisation_id = 'fa065f2f-25d2-4d9a-9383-3fb1ca506a0a';
UPDATE availability_requests SET organisation_id = 'fa065f2f-25d2-4d9a-9383-3fb1ca506a0a';
UPDATE notifications SET organisation_id = 'fa065f2f-25d2-4d9a-9383-3fb1ca506a0a';
UPDATE operational_alerts SET organisation_id = 'fa065f2f-25d2-4d9a-9383-3fb1ca506a0a';
UPDATE prospective_events SET organisation_id = 'fa065f2f-25d2-4d9a-9383-3fb1ca506a0a';
UPDATE person_roles SET organisation_id = 'fa065f2f-25d2-4d9a-9383-3fb1ca506a0a';
UPDATE person_skills SET organisation_id = 'fa065f2f-25d2-4d9a-9383-3fb1ca506a0a';
UPDATE person_documents SET organisation_id = 'fa065f2f-25d2-4d9a-9383-3fb1ca506a0a';
UPDATE booking_shifts SET organisation_id = 'fa065f2f-25d2-4d9a-9383-3fb1ca506a0a';

ALTER TABLE users ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE clients ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE venues ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE projects ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE jobs ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE roles ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE job_requirements ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE people ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE overtime_rules ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE skills ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE bookings ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE timesheets ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE availability ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE availability_requests ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE operational_alerts ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE prospective_events ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE person_roles ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE person_skills ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE person_documents ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE booking_shifts ALTER COLUMN organisation_id SET NOT NULL;
