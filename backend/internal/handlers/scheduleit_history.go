package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"ralto/internal/models"
)

// ListScheduleItHistoryForPerson is read-only — scheduleit_history is only
// ever written to by the one-shot import script (files/scheduleit_import.py),
// never through the API. "Was this person on site that day" lookups only.
func (a *API) ListScheduleItHistoryForPerson(w http.ResponseWriter, r *http.Request) {
	personID := chi.URLParam(r, "id")
	rows, err := a.DB.Query(r.Context(),
		`SELECT id, person_id, scheduleit_person_name, scheduleit_event_id, title, client_name, date_start, date_end, notes, created_at
		 FROM scheduleit_history WHERE person_id = $1 AND organisation_id = $2 ORDER BY date_start DESC`,
		personID, currentOrgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list scheduleit history")
		return
	}
	defer rows.Close()

	entries := []models.ScheduleItHistory{}
	for rows.Next() {
		var h models.ScheduleItHistory
		if err := rows.Scan(&h.ID, &h.PersonID, &h.ScheduleItPersonName, &h.ScheduleItEventID, &h.Title, &h.ClientName, &h.DateStart, &h.DateEnd, &h.Notes, &h.CreatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to list scheduleit history")
			return
		}
		entries = append(entries, h)
	}
	writeJSON(w, http.StatusOK, entries)
}
