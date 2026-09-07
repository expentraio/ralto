-- Addendum v2 §3 — ProspectiveEvent: dates planned around before any Job
-- exists (e.g. "FA Cup final day"). Deliberately not a Job with
-- status = 'draft' — it has no requirements/crewing and shouldn't appear
-- in job lists. Converting to a real Job links via converted_job_id rather
-- than deleting the row, so the planning history (including drops) survives.

CREATE TYPE prospective_event_status AS ENUM ('open', 'converted', 'dropped');

CREATE TABLE prospective_events (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT NOT NULL,
    date_start        DATE NOT NULL,
    date_end          DATE NOT NULL,
    client_id         UUID REFERENCES clients(id),
    status            prospective_event_status NOT NULL DEFAULT 'open',
    converted_job_id  UUID REFERENCES jobs(id),
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospective_events_date_start ON prospective_events (date_start);

-- Deny-all by default: RLS on, no policies, for the anon/authenticated
-- Supabase roles. The Go backend connects directly as the table owner and
-- bypasses RLS regardless, so this costs it nothing — every other table
-- in the database is already locked down this way; a new table shipping
-- without this line is the gap, not the norm. Standing convention: every
-- migration that CREATE TABLEs also ENABLE ROW LEVEL SECURITYs it, in the
-- same file.
ALTER TABLE prospective_events ENABLE ROW LEVEL SECURITY;
