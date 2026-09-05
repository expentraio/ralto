-- Ralto schema v1 — Client/Venue/Project/Job/JobRequirement, Person/crew,
-- Booking/BookingShift/Timesheet, Availability, Notification, alerts.
-- UUID PKs throughout (gen_random_uuid(), via pgcrypto) — matches
-- ralto-data-model-v0_1.md's own convention, not Equiptra's BIGSERIAL.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums

CREATE TYPE user_role AS ENUM ('admin', 'scheduler');
CREATE TYPE job_status AS ENUM ('draft', 'defining', 'crewing', 'confirmed', 'briefed', 'live', 'complete', 'cancelled');
CREATE TYPE employment_type AS ENUM ('staff', 'freelancer');
CREATE TYPE person_status AS ENUM ('active', 'inactive');
CREATE TYPE preferred_status AS ENUM ('preferred', 'approved', 'standard', 'restricted');
CREATE TYPE skill_type AS ENUM ('skill', 'certification', 'visa', 'credential');
CREATE TYPE person_skill_status AS ENUM ('valid', 'expiring', 'expired');
CREATE TYPE person_document_type AS ENUM ('certification', 'visa', 'production_credential');
CREATE TYPE booking_status AS ENUM ('offered', 'confirmed', 'declined', 'cancelled', 'unavailable', 'conflict', 'complete');
CREATE TYPE timesheet_status AS ENUM ('submitted', 'approved', 'rejected');
CREATE TYPE availability_status AS ENUM ('available', 'unavailable', 'tentative', 'booked');
CREATE TYPE availability_request_status AS ENUM ('pending', 'responded');
CREATE TYPE availability_response AS ENUM ('yes', 'partially', 'no');
CREATE TYPE notification_type AS ENUM ('booking_offered', 'booking_confirmed', 'booking_updated', 'booking_cancelled', 'shift_reminder', 'availability_request');
CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'whatsapp');
CREATE TYPE notification_delivery_status AS ENUM ('pending', 'sent', 'delivered', 'failed');
CREATE TYPE alert_type AS ENUM ('missing_crew', 'late_confirmation', 'call_time_change', 'conflict', 'unacknowledged_update', 'no_show', 'auto_suggested_booking');
CREATE TYPE alert_status AS ENUM ('open', 'resolved');

-- Staff (scheduler/admin persona)

