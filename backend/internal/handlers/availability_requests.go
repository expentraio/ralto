package handlers

import (
	"net/http"

	"ralto/internal/models"
	"ralto/internal/notify"
)

func (a *API) ListAvailabilityRequests(w http.ResponseWriter, r *http.Request) {
	rows, err := a.DB.Query(r.Context(),
		`SELECT id, person_id, job_id, start_date, end_date, message, status, response, responded_at,
		        suggested_booking_id, created_at
		 FROM availability_requests ORDER BY created_at DESC`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list availability requests")
		return
	}
	defer rows.Close()

	out := []models.AvailabilityRequest{}
	for rows.Next() {
		var ar models.AvailabilityRequest
		if err := rows.Scan(&ar.ID, &ar.PersonID, &ar.JobID, &ar.StartDate, &ar.EndDate, &ar.Message, &ar.Status,
			&ar.Response, &ar.RespondedAt, &ar.SuggestedBookingID, &ar.CreatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to list availability requests")
			return
		}
		out = append(out, ar)
	}
	writeJSON(w, http.StatusOK, out)
}

type createAvailabilityRequestRequest struct {
	PersonID  string  `json:"person_id"`
	JobID     *string `json:"job_id"`
	StartDate string  `json:"start_date"`
	EndDate   string  `json:"end_date"`
	Message   *string `json:"message"`
	Location  string  `json:"location"` // display-only, for the notification copy — not stored as its own column
}

func (a *API) CreateAvailabilityRequest(w http.ResponseWriter, r *http.Request) {
	var req createAvailabilityRequestRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	var ar models.AvailabilityRequest
	err := a.DB.QueryRow(r.Context(),
		`INSERT INTO availability_requests (person_id, job_id, start_date, end_date, message, status)
		 VALUES ($1, $2, $3, $4, $5, 'pending')
		 RETURNING id, person_id, job_id, start_date, end_date, message, status, response, responded_at, suggested_booking_id, created_at`,
		req.PersonID, req.JobID, req.StartDate, req.EndDate, req.Message,
	).Scan(&ar.ID, &ar.PersonID, &ar.JobID, &ar.StartDate, &ar.EndDate, &ar.Message, &ar.Status,
		&ar.Response, &ar.RespondedAt, &ar.SuggestedBookingID, &ar.CreatedAt)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to create availability request")
		return
	}

	dates := req.StartDate + " – " + req.EndDate
	subject, body := notify.RenderAvailabilityRequest(dates, req.Location, crewCTAURL("/availability/"+ar.ID))
	_ = a.notifyPerson(r.Context(), ar.PersonID, models.NotificationTypeAvailabilityRequest,
		map[string]string{"start": req.StartDate, "end": req.EndDate, "location": req.Location}, subject, body)

	writeJSON(w, http.StatusCreated, ar)
}
