-- ScheduleIt history archive — "was this person on site that day" lookups
-- for crew imported from the old ScheduleIt account before it expires.
-- Deliberately standalone: no FK to jobs, no relationship to live crewing
-- logic, never written to outside the one-shot import script. person_id is
-- nullable — a raw ScheduleIt name that didn't match anyone in `people`
-- still gets archived, just without a link back to a real Person.

CREATE TABLE scheduleit_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL,
    person_id UUID REFERENCES people(id),
    scheduleit_person_name TEXT NOT NULL,
    scheduleit_event_id TEXT NOT NULL,
    title TEXT NOT NULL,
    client_name TEXT,
    date_start DATE NOT NULL,
    date_end DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (scheduleit_event_id, scheduleit_person_name)
);

CREATE INDEX idx_scheduleit_history_person ON scheduleit_history(person_id);

-- Deny-all by default: RLS on, no policies, for the anon/authenticated
-- Supabase roles. The Go backend connects directly as the table owner and
-- bypasses RLS regardless, so this costs it nothing — every other table
-- in the database is already locked down this way; a new table shipping
-- without this line is the gap, not the norm. Standing convention: every
-- migration that CREATE TABLEs also ENABLE ROW LEVEL SECURITYs it, in the
-- same file.
ALTER TABLE scheduleit_history ENABLE ROW LEVEL SECURITY;
