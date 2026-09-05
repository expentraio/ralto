package handlers

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"

	"ralto/internal/models"
)

// operationalAlertResponse joins in the job name so the Today screen's
// "Needs attention" list doesn't need a second round-trip per alert.
type operationalAlertResponse struct {
	models.OperationalAlert
	JobName string `json:"job_name"`
}

// ListAlerts backs the Today screen's "Needs attention" section. Open by
// default; ?status=resolved for history.
func (a *API) ListAlerts(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	if status == "" {
		status = string(models.AlertStatusOpen)
	}
	rows, err := a.DB.Query(r.Context(), `
		SELECT oa.id, oa.job_id, oa.type, oa.related_entity_id, oa.status, oa.created_at, oa.resolved_at, j.name
		FROM operational_alerts oa
		JOIN jobs j ON j.id = oa.job_id
		WHERE oa.status::text = $1
		ORDER BY oa.created_at DESC`, status)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list alerts")
		return
	}
	defer rows.Close()

	alerts := []operationalAlertResponse{}
	for rows.Next() {
		var al operationalAlertResponse
		if err := rows.Scan(&al.ID, &al.JobID, &al.Type, &al.RelatedEntityID, &al.Status, &al.CreatedAt, &al.ResolvedAt, &al.JobName); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to list alerts")
			return
		}
		alerts = append(alerts, al)
	}
	writeJSON(w, http.StatusOK, alerts)
}

func (a *API) ResolveAlert(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var al models.OperationalAlert
	err := a.DB.QueryRow(r.Context(),
		`UPDATE operational_alerts SET status = 'resolved', resolved_at = now() WHERE id = $1
		 RETURNING id, job_id, type, related_entity_id, status, created_at, resolved_at`,
		id,
	).Scan(&al.ID, &al.JobID, &al.Type, &al.RelatedEntityID, &al.Status, &al.CreatedAt, &al.ResolvedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "alert not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to resolve alert")
		return
	}
	writeJSON(w, http.StatusOK, al)
}
