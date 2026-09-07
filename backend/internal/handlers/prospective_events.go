package handlers

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"

	"ralto/internal/models"
)

// ProspectiveEvent is a date range being planned around before any Job
// exists — "FA Cup final day." It renders as a background band on the
// Calendar and resource calendar (addendum v2 §1, §3), never as a job
// itself: no requirements, no bookings, no crewing figures.

const prospectiveEventColumns = `id, name, date_start, date_end, client_id, status, converted_job_id, notes, created_at, updated_at`

func scanProspectiveEvent(row pgx.Row, e *models.ProspectiveEvent) error {
	return row.Scan(&e.ID, &e.Name, &e.DateStart, &e.DateEnd, &e.ClientID, &e.Status, &e.ConvertedJobID, &e.Notes, &e.CreatedAt, &e.UpdatedAt)
}

func (a *API) ListProspectiveEvents(w http.ResponseWriter, r *http.Request) {
	rows, err := a.DB.Query(r.Context(),
		`SELECT `+prospectiveEventColumns+` FROM prospective_events ORDER BY date_start`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list prospective events")
		return
	}
	defer rows.Close()

	events := []models.ProspectiveEvent{}
	for rows.Next() {
		var e models.ProspectiveEvent
		if err := scanProspectiveEvent(rows, &e); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to list prospective events")
			return
		}
		events = append(events, e)
	}
	writeJSON(w, http.StatusOK, events)
}

func (a *API) GetProspectiveEvent(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var e models.ProspectiveEvent
	err := scanProspectiveEvent(a.DB.QueryRow(r.Context(),
		`SELECT `+prospectiveEventColumns+` FROM prospective_events WHERE id = $1`, id), &e)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "prospective event not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get prospective event")
		return
	}
	writeJSON(w, http.StatusOK, e)
}

type prospectiveEventWriteRequest struct {
	Name      string  `json:"name"`
	DateStart string  `json:"date_start"`
	DateEnd   string  `json:"date_end"`
	ClientID  *string `json:"client_id"`
	Notes     *string `json:"notes"`
}

func (a *API) CreateProspectiveEvent(w http.ResponseWriter, r *http.Request) {
	var req prospectiveEventWriteRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	var e models.ProspectiveEvent
	err := scanProspectiveEvent(a.DB.QueryRow(r.Context(),
		`INSERT INTO prospective_events (name, date_start, date_end, client_id, notes)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING `+prospectiveEventColumns,
		req.Name, req.DateStart, req.DateEnd, req.ClientID, req.Notes,
	), &e)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to create prospective event")
		return
	}
	writeJSON(w, http.StatusCreated, e)
}

// UpdateProspectiveEvent edits the planning fields only — status moves
// through Convert/Drop below, never through a raw status field here, so
// the converted_job_id / status pairing can't drift apart.
func (a *API) UpdateProspectiveEvent(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req prospectiveEventWriteRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	var e models.ProspectiveEvent
	err := scanProspectiveEvent(a.DB.QueryRow(r.Context(),
		`UPDATE prospective_events SET name = $1, date_start = $2, date_end = $3, client_id = $4, notes = $5, updated_at = now()
		 WHERE id = $6
		 RETURNING `+prospectiveEventColumns,
		req.Name, req.DateStart, req.DateEnd, req.ClientID, req.Notes, id,
	), &e)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "prospective event not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to update prospective event")
		return
	}
	writeJSON(w, http.StatusOK, e)
}

func (a *API) DeleteProspectiveEvent(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	tag, err := a.DB.Exec(r.Context(), `DELETE FROM prospective_events WHERE id = $1`, id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to delete prospective event")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "prospective event not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

type convertProspectiveEventRequest struct {
	JobID string `json:"job_id"`
}

// ConvertProspectiveEvent links an already-created Job back to the event
// it grew out of. It does not create the Job itself — that stays the
// normal CreateJob flow — this just records the graduation so the band
// resolves to the real job instead of being deleted.
func (a *API) ConvertProspectiveEvent(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req convertProspectiveEventRequest
	if err := readJSON(r, &req); err != nil || req.JobID == "" {
		writeError(w, http.StatusBadRequest, "job_id is required")
		return
	}
	var e models.ProspectiveEvent
	err := scanProspectiveEvent(a.DB.QueryRow(r.Context(),
		`UPDATE prospective_events SET status = 'converted', converted_job_id = $1, updated_at = now()
		 WHERE id = $2
		 RETURNING `+prospectiveEventColumns,
		req.JobID, id,
	), &e)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "prospective event not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to convert prospective event — check job_id is valid")
		return
	}
	writeJSON(w, http.StatusOK, e)
}

// DropProspectiveEvent marks an event as never happening. Kept, not
// deleted — a fixture that didn't land this season will likely come
// round again next year.
func (a *API) DropProspectiveEvent(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var e models.ProspectiveEvent
	err := scanProspectiveEvent(a.DB.QueryRow(r.Context(),
		`UPDATE prospective_events SET status = 'dropped', updated_at = now()
		 WHERE id = $1
		 RETURNING `+prospectiveEventColumns,
		id,
	), &e)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "prospective event not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to drop prospective event")
		return
	}
	writeJSON(w, http.StatusOK, e)
}
