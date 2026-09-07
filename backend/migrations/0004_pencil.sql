-- Addendum v2 §4 — Pencil as a second, orthogonal axis to the existing
-- lifecycle enums, not more statuses folded into them.
--
-- Job.commitment (pencil | firm) tracks commercial certainty; Job.status
-- keeps tracking internal progress (Draft..Complete) unchanged. A job can
-- be fully crewed and still pencilled, or firm and barely started.
--
-- Booking gains 'pencilled', ordered before 'offered': pencilled means
-- you're holding someone, offered means you've formally asked. Adding the
-- enum value alone (no use of it) is safe inside this migration's
-- transaction on Postgres 12+.

ALTER TYPE booking_status ADD VALUE 'pencilled' BEFORE 'offered';

CREATE TYPE job_commitment AS ENUM ('pencil', 'firm');

ALTER TABLE jobs ADD COLUMN commitment job_commitment NOT NULL DEFAULT 'firm';
