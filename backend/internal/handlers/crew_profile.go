package handlers

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"

	"ralto/internal/middleware"
	"ralto/internal/models"
)

// updateMyProfileRequest is deliberately narrow — a crew member can edit
// their own contact details and notification preferences, not their rate,
// employment type, or preferred_status (those are scheduler-owned fields).
type updateMyProfileRequest struct {
	Phone                *string `json:"phone"`
	BaseLocation         *string `json:"base_location"`
	PhoneNumber          *string `json:"phone_number"`
	NotificationChannels *string `json:"notification_channels"`
}

func (a *API) UpdateMyProfile(w http.ResponseWriter, r *http.Request) {
	claims, _ := middleware.CrewFromContext(r.Context())
	var req updateMyProfileRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	var p models.Person
	err := scanPerson(a.DB.QueryRow(r.Context(),
		`UPDATE people SET phone = $1, base_location = $2, phone_number = $3, notification_channels = $4, updated_at = now()
		 WHERE id = $5 AND organisation_id = $6
		 RETURNING `+personSelectColumns,
		req.Phone, req.BaseLocation, req.PhoneNumber, req.NotificationChannels, claims.PersonID, currentOrgID,
	), &p)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "person not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to update profile")
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (a *API) ListMyDocuments(w http.ResponseWriter, r *http.Request) {
	claims, _ := middleware.CrewFromContext(r.Context())
	rows, err := a.DB.Query(r.Context(),
		`SELECT id, person_id, type, file_ref, expiry_date, uploaded_at FROM person_documents WHERE person_id = $1 AND organisation_id = $2 ORDER BY uploaded_at DESC`,
		claims.PersonID, currentOrgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list documents")
		return
	}
	defer rows.Close()

	docs := []models.PersonDocument{}
	for rows.Next() {
		var d models.PersonDocument
		if err := rows.Scan(&d.ID, &d.PersonID, &d.Type, &d.FileRef, &d.ExpiryDate, &d.UploadedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to list documents")
			return
		}
		docs = append(docs, d)
	}
	writeJSON(w, http.StatusOK, docs)
}

// SubmitTimesheet creates the Timesheet row for a Complete-stage booking —
// the crew member reports actuals; ApproveTimesheet (staff-side) is what
// computes calculated_cost, not this handler.
type submitTimesheetRequest struct {
	ActualStart  string `json:"actual_start"`
	ActualEnd    string `json:"actual_end"`
	BreakMinutes int    `json:"break_minutes"`
}

func (a *API) SubmitTimesheet(w http.ResponseWriter, r *http.Request) {
	claims, _ := middleware.CrewFromContext(r.Context())
	bookingID := chi.URLParam(r, "id")

	var owns bool
	if err := a.DB.QueryRow(r.Context(), `SELECT EXISTS (SELECT 1 FROM bookings WHERE id = $1 AND person_id = $2 AND organisation_id = $3)`, bookingID, claims.PersonID, currentOrgID).Scan(&owns); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to submit timesheet")
		return
	}
	if !owns {
		writeError(w, http.StatusNotFound, "booking not found")
		return
	}

	var req submitTimesheetRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var t models.Timesheet
	err := a.DB.QueryRow(r.Context(),
		`INSERT INTO timesheets (booking_id, scheduled_start, scheduled_end, actual_start, actual_end, break_minutes, status, submitted_at, organisation_id)
		 SELECT b.id, (b.start_date || ' ' || COALESCE(b.call_time, '00:00'))::timestamptz,
		        (b.end_date || ' ' || COALESCE(b.call_time, '00:00'))::timestamptz,
		        $2::timestamptz, $3::timestamptz, $4, 'submitted', now(), $5
		 FROM bookings b WHERE b.id = $1 AND b.organisation_id = $5
		 RETURNING id, booking_id, scheduled_start, scheduled_end, actual_start, actual_end, break_minutes,
		           status, submitted_at, approved_by, approved_at, calculated_cost`,
		bookingID, req.ActualStart, req.ActualEnd, req.BreakMinutes, currentOrgID,
	).Scan(&t.ID, &t.BookingID, &t.ScheduledStart, &t.ScheduledEnd, &t.ActualStart, &t.ActualEnd,
		&t.BreakMinutes, &t.Status, &t.SubmittedAt, &t.ApprovedBy, &t.ApprovedAt, &t.CalculatedCost)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to submit timesheet")
		return
	}
	writeJSON(w, http.StatusCreated, t)
}
