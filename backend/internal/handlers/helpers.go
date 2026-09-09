package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"ralto/internal/middleware"
	"ralto/internal/notify"
	"ralto/internal/tenancy"
)

// currentOrgID is the one shared value every Create*/List*/Get*/Update*/
// Delete* query on an organisation-scoped table threads through — see
// internal/tenancy for what it stands for and docs/organisation_id_placeholder.md
// for the full reconciliation note. A short local alias so call sites read
// `currentOrgID` rather than the fully-qualified constant name at every
// one of its ~80 use sites; it's still the one shared source, not
// re-derived or re-hardcoded per handler.
const currentOrgID = tenancy.PlaceholderOrganisationID

type API struct {
	DB *pgxpool.Pool
	// Notify is nil when SENDGRID_API_KEY is unset — email notifications are
	// disabled but the rest of the app still works (matches Equiptra's
	// pattern of feature-gating on missing optional env vars rather than
	// failing to boot).
	Notify *notify.Client
}

// dbExecutor is satisfied by both *pgxpool.Pool and pgx.Tx — copied from
// Equiptra's helpers.go so handlers needing an explicit transaction (e.g. a
// booking-offer cascade that also writes a Notification row) can share query
// helpers with the non-transactional path.
type dbExecutor interface {
	Exec(ctx context.Context, sql string, arguments ...interface{}) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func readJSON(r *http.Request, v interface{}) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}

// normalizeEmail is applied on every write to users.email/people.email —
// phones auto-capitalise the first letter of an email typed into a login
// field, and without this a scheduler-created crew account and that same
// person's own case-variant of their address would silently collide at
// login (Login/CrewLogin also compare case-insensitively, so this alone
// doesn't fix lookups on already-mixed-case rows — see those handlers).
func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// staffClaimsFromContext returns the calling staff user's id, e.g. to stamp
// created_by on a new Job — a thin wrapper so handlers don't import
// middleware just for this one lookup.
func staffClaimsFromContext(r *http.Request) (string, bool) {
	claims, ok := middleware.StaffFromContext(r.Context())
	if !ok {
		return "", false
	}
	return claims.UserID, true
}
