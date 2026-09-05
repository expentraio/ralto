package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"ralto/internal/middleware"
	"ralto/internal/notify"
)

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