CREATE TABLE users (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  TEXT NOT NULL,
    email                 TEXT NOT NULL UNIQUE,
    role                  user_role NOT NULL DEFAULT 'scheduler',
    password_hash         TEXT NOT NULL,
    active                BOOLEAN NOT NULL DEFAULT TRUE,
    must_change_password  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Client (+ core-linking columns: brand_color_hex, website — inert until
-- suite-core exists, per simplified_software_core_v0_1.md)

CREATE TABLE clients (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT NOT NULL,
    contact_name      TEXT,
    contact_email     TEXT,
    contact_phone     TEXT,
    notes             TEXT,
    brand_color_hex   TEXT,
    website           TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE venues (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    address     TEXT,
    city        TEXT,
    country     TEXT,
    timezone    TEXT NOT NULL DEFAULT 'UTC',
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project — Ralto's own grouping of Jobs (a multi-day tournament, a season
-- of fixtures). Distinct from the future suite-core Project that
-- shared_project_id will eventually reference — see ralto_schema_addendum_v1.md §1.
CREATE TABLE projects (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    client_id           UUID REFERENCES clients(id),
    date_start          DATE,
    date_end            DATE,
    shared_project_id   UUID, -- inert nullable core-link; no suite-core service exists yet
    color_hex           TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE jobs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    client_id           UUID NOT NULL REFERENCES clients(id),
    project_reference   TEXT,
    venue_id            UUID REFERENCES venues(id),
    project_id          UUID REFERENCES projects(id) ON DELETE SET NULL,
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    status              job_status NOT NULL DEFAULT 'draft',
    color_hex           TEXT,
    notes               TEXT,
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_start_date ON jobs (start_date);
CREATE INDEX idx_jobs_client_id ON jobs (client_id);

CREATE TABLE job_contacts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    role_title  TEXT,
    email       TEXT,
    phone       TEXT
);

-- Role — master list; both Person capabilities and Job requirements
-- reference this same table, which is what makes crew matching work.
CREATE TABLE roles (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name      TEXT NOT NULL UNIQUE,
    category  TEXT
);

CREATE TABLE job_requirements (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id             UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    role_id            UUID NOT NULL REFERENCES roles(id),
    quantity_required  INTEGER NOT NULL,
    start_date         DATE NOT NULL,
    end_date           DATE NOT NULL,
    call_time          TIME,
    notes              TEXT
);

CREATE INDEX idx_job_requirements_job_id ON job_requirements (job_id);

-- Person (crew persona) — carries its own login columns directly (a crew
-- member IS a Person, no separate identity to reconcile) plus the
-- core-linking columns (calendar_feed_token, phone_number,
-- notification_channels) added now as inert nullable fields.
CREATE TABLE people (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name             TEXT NOT NULL,
    last_name              TEXT NOT NULL,
    email                  TEXT NOT NULL UNIQUE,
    phone                  TEXT,
    base_location          TEXT,
    employment_type        employment_type NOT NULL DEFAULT 'freelancer',
    status                 person_status NOT NULL DEFAULT 'active',
    preferred_status       preferred_status NOT NULL DEFAULT 'standard',
    standard_rate          NUMERIC(10,2),
    rate_currency          TEXT,
    overtime_rule_id       UUID,
    notes                  TEXT,
    calendar_feed_token    TEXT UNIQUE,
    phone_number           TEXT,
    notification_channels  TEXT, -- JSON, e.g. {"email":true,"whatsapp":false}
    password_hash          TEXT, -- null until invited to the crew app
    active                 BOOLEAN NOT NULL DEFAULT TRUE,
    must_change_password   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_people_email ON people (email);

CREATE TABLE overtime_rules (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT NOT NULL,
    threshold_hours  NUMERIC(5,2) NOT NULL,
    multiplier       NUMERIC(4,2) NOT NULL
);

ALTER TABLE people ADD CONSTRAINT fk_people_overtime_rule FOREIGN KEY (overtime_rule_id) REFERENCES overtime_rules(id);

CREATE TABLE person_roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id   UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    role_id     UUID NOT NULL REFERENCES roles(id),
    is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (person_id, role_id)
);

CREATE INDEX idx_person_roles_role_id ON person_roles (role_id);

-- Skill / Certification (master list) — distinct from Role: a Role is
-- "what job you do", a Skill is "a qualification you hold."
CREATE TABLE skills (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    type            skill_type NOT NULL,
    expiry_tracked  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE person_documents (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id     UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    type          person_document_type NOT NULL,
    file_ref      TEXT NOT NULL,
    expiry_date   DATE,
    uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE person_skills (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id     UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    skill_id      UUID NOT NULL REFERENCES skills(id),
    issued_date   DATE,
    expiry_date   DATE,
    document_id   UUID REFERENCES person_documents(id)
);

-- Booking — the join between a JobRequirement and a Person, carrying its
-- own lifecycle independent of both.
CREATE TABLE bookings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_requirement_id  UUID NOT NULL REFERENCES job_requirements(id) ON DELETE CASCADE,
    person_id           UUID NOT NULL REFERENCES people(id),
    status              booking_status NOT NULL DEFAULT 'offered',
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    call_time           TIME,
    rate_override       NUMERIC(10,2),
    offered_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at        TIMESTAMPTZ,
    confirmed_at        TIMESTAMPTZ,
    notes               TEXT
);

CREATE INDEX idx_bookings_job_requirement_id ON bookings (job_requirement_id);
CREATE INDEX idx_bookings_person_id ON bookings (person_id);
CREATE INDEX idx_bookings_person_dates ON bookings (person_id, start_date, end_date);

-- BookingShift — handles a single Booking having a different call time on
-- different days. Every date in a Booking's range should have exactly one
-- row if shifts are used at all (an application-level invariant, not
-- enforced here — see ralto-data-model-v0_1.md §4.2).
CREATE TABLE booking_shifts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    call_time   TIME NOT NULL,
    -- Not in ralto-data-model-v0_1.md §4.2, which only specifies call_time —
    -- added because the already-built, locked ical_feed.py needs a DTEND
    -- per shift and has no other source for one. Venue is deliberately not
    -- duplicated here: the sidecar reads it from the parent Job/Venue via
    -- the booking, same as every other display field.
    end_time    TIME NOT NULL,
    notes       TEXT,
    UNIQUE (booking_id, date)
);

CREATE TABLE timesheets (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id        UUID NOT NULL REFERENCES bookings(id),
    scheduled_start   TIMESTAMPTZ NOT NULL,
    scheduled_end     TIMESTAMPTZ NOT NULL,
    actual_start      TIMESTAMPTZ,
    actual_end        TIMESTAMPTZ,
    break_minutes     INTEGER NOT NULL DEFAULT 0,
    status            timesheet_status NOT NULL DEFAULT 'submitted',
    submitted_at      TIMESTAMPTZ,
    approved_by       UUID REFERENCES users(id),
    approved_at       TIMESTAMPTZ,
    calculated_cost   NUMERIC(10,2)
);

CREATE TABLE availability (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id   UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    status      availability_status NOT NULL,
    notes       TEXT
);

CREATE INDEX idx_availability_person_dates ON availability (person_id, start_date, end_date);

CREATE TABLE availability_requests (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id             UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    job_id                UUID REFERENCES jobs(id),
    start_date            DATE NOT NULL,
    end_date              DATE NOT NULL,
    message               TEXT,
    status                availability_request_status NOT NULL DEFAULT 'pending',
    response              availability_response,
    responded_at          TIMESTAMPTZ,
    suggested_booking_id  UUID REFERENCES bookings(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notification / NotificationDelivery — channel-agnostic by design (email
-- ships in v1, WhatsApp later is additive). See ralto_schema_addendum_v1.md §4.
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id   UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    type        notification_type NOT NULL,
    payload     TEXT NOT NULL, -- JSON: job name, times, venue, etc.
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification_deliveries (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id  UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    channel          notification_channel NOT NULL,
    status           notification_delivery_status NOT NULL DEFAULT 'pending',
    sent_at          TIMESTAMPTZ
);

-- OperationalAlert — backs the Today screen's "Needs attention" section.
CREATE TABLE operational_alerts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id              UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    type                alert_type NOT NULL,
    related_entity_id   UUID,
    status              alert_status NOT NULL DEFAULT 'open',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at         TIMESTAMPTZ
);

CREATE INDEX idx_operational_alerts_open ON operational_alerts (job_id) WHERE status = 'open';

-- Auto-stamp responded_at when an AvailabilityRequest flips to 'responded' —
-- mirrors Equiptra's own set_service_record_resolved_date trigger exactly
-- (a derived timestamp the DB owns, not something application code has to
-- remember to set on every write path that changes status).
CREATE OR REPLACE FUNCTION set_availability_request_responded_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'responded' AND OLD.status IS DISTINCT FROM 'responded' THEN
        NEW.responded_at := now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_availability_request_responded_at
BEFORE UPDATE ON availability_requests
FOR EACH ROW
EXECUTE FUNCTION set_availability_request_responded_at();
