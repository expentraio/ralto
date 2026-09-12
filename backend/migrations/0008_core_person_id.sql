-- Stage 2 SSO handoff (simplified_suite_screens_v0_3.md §5 step 4): Ralto
-- looks up its local record "for that core_person_id" — a real link column,
-- not implicit email matching. Bare UUID, no FK: Core lives in a separate
-- database, so this follows the same "not a real FK" convention already
-- established for organisation_id (see docs/organisation_id_placeholder.md).
-- Nullable because every existing users row predates Core and has no Core
-- identity yet — BridgeCoreSession backfills it on each row's first
-- successful Core-authenticated login, matching by email for that one-time
-- link and by this column thereafter.

ALTER TABLE users ADD COLUMN core_person_id UUID;
CREATE UNIQUE INDEX idx_users_core_person_id ON users(core_person_id) WHERE core_person_id IS NOT NULL;
