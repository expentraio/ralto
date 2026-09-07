-- Addendum v2 §2 — Availability type (annual leave, sick, TOIL, other),
-- distinguishing leave from ordinary unavailability. No request/approval
-- flow, no crew-facing leave UI: scheduler logs it directly on the
-- existing Unavailable row. Meaningful only when status = 'unavailable';
-- the CHECK keeps that invariant enforced at the DB, not just in app code.

CREATE TYPE availability_type AS ENUM ('annual_leave', 'sick', 'toil', 'other');

ALTER TABLE availability
    ADD COLUMN type availability_type,
    ADD CONSTRAINT availability_type_only_when_unavailable
        CHECK (type IS NULL OR status = 'unavailable');
