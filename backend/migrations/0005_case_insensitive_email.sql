-- Case-insensitive email uniqueness for users and people. The existing
-- UNIQUE(email) constraint on each table would happily accept
-- 'becca@x.com' and 'Becca@x.com' as two separate rows — worse than the
-- login failure that surfaced this, since it's silent data corruption
-- rather than an error. App-level writes now normalize to lowercase
-- (see internal/handlers/helpers.go's normalizeEmail) so this index
-- should never actually reject a real write going forward; it exists as
-- the DB-level backstop for any write path that doesn't go through that
-- normalization, the same reasoning as the RLS convention below.
--
-- A plain UNIQUE(lower(email)) index, not a citext column type change:
-- no new extension, no change to how every other query against these
-- columns behaves — the application is what's responsible for keeping
-- the stored value lowercase; this index just refuses to let that
-- invariant be violated.

CREATE UNIQUE INDEX idx_users_email_lower ON users (lower(email));
CREATE UNIQUE INDEX idx_people_email_lower ON people (lower(email));
